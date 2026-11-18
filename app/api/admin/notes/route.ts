import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { badRequest, requireAdmin, serverError } from "@/lib/auth";
import { maskEmail, maskPhone } from "@/lib/mask";
import { getAttemptModel } from "@/models/Attempt";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getUserModel } from "@/models/User";
import { AXIS_EN, cardTheme, meshCss, pickAxes, ROAST, roastLevel, type AxisDecl } from "@/components/note/palette";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/notes — 러닝 노트 카드를 받은 사람들(사용자 2026-11-18).
 *
 *   ?slug=runner-16type   질문지(기본: 러닝 노트 화면을 쓰는 첫 질문지)
 *   ?who=all|member|guest
 *   ?code=CLAR            유형 하나만
 *   ?page=1               30건씩, 최근 순
 *
 * 카드 한 장에 들어가는 것(아이덴티티 컬러 4색 · 글자색 · 메시 · 표)을 여기서 만들어 내려 준다 —
 * 포털은 그리기만 한다. 색 계산은 결과 화면과 같은 `components/note/palette.ts`.
 *
 * POST { deleteIds } — 골라서 지우기(테스트 기록 정리). 그 질문지 기록만, 100건까지. 되돌릴 수 없다.
 * → my-obsidian-vault / 50-Plans/K 러닝 노트.md
 */

const SIZE = 30;
const SITE = "https://typelog.myjane.co.kr";

async function findQuiz(slug: string | null) {
  const Quiz = getQuizModel();
  const q = slug ? await Quiz.findOne({ slug }).lean() : await Quiz.findOne({ experience: "note" }).lean();
  return q ?? (slug ? null : await Quiz.findOne({ slug: "runner-16type" }).lean());
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    const url = new URL(req.url);
    const who = url.searchParams.get("who") ?? "all";
    const code = url.searchParams.get("code");
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

    await connectDB();
    const quiz = await findQuiz(url.searchParams.get("slug"));
    if (!quiz) return NextResponse.json({ ok: true, total: 0, counts: {}, items: [], page, pages: 0 });

    const axes: AxisDecl[] = (quiz.outcomes ?? [])
      .filter((o) => o.left?.code && o.right?.code)
      .map((o) => ({ id: o.id, label: o.label ?? o.id, left: o.left, right: o.right }));

    const base: Record<string, unknown> = { quizId: quiz._id, status: "completed" };
    const match: Record<string, unknown> = { ...base };
    if (who === "member") match["owner.kind"] = "user";
    if (who === "guest") match["owner.kind"] = "guest";
    if (code && /^[A-Z]{4}$/.test(code)) match["result.code"] = code;

    const Attempt = getAttemptModel();
    const [total, countRows, docs, types] = await Promise.all([
      Attempt.countDocuments(match),
      Attempt.aggregate<{ _id: { code: string; owner: string }; n: number }>([
        { $match: base },
        { $group: { _id: { code: "$result.code", owner: "$owner.kind" }, n: { $sum: 1 } } },
      ]),
      Attempt.find(match)
        .sort({ completedAt: -1 })
        .skip((page - 1) * SIZE)
        .limit(SIZE)
        .select({ owner: 1, attemptNo: 1, result: 1, completedAt: 1, custom: 1, share: 1, via: 1, conversion: 1 })
        .lean(),
      getResultTypeModel().find({ quizId: quiz._id }).select({ code: 1, name: 1, emoji: 1 }).lean(),
    ]);

    const userIds = [...new Set(docs.filter((a) => a.owner.kind === "user" && a.owner.userId).map((a) => String(a.owner.userId)))];
    const users = userIds.length
      ? await getUserModel().find({ _id: { $in: userIds } }).select({ nickname: 1, email: 1, phone: 1 }).lean()
      : [];
    const userById = new Map(users.map((u) => [String(u._id), u as { nickname?: string | null; email?: string | null; phone?: string | null }]));
    const typeByCode = new Map(types.map((t) => [t.code, t]));

    const items = docs.map((a) => {
      const id = String(a._id);
      const c = a.result?.code ?? "";
      const pomp = Object.fromEntries((a.result?.outcomes ?? []).map((o) => [o.id, o.pomp]));
      const picks = pickAxes(axes, pomp, id);
      const theme = cardTheme(picks.map((p) => p.color.hex));
      const mesh = meshCss(picks, id);
      const u = a.owner.kind === "user" ? userById.get(String(a.owner.userId)) : undefined;
      const custom = (a.custom ?? {}) as { name?: string | null };
      return {
        id,
        completedAt: new Date(a.completedAt ?? Date.now()).toISOString(),
        attemptNo: a.attemptNo ?? 1,
        owner: a.owner.kind === "user" ? "member" : "guest",
        member: u ? { nickname: u.nickname ?? null, email: maskEmail(u.email), phone: maskPhone(u.phone) } : null,
        runner: custom.name?.trim() || u?.nickname?.trim() || "러너",
        result: { code: c, name: typeByCode.get(c)?.name ?? c, emoji: typeByCode.get(c)?.emoji ?? "" },
        card: {
          ink: theme.ink,
          scrim: theme.scrim,
          contrast: theme.worst,
          back: theme.back,
          meshImage: mesh.image,
          meshBase: mesh.base,
          roast: ROAST[roastLevel(picks)],
          axes: picks.map((p) => ({
            axis: AXIS_EN[p.id] ?? p.id,
            pole: p.pole,
            pct: p.pct,
            strength: p.strong ? "진하게" : "은은하게",
            color: p.color,
          })),
        },
        link: a.share?.isPublic && a.share.token ? `${SITE}/r/${a.share.token}` : null,
        views: a.share?.viewCount ?? 0,
        viaLink: !!a.via,
        conversion: (a.conversion as { kind?: string } | undefined)?.kind ?? null,
      };
    });

    const counts: Record<string, { name: string; emoji: string; member: number; guest: number }> = {};
    for (const r of countRows) {
      if (!r._id.code) continue;
      const row = (counts[r._id.code] ??= {
        name: typeByCode.get(r._id.code)?.name ?? r._id.code,
        emoji: typeByCode.get(r._id.code)?.emoji ?? "",
        member: 0,
        guest: 0,
      });
      if (r._id.owner === "user") row.member += r.n;
      else row.guest += r.n;
    }

    return NextResponse.json({
      ok: true,
      quiz: { slug: quiz.slug, title: quiz.title, experience: quiz.experience ?? null },
      total,
      page,
      pages: Math.ceil(total / SIZE),
      size: SIZE,
      counts,
      items,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    const body = (await req.json().catch(() => ({}))) as { deleteIds?: unknown; slug?: unknown };
    const ids = Array.isArray(body.deleteIds) ? body.deleteIds.filter((x): x is string => typeof x === "string") : [];
    if (!ids.length) return badRequest("지울 카드를 골라 주세요.");
    if (ids.length > 100) return badRequest("한 번에 100장까지 지울 수 있어요.");
    if (!ids.every((id) => mongoose.Types.ObjectId.isValid(id))) return badRequest("잘못된 기록 번호가 있어요.");

    await connectDB();
    const quiz = await findQuiz(typeof body.slug === "string" ? body.slug : null);
    if (!quiz) return badRequest("러닝 노트 질문지가 없어요.");

    // 그 질문지 기록만 — 다른 질문지 기록은 이 길로 지우지 않는다
    const r = await getAttemptModel().deleteMany({
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      quizId: quiz._id,
    });
    return NextResponse.json({ ok: true, deleted: r.deletedCount });
  } catch (err) {
    return serverError(err);
  }
}
