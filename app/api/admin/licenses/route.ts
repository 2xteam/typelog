import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { portalPhoto } from "@/lib/portalStorage";
import { connectDB } from "@/lib/db";
import { badRequest, requireAdmin, serverError } from "@/lib/auth";
import { maskEmail, maskPhone } from "@/lib/mask";
import { formatPrime, type RecordDetail } from "@/lib/record";
import { getAttemptModel } from "@/models/Attempt";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getUserModel } from "@/models/User";
import { ATHLETE_LEVEL, certGrade, DIST_CODE, distLabel, modifierMark, pctText } from "@/components/run/view";
import { DEFAULT_HOLO, HOLO_LABEL, isHolo } from "@/components/run/holo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/licenses — 러닝 자격증을 받은 사람들(사용자 2026-11-17).
 *
 *   ?who=all|member|guest   회원 · 비회원
 *   ?kind=all|athlete|cert  선수자격증(신문 이상) · 러닝자격증
 *   ?page=1                 30건씩, 최근 완주 순
 *
 * 자격증 한 장에 들어가는 글자(발급처 · 급수 · 기록 · 번호)를 여기서 만들어 내려 준다 —
 * 포털은 그리기만 한다. 사진은 결과 링크를 만들 때 올린 자격증 사진(R2)만 있다.
 * 기기 안에만 있는 사진은 서버에 없다. 회원 연락처는 가려서.
 *
 * POST { deleteIds: string[] } — 골라서 지우기(테스트 기록 정리, 사용자 2026-11-17).
 *   러닝 자격증 기록만, 한 번에 100건까지. 올라가 있던 자격증 사진(R2)도 포털을 거쳐 지운다.
 *   되돌릴 수 없다 — 확인은 포털 화면(확인 창)이 받는다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md 「admin 자격증 목록」
 */

const SIZE = 30;
const SITE = "https://typelog.myjane.co.kr";

