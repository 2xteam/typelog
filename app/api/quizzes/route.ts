import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { isComingSoon } from "@/lib/schedule";
import { ageLabel } from "@/lib/ageRange";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/quizzes — 목록.
 *
 * `draft` 는 내보내지 않는다. 공개된 것만 주고, 아직 안 열린 것은
 * `comingSoon: true` 로 표시해 화면이 탭을 나눌 수 있게 한다 —
 * **막는 판정은 시작하는 순간 한 곳**(`/api/attempts`)에서 한다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */
export async function GET() {
  try {
    await connectDB();
    const rows = await getQuizModel()
      .find({ status: "published" })
      .select({
        slug: 1, title: 1, tagline: 1, category: 1, cover: 1, ageRange: 1,
        disclaimer: 1, estimatedMinutes: 1, items: 1, schedule: 1, order: 1,
      })
      .sort({ order: 1, title: 1 })
      .lean();

    const now = new Date();
    const quizzes = rows.map((q) => ({
      slug: q.slug,
      title: q.title,
      tagline: q.tagline,
      category: q.category,
      emoji: q.cover?.emoji ?? null,
      /** 화면이 문자열을 만들지 않는다 — 형식을 한 곳에 둔다 → lib/ageRange.ts */
      ageRange: { min: q.ageRange?.min ?? null, max: q.ageRange?.max ?? null },
      ageLabel: ageLabel(q.ageRange),
      disclaimer: q.disclaimer ?? null,
      itemCount: Array.isArray(q.items) ? q.items.length : 0,
      estimatedMinutes: q.estimatedMinutes ?? null,
      comingSoon: isComingSoon(q.schedule, now),
      startAt: q.schedule?.startAt ? new Date(q.schedule.startAt).toISOString() : null,
      openingNoticeText: q.schedule?.openingNoticeText ?? null,
    }));

    return NextResponse.json({ ok: true, quizzes });
  } catch (err) {
    return serverError(err);
  }
}
