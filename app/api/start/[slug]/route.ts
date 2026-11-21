import { NextResponse } from "next/server";
import { experienceOf } from "@/lib/experience";
import { connectDB } from "@/lib/db";
import { notFound, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { canStart } from "@/lib/schedule";
import { ageLabel } from "@/lib/ageRange";
import { flattenItems } from "@/lib/scoring";
import type { Item } from "@/lib/quizTypes";
import { guestAlreadyPlayed, pastRecord } from "@/lib/participation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/start/[slug]?guestKey= — 홍보 시작 화면(/start/[slug])의 재료(사용자 2026-11-21).
 * 누구의 결과도 아닌 질문지 자체의 인트로 — 공유 링크(/r/[token]) 없이 인스타 프로필 링크로 바로 들어와 설문으로 간다.
 * 노트 화면 질문지면 인트로에 펼칠 예시 카드 재료(축 · 유형 이름 몇 개)도 준다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await connectDB();
    const quiz = await getQuizModel().findOne({ slug }).lean();
    if (!quiz || (quiz.status !== "published" && process.env.NODE_ENV !== "development")) return notFound("없는 질문지예요.");

    const check = canStart(quiz.schedule);
    const experience = experienceOf(quiz);
    let note: Record<string, unknown> | null = null;
    if (experience === "note") {
      const types = await getResultTypeModel().find({ quizId: quiz._id }).select({ code: 1, name: 1 }).lean();
      note = {
        axes: (quiz.outcomes ?? [])
          .filter((o) => o.left?.code && o.right?.code)
          .map((o) => ({ id: o.id, label: o.label ?? o.id, left: o.left, right: o.right })),
        types: types.map((t) => ({ code: t.code, name: t.name })),
      };
    }
    return NextResponse.json({
      ok: true,
      quiz: {
        slug: quiz.slug,
        title: quiz.title,
        tagline: quiz.tagline,
        emoji: quiz.cover?.emoji ?? null,
        itemCount: flattenItems((quiz.items ?? []) as Item[]).filter((i) => i.type !== "display").length,
        estimatedMinutes: quiz.estimatedMinutes ?? null,
        ageLabel: ageLabel(quiz.ageRange),
        disclaimer: quiz.disclaimer ?? null,
        experience,
        typeCount: note ? (note.types as unknown[]).length : null,
      },
      open: quiz.status === "published" && check.ok,
      notice: check.ok ? null : check.reason === "before_start" ? check.notice : "지금은 할 수 없어요.",
      guestUsed: await guestAlreadyPlayed(req, quiz._id),
      past: await pastRecord(req, quiz._id),
      note,
    });
  } catch (err) {
    return serverError(err);
  }
}
