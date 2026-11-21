import { NextResponse } from "next/server";
import { experienceOf } from "@/lib/experience";
import { connectDB } from "@/lib/db";
import { getViewer, notFound, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getAttemptModel } from "@/models/Attempt";
import { getUserModel } from "@/models/User";
import { canStart } from "@/lib/schedule";
import { ageLabel } from "@/lib/ageRange";
import { flattenItems } from "@/lib/scoring";
import type { Item } from "@/lib/quizTypes";
import { guestAlreadyPlayed, pastRecord } from "@/lib/participation";

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
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) return notFound("없는 링크예요.");

    await connectDB();
    const attempt = await getAttemptModel()
      .findOne({ "share.token": token, "share.isPublic": true, status: "completed" })
      .select({ quizId: 1, result: 1, answers: 1, owner: 1, attemptNo: 1, completedAt: 1, custom: 1 })
      .lean();
    if (!attempt) return notFound("없는 링크예요.");
    // 링크를 연 횟수 — 공유 성과(admin). 기다리지 않는다
    void getAttemptModel().updateOne({ _id: attempt._id }, { $inc: { "share.viewCount": 1 } }).exec();

    const quiz = await getQuizModel().findById(attempt.quizId).lean();
    if (!quiz) return notFound("질문지가 사라졌어요.");

    const type = attempt.result?.code
      ? await getResultTypeModel()
          .findOne({ quizId: attempt.quizId, code: attempt.result.code })
          .select({ code: 1, name: 1, subtitle: 1, emoji: 1, content: 1 })
          .lean()
      : null;

    /** 링크를 받았어도 일정은 그대로 적용된다 — 닫힌 질문지를 열어 줄 수는 없다 */
    const check = canStart(quiz.schedule);
    const open = quiz.status === "published" && check.ok;

    /**
     * 러닝 기록 — 결과 링크로는 **자격증만** 보여 준다(사용자 2026-11-14).
     * 신문 · 딱지는 본인 화면에서만 보고 이미지로 직접 나눈다. 신문 이상이면 선수자격증.
     * 사진은 본인 기기에만 있으므로 여기엔 없다(실루엣).
     */
    let run: Record<string, unknown> | null = null;
    if (experienceOf(quiz) === "running" && attempt.result?.detail) {
      const ans = (id: string) => (attempt.answers ?? []).find((a) => a.linkId === id)?.value as string | null | undefined;
      let name = ans("runner") ?? null;
      if (!name && attempt.owner?.kind === "user" && attempt.owner.userId) {
        const u = await getUserModel().findById(attempt.owner.userId).select({ nickname: 1 }).lean();
        name = (u as { nickname?: string | null } | null)?.nickname?.trim() || null;
      }
      run = {
        attemptId: String(attempt._id),
        attemptNo: attempt.attemptNo ?? 1,
        code: attempt.result.code,
        detail: attempt.result.detail,
        completedAt: attempt.completedAt ?? null,
        name: name || "러너",
        issuer: (attempt.custom as { issuer?: string | null } | undefined)?.issuer ?? null,
        photoUrl: (attempt.custom as { photoUrl?: string | null } | undefined)?.photoUrl ?? null,
        holo: (attempt.custom as { holo?: string | null } | undefined)?.holo ?? null,
      };
    }

    /**
     * 러닝 노트 — 공유한 사람의 카드 한 장을 그대로 보여 준다(사용자 2026-11-18).
     * 카드에 적힌 것까지만 — 유형 이름 · 축(색을 정하는 pomp) · 강점 두 줄 · 잘 맞는 블렌드 코드.
     * 요약 · 팁 같은 긴 문장은 보내지 않는다. 나도 해 보게 만드는 자리다.
     */
    let note: Record<string, unknown> | null = null;
    if (experienceOf(quiz) === "note" && attempt.result?.code) {
      let runner = (attempt.custom as { name?: string | null } | undefined)?.name?.trim() || null;
      if (!runner && attempt.owner?.kind === "user" && attempt.owner.userId) {
        const u = await getUserModel().findById(attempt.owner.userId).select({ nickname: 1 }).lean();
        runner = (u as { nickname?: string | null } | null)?.nickname?.trim() || null;
      }
      const content = (type?.content ?? {}) as { strengths?: string[]; goodWith?: string[] };
      note = {
        attemptId: String(attempt._id),
        attemptNo: attempt.attemptNo ?? 1,
        code: attempt.result.code,
        completedAt: attempt.completedAt ?? null,
        runner: runner || "러너",
        typeName: type?.name ?? attempt.result.code,
        subtitle: type?.subtitle ?? null,
        strengths: (content.strengths ?? []).slice(0, 2),
        goodWith: (content.goodWith ?? []).slice(0, 2),
        axes: (quiz.outcomes ?? [])
          .filter((o) => o.left?.code && o.right?.code)
          .map((o) => ({ id: o.id, label: o.label ?? o.id, left: o.left, right: o.right })),
        pomp: Object.fromEntries((attempt.result.outcomes ?? []).map((o) => [o.id, o.pomp])),
      };
    }

    return NextResponse.json({
      ok: true,
      run,
      note,
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
      guestUsed: await guestAlreadyPlayed(req, quiz._id),
      /** 이 브라우저 · 계정으로 이 질문지에 참여한 기록 — 첫 화면에서 「기록 보기」로 그 결과로 보낸다 */
      past: await pastRecord(req, quiz._id),
      notice: check.ok ? null : check.reason === "before_start" ? check.notice : "지금은 할 수 없어요.",
      friend: type
        ? { name: type.name, subtitle: type.subtitle ?? null, emoji: type.emoji }
        : null,
    });
  } catch (err) {
    return serverError(err);
  }
}
