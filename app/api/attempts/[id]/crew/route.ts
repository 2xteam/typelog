import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { forbidden, getViewer, notFound, serverError } from "@/lib/auth";
import { getAttemptModel, type AttemptDoc } from "@/models/Attempt";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/attempts/[id]/crew?guestKey= — 내 크루(사용자 2026-11-21).
 * 이 결과의 공유 링크(/r/<token>)로 들어와 끝낸 사람들의 카드. **공유한 본인만** 본다(회원 세션 · 비회원 guestKey).
 * 크루의 이름은 그 사람이 카드에 직접 적은 이름만 — 닉네임 · 연락처는 보내지 않는다(없으면 「크루 N」).
 * 카드에 적힌 것까지만(유형 · 축 · 강점 두 줄 · 잘 맞는 블렌드 코드). 요약 같은 긴 문장은 보내지 않는다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound("없는 기록이에요.");
    const guestKey = new URL(req.url).searchParams.get("guestKey");
    await connectDB();
    const Attempt = getAttemptModel();
    const me = (await Attempt.findById(id).lean()) as AttemptDoc | null;
    if (!me || me.status !== "completed") return notFound("없는 기록이에요.");
    const viewer = await getViewer(req);
    const mine = me.owner.kind === "user" ? !!viewer && viewer.userId === me.owner.userId : !!guestKey && guestKey === me.owner.guestKey;
    if (!mine) return forbidden("내 크루는 링크를 공유한 본인만 볼 수 있어요.");

    const quiz = await getQuizModel().findById(me.quizId).lean();
    if (!quiz) return notFound("질문지가 사라졌어요.");
    const axes = (quiz.outcomes ?? [])
      .filter((o) => o.left?.code && o.right?.code)
      .map((o) => ({ id: o.id, label: o.label ?? o.id, left: o.left, right: o.right }));

    const rows = await Attempt.find({ "via.sharerAttemptId": String(me._id), status: "completed" })
      .select({ result: 1, completedAt: 1, attemptNo: 1, custom: 1 })
      .sort({ completedAt: 1 })
      .limit(200)
      .lean();
    // 유형 전부 — 크루에 없는 타입 목록(사용자 2026-11-21)에도 쓴다
    const types = await getResultTypeModel().find({ quizId: me.quizId }).select({ code: 1, name: 1, emoji: 1, content: 1 }).lean();
    const typeOf = (c?: string | null) => types.find((t) => t.code === c);
    const cardOf = (a: { _id: unknown; result?: AttemptDoc["result"]; completedAt?: Date | null; attemptNo?: number; custom?: unknown }, name: string) => {
      const t = typeOf(a.result?.code);
      const content = (t?.content ?? {}) as { strengths?: string[]; goodWith?: string[] };
      return {
        attemptId: String(a._id),
        attemptNo: a.attemptNo ?? 1,
        code: a.result?.code ?? "",
        typeName: t?.name ?? a.result?.code ?? "",
        emoji: t?.emoji ?? null,
        completedAt: a.completedAt ?? null,
        runner: name,
        pomp: Object.fromEntries((a.result?.outcomes ?? []).map((o) => [o.id, o.pomp])),
        strengths: (content.strengths ?? []).slice(0, 2),
        goodWith: (content.goodWith ?? []).slice(0, 2),
      };
    };
    const myName = (me.custom as { name?: string | null } | undefined)?.name?.trim() || null;
    const token = me.share?.isPublic ? me.share.token : null;
    return NextResponse.json({
      ok: true,
      quiz: { slug: quiz.slug, title: quiz.title },
      axes,
      me: cardOf(me, myName ?? "나"),
      shareUrl: token ? `${SITE_URL}/r/${token}` : null,
      views: me.share?.viewCount ?? 0,
      allTypes: types.map((t) => {
        const c = (t.content ?? {}) as { strengths?: string[]; goodWith?: string[] };
        return { code: t.code, name: t.name, emoji: t.emoji ?? null, strengths: (c.strengths ?? []).slice(0, 2), goodWith: (c.goodWith ?? []).slice(0, 2) };
      }),
      crewName: (me.custom as { crewName?: string | null } | undefined)?.crewName ?? null,
      crew: rows.map((r, i) => cardOf(r, (r.custom as { name?: string | null } | undefined)?.name?.trim() || `크루 ${i + 1}`)),
    });
  } catch (err) {
    return serverError(err);
  }
}
