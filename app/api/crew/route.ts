import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { badRequest, getViewer, notFound, serverError, unauthorized } from "@/lib/auth";
import { getAttemptModel } from "@/models/Attempt";
import { getQuizModel } from "@/models/Quiz";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/crew?slug= — 회원의 「내 공유 링크」 목록(사용자 2026-11-21). 링크를 잊지 않게 모은 카드 화면에서 보여 준다.
 * 공유 링크를 만든 내 결과마다 링크 · 연 횟수 · 그 링크로 끝낸 크루 수. 크루가 많은 순.
 */
export async function GET(req: Request) {
  try {
    const viewer = await getViewer(req);
    if (!viewer) return unauthorized("로그인이 필요해요.");
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return badRequest("질문지를 알려 주세요.");
    await connectDB();
    const quiz = await getQuizModel().findOne({ slug }).select({ _id: 1 }).lean();
    if (!quiz) return notFound("없는 질문지예요.");
    const Attempt = getAttemptModel();
    const mine = await Attempt.find({ "owner.userId": viewer.userId, quizId: quiz._id, status: "completed", "share.isPublic": true })
      .select({ attemptNo: 1, result: 1, share: 1, completedAt: 1 })
      .lean();
    const counts = await Attempt.aggregate<{ _id: string; n: number }>([
      { $match: { "via.sharerAttemptId": { $in: mine.map((m) => String(m._id)) }, status: "completed" } },
      { $group: { _id: "$via.sharerAttemptId", n: { $sum: 1 } } },
    ]);
    const links = mine
      .map((m) => ({
        attemptId: String(m._id),
        attemptNo: m.attemptNo ?? 1,
        code: m.result?.code ?? "",
        shareUrl: `${SITE_URL}/r/${m.share?.token}`,
        views: m.share?.viewCount ?? 0,
        crew: counts.find((c) => c._id === String(m._id))?.n ?? 0,
      }))
      .sort((a, b) => b.crew - a.crew || b.attemptNo - a.attemptNo);
    return NextResponse.json({ ok: true, links });
  } catch (err) {
    return serverError(err);
  }
}