/** 날짜는 한국 시각으로 — 서버 시간대(UTC)에 휘둘리지 않게 */
function kst(d: Date) {
  const k = new Date(d.getTime() + 9 * 3600e3);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    y: k.getUTCFullYear(),
    dot: `${k.getUTCFullYear()}.${p(k.getUTCMonth() + 1)}.${p(k.getUTCDate())}`,
    mmdd: `${p(k.getUTCMonth() + 1)}${p(k.getUTCDate())}`,
    time: `${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`,
  };
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    const url = new URL(req.url);
    const who = url.searchParams.get("who") ?? "all";
    const kind = url.searchParams.get("kind") ?? "all";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

    await connectDB();
    const quiz = await getQuizModel().findOne({ slug: "running-record" }).select({ _id: 1 }).lean();
    if (!quiz) return NextResponse.json({ ok: true, total: 0, counts: {}, items: [], page, pages: 0 });

    const base: Record<string, unknown> = { quizId: quiz._id, status: "completed", "result.detail": { $ne: null } };
    const match: Record<string, unknown> = { ...base };
    if (who === "member") match["owner.kind"] = "user";
    if (who === "guest") match["owner.kind"] = "guest";
    if (kind === "cert") match["result.code"] = { $regex: "^cert-" };
    if (kind === "athlete") match["result.code"] = { $in: Object.keys(ATHLETE_LEVEL) };

    const Attempt = getAttemptModel();
    const [total, countRows, docs, types] = await Promise.all([
      Attempt.countDocuments(match),
      // 위쪽 요약 — 필터와 무관하게 전체에서 결과별 · 회원/비회원
      Attempt.aggregate<{ _id: { code: string; owner: string }; n: number }>([
        { $match: base },
        { $group: { _id: { code: "$result.code", owner: "$owner.kind" }, n: { $sum: 1 } } },
      ]),
      Attempt.find(match)
        .sort({ completedAt: -1 })
        .skip((page - 1) * SIZE)
        .limit(SIZE)
        .select({ owner: 1, attemptNo: 1, answers: 1, result: 1, completedAt: 1, custom: 1, share: 1, via: 1, conversion: 1 })
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
      const d = a.result!.detail as unknown as RecordDetail;
      const code = a.result!.code as string;
      const athlete = !code.startsWith("cert");
      const ans = (id: string) => (a.answers ?? []).find((x) => x.linkId === id)?.value as string | null | undefined;
      const custom = (a.custom ?? {}) as { issuer?: string | null; photoUrl?: string | null; holo?: string | null };
      const u = a.owner.kind === "user" ? userById.get(String(a.owner.userId)) : undefined;
      const done = new Date(a.completedAt ?? Date.now());
      const t = kst(done);
      const serialNo = String(parseInt(String(a._id).slice(-6), 16) % 1000).padStart(3, "0");
      const brand = custom.issuer?.trim() || "마이재인";
      const holo = isHolo(custom.holo) ? custom.holo : DEFAULT_HOLO;
      return {
        id: String(a._id),
        completedAt: done.toISOString(),
        owner: a.owner.kind === "user" ? "member" : "guest",
        member: u
          ? { nickname: u.nickname ?? null, email: maskEmail(u.email), phone: maskPhone(u.phone) }
          : null,
        name: ans("runner")?.trim() || u?.nickname?.trim() || "러너",
        result: { code, name: typeByCode.get(code)?.name ?? code, emoji: typeByCode.get(code)?.emoji ?? "" },
        license: {
          athlete,
          title: `${brand} ${athlete ? "선수자격증" : "러닝자격증"}`,
          en: athlete ? "ATHLETE LICENSE" : "RUNNING LICENSE",
          no: `${athlete ? "A.T.H" : "R.U.N"} ${DIST_CODE[d.distance] ?? ""} ${t.y} ${t.mmdd}${serialNo}`,
          grade: athlete
            ? `${distLabel(d)} 선수 ${ATHLETE_LEVEL[code] ?? ""}`
            : `${distLabel(d)} ${certGrade(code)}급 ${modifierMark(d)}`.trim(),
          record: formatPrime(d.seconds),
          pace: `1km당 ${formatPrime(d.paceSec)} · 시속 ${d.kmh}km`,
          date: t.dot,
          issuer: brand,
          holo: HOLO_LABEL[holo],
        },
        gender: d.gender,
        percentile: pctText(d),
        race: ans("race")?.trim() || null,
        photoUrl: custom.photoUrl ?? null,
        link: a.share?.isPublic && a.share.token ? `${SITE}/r/${a.share.token}` : null,
        views: a.share?.viewCount ?? 0,
        viaLink: !!a.via,
        conversion: (a.conversion as { kind?: string } | undefined)?.kind ?? null,
      };
    });

    const counts: Record<string, { name: string; emoji: string; member: number; guest: number }> = {};
    for (const r of countRows) {
      const c = (counts[r._id.code] ??= {
        name: typeByCode.get(r._id.code)?.name ?? r._id.code,
        emoji: typeByCode.get(r._id.code)?.emoji ?? "",
        member: 0,
        guest: 0,
      });
      if (r._id.owner === "user") c.member += r.n;
      else c.guest += r.n;
    }

    return NextResponse.json({ ok: true, total, page, pages: Math.ceil(total / SIZE), size: SIZE, counts, items });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    const body = (await req.json().catch(() => ({}))) as { deleteIds?: unknown };
    const ids = Array.isArray(body.deleteIds) ? body.deleteIds.filter((x): x is string => typeof x === "string") : [];
    if (!ids.length) return badRequest("지울 자격증을 골라 주세요.");
    if (ids.length > 100) return badRequest("한 번에 100장까지 지울 수 있어요.");
    if (!ids.every((id) => mongoose.Types.ObjectId.isValid(id))) return badRequest("잘못된 기록 번호가 있어요.");

    await connectDB();
    const quiz = await getQuizModel().findOne({ slug: "running-record" }).select({ _id: 1 }).lean();
    if (!quiz) return badRequest("러닝 자격증 질문지가 없어요.");

    const Attempt = getAttemptModel();
    // 러닝 자격증 기록만 — 다른 질문지 기록은 이 길로 지우지 않는다
    const match = { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }, quizId: quiz._id };
    const targets = await Attempt.find(match).select({ custom: 1 }).lean();
    const keys = targets
      .map((a) => (a.custom as { photoKey?: string | null } | undefined)?.photoKey)
      .filter((k): k is string => !!k);

    const r = await Attempt.deleteMany(match);

    // 사진은 기록을 지운 뒤에 — 사진 지우기가 실패해도 기록은 지워진 상태로 남는다(사진 주소는 추측하기 어렵다)
    let photosDeleted = 0;
    for (const k of keys) {
      try {
        await portalPhoto("DELETE", k);
        photosDeleted += 1;
      } catch {
        /* 남은 사진은 R2 에서 손으로 정리 */
      }
    }

    return NextResponse.json({ ok: true, deleted: r.deletedCount, photos: keys.length, photosDeleted });
  } catch (err) {
    return serverError(err);
  }
}
