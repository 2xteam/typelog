import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { notFound, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getAttemptModel } from "@/models/Attempt";
import { canStart } from "@/lib/schedule";
import { ageLabel } from "@/lib/ageRange";
import { flattenItems } from "@/lib/scoring";
import type { Item } from "@/lib/quizTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/shared/[token] — 공유 링크가 가리키는 결과의 **맛보기**.
 *
 * 남의 결과를 통째로 펼쳐 주지 않는다. 타입 이름·이모지·한 줄만 준다 —
 * 링크를 받은 사람이 볼 것은 자기 결과이고, 이건 "나도 해보고 싶다"를
 * 만드는 자리다.
 *
 * 로그인 없이 열린다. 그래서 **응시자를 알 수 있는 것은 아무것도 담지 않는다.**
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) return notFound("없는 링크예요.");

    await connectDB();
    const attempt = await getAttemptModel()
      .findOne({ "share.token": token, "share.isPublic": true, status: "completed" })
      .select({ quizId: 1, result: 1 })
      .lean();
    if (!attempt) return notFound("없는 링크예요.");

    const quiz = await getQuizModel().findById(attempt.quizId).lean();
    if (!quiz) return notFound("질문지가 사라졌어요.");

    const type = attempt.result?.code
      ? await getResultTypeModel()
          .findOne({ quizId: attempt.quizId, code: attempt.result.code })
          .select({ code: 1, name: 1, subtitle: 1, emoji: 1 })
          .lean()
      : null;

    /** 링크를 받았어도 일정은 그대로 적용된다 — 닫힌 질문지를 열어 줄 수는 없다 */
    const check = canStart(quiz.schedule);
    const open = quiz.status === "published" && check.ok;

    return NextResponse.json({
      ok: true,
      quiz: {
        slug: quiz.slug,
        title: quiz.title,
        tagline: quiz.tagline,
        emoji: quiz.cover?.emoji ?? null,
        itemCount: flattenItems((quiz.items ?? []) as Item[]).filter((i) => i.type !== "display")
          .length,
        estimatedMinutes: quiz.estimatedMinutes ?? null,
        ageLabel: ageLabel(quiz.ageRange),
        disclaimer: quiz.disclaimer ?? null,
      },
      open,
      notice: check.ok ? null : check.reason === "before_start" ? check.notice : "지금은 할 수 없어요.",
      friend: type
        ? { name: type.name, subtitle: type.subtitle ?? null, emoji: type.emoji }
        : null,
    });
  } catch (err) {
    return serverError(err);
  }
}
