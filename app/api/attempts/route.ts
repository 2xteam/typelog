import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { badRequest, conflict, forbidden, getViewer, notFound, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getAttemptModel } from "@/models/Attempt";
import { canStart } from "@/lib/schedule";
import { flattenItems } from "@/lib/scoring";
import type { Item } from "@/lib/quizTypes";
import { publicItem } from "@/lib/quizPublic";

export const runtime = "nodejs";

/** 게스트 기록은 30일 뒤 사라진다 */
const GUEST_TTL_DAYS = 30;

/**
 * POST /api/attempts — 응시 시작.
 *
 * body: `{ slug, guestKey? }`
 *
 * **막는 곳은 여기 한 곳이다.** 목록을 어떻게 그렸든, 시작하는 순간에
 * `canStart()` 로 일정을 판정한다.
 *
 * 게스트는 **설문지당 1회**만 할 수 있다. 안 막으면 원하는 결과가 나올 때까지
 * 돌린다 → my-obsidian-vault / 10-Projects/TypeLog.md
 */
export async function POST(req: Request) {
  try {
    let body: { slug?: string; guestKey?: string };
    try {
      body = (await req.json()) as { slug?: string; guestKey?: string };
    } catch {
      return badRequest("잘못된 요청이에요.");
    }

    const slug = body.slug?.trim();
    if (!slug) return badRequest("어느 질문지인지 알 수 없어요.");

    await connectDB();
    const quiz = await getQuizModel().findOne({ slug }).lean();
    if (!quiz || quiz.status === "draft") return notFound("아직 없는 질문지예요.");
    if (quiz.status === "closed") return forbidden("지금은 할 수 없어요.");

    const check = canStart(quiz.schedule);
    if (!check.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: check.reason,
          error:
            check.reason === "before_start"
              ? check.notice
              : "지금은 할 수 없어요. 기간이 끝났어요.",
          startAt: check.reason === "before_start" ? check.startAt.toISOString() : null,
        },
        { status: 403 },
      );
    }

    const viewer = await getViewer(req);
    const Attempt = getAttemptModel();

    /** 회원이면 회차를 이어서 센다. 재응시는 기능이므로 막지 않는다 */
    let owner: { kind: "user" | "guest"; userId: string | null; guestKey: string | null };
    let attemptNo = 1;
    let expiresAt: Date | undefined;

    if (viewer) {
      owner = { kind: "user", userId: viewer.userId, guestKey: null };
      attemptNo =
        (await Attempt.countDocuments({ "owner.userId": viewer.userId, quizId: quiz._id })) + 1;
    } else {
      const guestKey = body.guestKey?.trim();
      if (!guestKey) return badRequest("로그인이 필요해요.");
      const already = await Attempt.countDocuments({
        "owner.guestKey": guestKey,
        quizId: quiz._id,
      });
      if (already > 0) {
        return conflict("가입하지 않으면 한 번만 해볼 수 있어요. 가입하면 다시 할 수 있어요.");
      }
      owner = { kind: "guest", userId: null, guestKey };
      expiresAt = new Date(Date.now() + GUEST_TTL_DAYS * 24 * 60 * 60 * 1000);
    }

    const created = await Attempt.create({
      owner,
      quizId: quiz._id,
      quizSlug: quiz.slug,
      quizRevision: quiz.revision ?? 1,
      scoringRevision: quiz.scoringRevision ?? 1,
      attemptNo,
      status: "in_progress",
      startedAt: new Date(),
      /** 섞을 질문지면 시드를 남긴다 — 없으면 재현할 수 없다 */
      shuffleSeed: quiz.shuffle ? Math.floor(Math.random() * 2 ** 31) : null,
      answers: [],
      ...(expiresAt ? { expiresAt } : {}),
    });

    const items = flattenItems((quiz.items ?? []) as Item[]).map(publicItem);

    return NextResponse.json({
      ok: true,
      attemptId: String(created._id),
      attemptNo,
      quiz: {
        slug: quiz.slug,
        title: quiz.title,
        tagline: quiz.tagline,
        emoji: quiz.cover?.emoji ?? null,
        shuffle: quiz.shuffle ?? false,
      },
      shuffleSeed: created.shuffleSeed,
      items,
    });
  } catch (err) {
    return serverError(err);
  }
}
