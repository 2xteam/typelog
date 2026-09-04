import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { badRequest, forbidden, getViewer, notFound, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getAttemptModel, type AttemptDoc } from "@/models/Attempt";
import { ENGINE_VERSION, flattenItems, score, type Answer } from "@/lib/scoring";
import type { Item } from "@/lib/quizTypes";
import { publicItem } from "@/lib/quizPublic";

export const runtime = "nodejs";

/**
 * 응시 1건 — 이어하기 · 답 저장 · 완료(채점).
 *
 * 답은 **매 문항마다** 저장한다. 아이는 중간에 나간다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

/** 이 응시가 내 것인가. 게스트는 `guestKey` 로 확인한다 */
async function own(req: Request, attempt: AttemptDoc, guestKey?: string | null) {
  if (attempt.owner.kind === "user") {
    const viewer = await getViewer(req);
    return !!viewer && viewer.userId === attempt.owner.userId;
  }
  return !!guestKey && guestKey === attempt.owner.guestKey;
}

function asObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

/** GET /api/attempts/[id]?guestKey= — 이어하기 · 결과 보기 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const oid = asObjectId(id);
    if (!oid) return notFound("없는 기록이에요.");

    const guestKey = new URL(req.url).searchParams.get("guestKey");

    await connectDB();
    const attempt = await getAttemptModel().findById(oid).lean();
    if (!attempt) return notFound("없는 기록이에요.");

    const shared = attempt.share?.isPublic === true;
    if (!shared && !(await own(req, attempt as AttemptDoc, guestKey))) {
      return forbidden("이 기록은 볼 수 없어요.");
    }

    const quiz = await getQuizModel().findById(attempt.quizId).lean();
    if (!quiz) return notFound("질문지가 사라졌어요.");

    const items = flattenItems((quiz.items ?? []) as Item[]);
    const body: Record<string, unknown> = {
      ok: true,
      attemptId: String(attempt._id),
      attemptNo: attempt.attemptNo,
      status: attempt.status,
      shuffleSeed: attempt.shuffleSeed,
      quiz: {
        slug: quiz.slug,
        title: quiz.title,
        tagline: quiz.tagline,
        emoji: quiz.cover?.emoji ?? null,
      },
      answers: (attempt.answers ?? []).map((a) => ({
        linkId: a.linkId,
        oids: a.oids ?? [],
        value: a.value ?? null,
      })),
    };

    if (attempt.status === "completed") {
      /**
       * 결과 문장은 **지금** 읽는다. 코드·점수만 스냅샷하고 문장은 최신을 쓴다 —
       * 오타를 고쳤는데 과거 결과가 옛 문장을 계속 보여주면 안 된다.
       */
      const ResultType = getResultTypeModel();
      const mine = await ResultType.findOne({
        quizId: attempt.quizId,
        code: attempt.result?.code ?? "",
      }).lean();
      const runnerUp = attempt.result?.ranked?.[1]?.code
        ? await ResultType.findOne({
            quizId: attempt.quizId,
            code: attempt.result.ranked[1].code,
          })
            .select({ code: 1, name: 1, emoji: 1 })
            .lean()
        : null;
      const goodWith = mine?.content?.goodWith?.length
        ? await ResultType.find({ quizId: attempt.quizId, code: { $in: mine.content.goodWith } })
            .select({ code: 1, name: 1, emoji: 1 })
            .lean()
        : [];

      body.result = {
        code: attempt.result?.code ?? null,
        type: mine
          ? {
              code: mine.code,
              name: mine.name,
              subtitle: mine.subtitle,
              emoji: mine.emoji,
              color: mine.color,
              imageUrl: mine.imageUrl,
              content: mine.content,
            }
          : null,
        runnerUp: runnerUp
          ? { code: runnerUp.code, name: runnerUp.name, emoji: runnerUp.emoji }
          : null,
        goodWith: goodWith.map((g) => ({ code: g.code, name: g.name, emoji: g.emoji })),
        outcomes: (attempt.result?.outcomes ?? []).map((o) => {
          const decl = (quiz.outcomes ?? []).find((d) => d.id === o.id);
          return {
            id: o.id,
            label: decl?.label ?? o.id,
            pomp: o.pomp,
            left: decl?.left ?? null,
            right: decl?.right ?? null,
          };
        }),
      };
    } else {
      body.items = items.map(publicItem);
    }

    return NextResponse.json(body);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PATCH /api/attempts/[id] — 답 하나 저장, 또는 완료.
 *
 * body: `{ guestKey?, answer?: {linkId, oids?, value?}, finish?: true }`
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const oid = asObjectId(id);
    if (!oid) return notFound("없는 기록이에요.");

    let body: {
      guestKey?: string;
      answer?: { linkId?: string; oids?: string[]; value?: unknown };
      finish?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return badRequest("잘못된 요청이에요.");
    }

    await connectDB();
    const Attempt = getAttemptModel();
    const attempt = await Attempt.findById(oid).lean();
    if (!attempt) return notFound("없는 기록이에요.");
    if (!(await own(req, attempt as AttemptDoc, body.guestKey))) {
      return forbidden("이 기록은 고칠 수 없어요.");
    }
    if (attempt.status === "completed") return badRequest("이미 끝난 기록이에요.");

    // ── 답 하나 저장 ──
    if (body.answer?.linkId) {
      const { linkId, oids, value } = body.answer;
      const prev = (attempt.answers ?? []).find((a) => a.linkId === linkId);
      if (prev) {
        // 답을 고치는 것은 정상이다. 마지막 값만 남기되 횟수를 센다
        await Attempt.updateOne(
          { _id: oid, "answers.linkId": linkId },
          {
            $set: {
              "answers.$.oids": oids ?? [],
              "answers.$.value": value ?? null,
              "answers.$.answeredAt": new Date(),
            },
            $inc: { "answers.$.changedCount": 1 },
          },
        );
      } else {
        await Attempt.updateOne(
          { _id: oid },
          {
            $push: {
              answers: {
                linkId,
                oids: oids ?? [],
                value: value ?? null,
                answeredAt: new Date(),
                changedCount: 0,
              },
            },
          },
        );
      }
      if (!body.finish) return NextResponse.json({ ok: true, saved: linkId });
    }

    if (!body.finish) return badRequest("저장할 답이 없어요.");

    // ── 완료: 채점 ──
    const fresh = await Attempt.findById(oid).lean();
    const quiz = await getQuizModel().findById(attempt.quizId).lean();
    if (!fresh || !quiz) return notFound("질문지가 사라졌어요.");

    const items = flattenItems((quiz.items ?? []) as Item[]);
    const required = items.filter((i) => (i.required ?? true) && i.type !== "display");
    const answered = new Set((fresh.answers ?? []).map((a) => a.linkId));
    const missing = required.filter((i) => !answered.has(i.linkId));
    if (missing.length) {
      return badRequest(`아직 답하지 않은 질문이 ${missing.length}개 있어요.`, {
        missing: missing.map((i) => i.linkId),
      });
    }

    const types = await getResultTypeModel()
      .find({ quizId: attempt.quizId })
      .select({ code: 1, vector: 1 })
      .lean();

    const outcome = score({
      outcomes: quiz.outcomes ?? [],
      items: (quiz.items ?? []) as Item[],
      resolver: quiz.resolver ?? { strategy: "argmax" },
      resultTypes: types.map((t) => ({ code: t.code, vector: t.vector })),
      answers: (fresh.answers ?? []).map<Answer>((a) => ({
        linkId: a.linkId,
        oids: a.oids ?? [],
        value: a.value,
      })),
    });

    if (!outcome.code) {
      // resolver 가 어떤 코드에도 걸리지 않았다 — 검증기가 막았어야 하는 상태다
      return serverError(new Error("결과를 정할 수 없어요. 관리자에게 알려주세요."));
    }

    const now = new Date();
    await Attempt.updateOne(
      { _id: oid },
      {
        $set: {
          status: "completed",
          completedAt: now,
          durationSec: Math.max(
            1,
            Math.round((now.getTime() - new Date(fresh.startedAt).getTime()) / 1000),
          ),
          result: {
            code: outcome.code,
            ranked: outcome.ranked,
            outcomes: outcome.outcomes,
            confidence: outcome.confidence,
            engineVersion: ENGINE_VERSION,
            computedAt: now,
            recomputedAt: null,
          },
        },
      },
    );

    return NextResponse.json({ ok: true, finished: true, code: outcome.code });
  } catch (err) {
    return serverError(err);
  }
}
