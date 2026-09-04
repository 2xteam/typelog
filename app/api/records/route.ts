import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireViewer, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getAttemptModel } from "@/models/Attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/records — 질문지별 요약과 도감.
 *
 * 도감에는 **회차마다 나온 타입을 전부** 모은다. 최신 것만 두면 도감이 비어
 * 보이고 다시 하기의 보상이 사라진다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */
export async function GET(req: Request) {
  try {
    const guard = await requireViewer(req);
    if ("error" in guard) return guard.error;
    const userId = guard.viewer.userId;

    await connectDB();
    const Attempt = getAttemptModel();
    const ResultType = getResultTypeModel();

    /** 내가 응시한 질문지만 본다 — 해본 적 없는 질문지는 기록 화면에 둘 이유가 없다 */
    const mine = await Attempt.find({ "owner.userId": userId, status: "completed" })
      .select({ quizId: 1, quizSlug: 1, attemptNo: 1, completedAt: 1, result: 1 })
      .sort({ completedAt: -1 })
      .lean();

    if (!mine.length) return NextResponse.json({ ok: true, records: [] });

    const quizIds = [...new Set(mine.map((a) => String(a.quizId)))];
    const quizzes = await getQuizModel()
      .find({ _id: { $in: quizIds } })
      .select({ slug: 1, title: 1, cover: 1, order: 1 })
      .lean();
    const types = await ResultType.find({ quizId: { $in: quizIds } })
      .select({ quizId: 1, code: 1, name: 1, emoji: 1, rarity: 1 })
      .lean();

    const records = quizzes
      .map((q) => {
        const id = String(q._id);
        const rows = mine.filter((a) => String(a.quizId) === id);
        const all = types.filter((t) => String(t.quizId) === id);
        const got = new Set(rows.map((a) => a.result?.code).filter(Boolean) as string[]);
        const byCode = new Map(all.map((t) => [t.code, t]));
        const latest = rows[0];
        const latestType = latest?.result?.code ? byCode.get(latest.result.code) : null;
        return {
          slug: q.slug,
          title: q.title,
          emoji: q.cover?.emoji ?? null,
          order: q.order ?? 100,
          attemptCount: rows.length,
          latest: latest
            ? {
                attemptId: String(latest._id),
                attemptNo: latest.attemptNo,
                completedAt: latest.completedAt ? latest.completedAt.toISOString() : null,
                code: latest.result?.code ?? null,
                name: latestType?.name ?? null,
                emoji: latestType?.emoji ?? null,
              }
            : null,
          /** 도감 — 안 나온 것도 자리를 남긴다. 실루엣으로 그린다 */
          collection: all
            .map((t) => ({
              code: t.code,
              name: t.name,
              emoji: t.emoji,
              found: got.has(t.code),
            }))
            .sort((a, b) => a.code.localeCompare(b.code)),
          foundCount: got.size,
          totalCount: all.length,
        };
      })
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({ ok: true, records });
  } catch (err) {
    return serverError(err);
  }
}
