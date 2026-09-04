import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { notFound, requireViewer, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getAttemptModel } from "@/models/Attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 회차 목록은 최근 20건 + 더 보기 → my-obsidian-vault / 10-Projects/TypeLog.md */
const PAGE = 20;

/**
 * GET /api/records/[slug]?skip= — 그 질문지의 회차 목록.
 *
 * 오래된 순으로 회차 번호가 붙어 있으니 **최신순**으로 준다. 각 회차에
 * "지난번과 같은지"를 함께 계산해 내려보낸다 — 화면이 수치가 아니라
 * **타입이 바뀌었는지**로 변화를 말하기 때문이다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const guard = await requireViewer(req);
    if ("error" in guard) return guard.error;
    const userId = guard.viewer.userId;

    const { slug } = await params;
    const skip = Math.max(0, Number(new URL(req.url).searchParams.get("skip") ?? 0) || 0);

    await connectDB();
    const quiz = await getQuizModel()
      .findOne({ slug })
      .select({ slug: 1, title: 1, cover: 1 })
      .lean();
    if (!quiz) return notFound("없는 질문지예요.");

    const Attempt = getAttemptModel();
    const filter = { "owner.userId": userId, quizId: quiz._id, status: "completed" as const };

    const total = await Attempt.countDocuments(filter);
    /**
     * 한 건 더 가져온다. 목록은 최신순이라 각 회차의 "이전 회차"가 바로 다음
     * 항목인데, 페이지 경계에서는 그게 다음 페이지에 있다 — 안 가져오면
     * 경계의 한 줄만 비교가 빠진다.
     */
    const rows = await Attempt.find(filter)
      .select({ attemptNo: 1, completedAt: 1, durationSec: 1, result: 1, quizRevision: 1 })
      .sort({ attemptNo: -1 })
      .skip(skip)
      .limit(PAGE + 1)
      .lean();

    const codes = [...new Set(rows.map((a) => a.result?.code).filter(Boolean) as string[])];
    const types = await getResultTypeModel()
      .find({ quizId: quiz._id, code: { $in: codes } })
      .select({ code: 1, name: 1, emoji: 1, color: 1 })
      .lean();
    const byCode = new Map(types.map((t) => [t.code, t]));

    const page = rows.slice(0, PAGE).map((a, i) => {
      const code = a.result?.code ?? null;
      const t = code ? byCode.get(code) : null;
      const prev = rows[i + 1]?.result?.code ?? null;
      return {
        attemptId: String(a._id),
        attemptNo: a.attemptNo,
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
        durationSec: a.durationSec ?? null,
        code,
        name: t?.name ?? null,
        emoji: t?.emoji ?? null,
        color: t?.color ?? null,
        /** null 이면 첫 회차라 비교할 것이 없다 */
        changed: prev === null ? null : prev !== code,
        prevCode: prev,
      };
    });

    return NextResponse.json({
      ok: true,
      quiz: { slug: quiz.slug, title: quiz.title, emoji: quiz.cover?.emoji ?? null },
      total,
      skip,
      pageSize: PAGE,
      hasMore: skip + PAGE < total,
      attempts: page,
    });
  } catch (err) {
    return serverError(err);
  }
}
