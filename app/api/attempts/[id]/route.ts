import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { badRequest, forbidden, getViewer, notFound, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getAttemptModel, type AttemptDoc } from "@/models/Attempt";
import { ENGINE_VERSION, flattenItems, score, scoreRecord, type Answer } from "@/lib/scoring";
import type { Item, Resolver } from "@/lib/quizTypes";
import { formatClock, tooFast } from "@/lib/record";
import { getUserModel } from "@/models/User";
import { publicItem } from "@/lib/quizPublic";
import { signClaim } from "@/lib/claimToken";

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

/**
 * 지금까지의 답으로 미리 낸 결과 — threshold 질문지만.
 * 화면은 이걸로 `enableWhen.resultIn` 문항(신문이 나온 사람의 대회 이름)을 보일지 정한다.
 * 결과를 알려 주려는 게 아니라 **다음 문항을 고르려는** 값이다.
 */
function previewCode(quiz: { items?: unknown; resolver?: unknown }, answers: Answer[]) {
  const resolver = quiz.resolver as Resolver | undefined;
  if (resolver?.strategy !== "threshold") return null;
  return (
    scoreRecord({
      outcomes: [],
      items: (quiz.items ?? []) as Item[],
      resolver,
      resultTypes: [],
      answers,
    })?.code ?? null
  );
}

/** 자유 입력 한 줄 — 제어 문자를 빼고 길이를 자른다 */
function cleanLine(v: unknown, max: number) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
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
        /** 브랜드·나라 이름을 결과로 쓰는 질문지에 붙는 한 줄 */
        disclaimer: quiz.disclaimer ?? null,
        experience: quiz.experience ?? null,
      },
      answers: (attempt.answers ?? []).map((a) => ({
        linkId: a.linkId,
        oids: a.oids ?? [],
        value: a.value ?? null,
      })),
    };

    if (attempt.status === "completed") {
      /**
       * 게스트 **본인**이 자기 결과를 보고 있을 때만 이관 표를 함께 준다.
       * 화면은 이 표를 가입 링크에 실어 보내고, 돌아온 뒤 그 1건만 옮긴다.
       * 공유 링크로 들어온 남에게는 주지 않는다 → lib/claimToken.ts
       */
      if (attempt.owner.kind === "guest" && guestKey && guestKey === attempt.owner.guestKey) {
        body.claimToken = signClaim(String(attempt._id), guestKey);
      }

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

      /** 러닝 기록 — 자격증의 「러너」 칸. 회원이면 닉네임 */
      if (quiz.experience === "running" && attempt.owner.kind === "user" && attempt.owner.userId) {
        const u = await getUserModel().findById(attempt.owner.userId).select({ nickname: 1 }).lean();
        body.ownerName = (u as { nickname?: string | null } | null)?.nickname ?? null;
      }

      body.result = {
        code: attempt.result?.code ?? null,
        detail: attempt.result?.detail ?? null,
        completedAt: attempt.completedAt ?? null,
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
        /**
         * **양쪽 이름이 있는 축만 내려보낸다.**
         *
         * 화면은 이걸로 "어느 쪽에 가까운가요?" 를 그린다. `tally` outcome 은
         * 한쪽만 있는 세는 칸이라 left·right 가 없고, 그대로 보내면 이름표만
         * 있고 값은 빈 줄이 여섯 개 그려진다. 수치를 보여주지 않기로 했으니
         * (그래프 없음) 양쪽 이름이 없으면 할 말이 아예 없는 것이다.
         * → my-obsidian-vault / 10-Projects/TypeLog.md
         */
        outcomes: (attempt.result?.outcomes ?? []).flatMap((o) => {
          const decl = (quiz.outcomes ?? []).find((d) => d.id === o.id);
          if (!decl?.left?.code || !decl?.right?.code) return [];
          return [
            {
              id: o.id,
              label: decl.label ?? o.id,
              pomp: o.pomp,
              left: decl.left,
              right: decl.right,
            },
          ];
        }),
      };
    } else {
      body.items = items.map(publicItem);
      body.preview = previewCode(quiz, (attempt.answers ?? []) as Answer[]);
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
      /** 저장하지 않는 답(키·몸무게) — 채점에만 쓴다 */
      transient?: Record<string, unknown>;
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
    const quizDoc = await getQuizModel().findById(attempt.quizId).lean();
    if (!quizDoc) return notFound("질문지가 사라졌어요.");
    const allItems = flattenItems((quizDoc.items ?? []) as Item[]);
    const target = body.answer?.linkId ? allItems.find((i) => i.linkId === body.answer!.linkId) : null;

    if (attempt.status === "completed") {
      /**
       * 끝난 기록에서 고칠 수 있는 건 `editableAfterFinish` 문항뿐이다 —
       * 점수에 쓰이지 않는 자유 입력(러닝 기록의 대회 이름). 공유하기 전에 바꾼다.
       */
      if (!target?.editableAfterFinish || body.finish) return badRequest("이미 끝난 기록이에요.");
      const text = cleanLine(body.answer?.value, target.maxLength ?? 40);
      const has = (attempt.answers ?? []).some((a) => a.linkId === target.linkId);
      if (has) {
        await Attempt.updateOne(
          { _id: oid, "answers.linkId": target.linkId },
          {
            $set: { "answers.$.value": text || null, "answers.$.answeredAt": new Date() },
            $inc: { "answers.$.changedCount": 1 },
          },
        );
      } else {
        await Attempt.updateOne(
          { _id: oid },
          {
            $push: {
              answers: { linkId: target.linkId, oids: [], value: text || null, answeredAt: new Date(), changedCount: 0 },
            },
          },
        );
      }
      return NextResponse.json({ ok: true, saved: target.linkId, value: text || null });
    }

    // ── 답 하나 저장 ──
    if (body.answer?.linkId) {
      const { linkId, oids } = body.answer;
      let value = body.answer.value;
      if (!target) return badRequest("없는 질문이에요.");
      if (target.transient) return badRequest("이 답은 저장하지 않아요.");
      if (target.type === "string") value = cleanLine(value, target.maxLength ?? 200) || null;
      if (target.type === "duration") {
        const sec = Math.round(Number(value));
        if (!Number.isFinite(sec) || sec <= 0 || sec > 24 * 3600) return badRequest("기록을 다시 봐 주세요.");
        value = sec;
        // 세계기록보다 빠르면 받지 않는다 — 거리·성별을 먼저 골랐을 때만 알 수 있다
        const c = (quizDoc.resolver as Resolver | undefined)?.cutoffs;
        const g = (attempt.answers ?? []).find((a) => a.linkId === c?.gender)?.oids?.[0];
        const d = (attempt.answers ?? []).find((a) => a.linkId === c?.distance)?.oids?.[0];
        if (c && g && d && tooFast(c, g, d, sec)) {
          return badRequest(`${formatClock(sec)} 은 세계기록보다 빨라요. 한 번만 다시 볼까요? 🙂`);
        }
      }
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
      if (!body.finish) {
        const after = await Attempt.findById(oid).select({ answers: 1 }).lean();
        return NextResponse.json({
          ok: true,
          saved: linkId,
          preview: previewCode(quizDoc, (after?.answers ?? []) as Answer[]),
        });
      }
    }

    if (!body.finish) return badRequest("저장할 답이 없어요.");

    // ── 완료: 채점 ──
    const fresh = await Attempt.findById(oid).lean();
    const quiz = quizDoc;
    if (!fresh) return notFound("없는 기록이에요.");

    const items = flattenItems((quiz.items ?? []) as Item[]);
    const required = items.filter((i) => (i.required ?? true) && i.type !== "display" && !i.transient);
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
      transient: transientAnswers(items, body.transient),
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
            detail: outcome.detail ?? null,
            engineVersion: ENGINE_VERSION,
            computedAt: now,
            recomputedAt: null,
          },
        },
      },
    );

    return NextResponse.json({ ok: true, finished: true, code: outcome.code, detail: outcome.detail ?? null });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * 저장하지 않는 답 — `transient` 문항만, 칸마다 min·max 안의 숫자만 남긴다.
 * 범위 밖이면 그 칸은 버린다(보정 없이 계산된다). 값은 채점에만 쓰고 어디에도 남기지 않는다.
 */
function transientAnswers(items: Item[], raw: Record<string, unknown> | undefined) {
  const out: Record<string, Record<string, number>> = {};
  for (const it of items) {
    if (!it.transient || !it.fields) continue;
    const v = raw?.[it.linkId];
    if (!v || typeof v !== "object") continue;
    const clean: Record<string, number> = {};
    for (const f of it.fields) {
      const n = Number((v as Record<string, unknown>)[f.key]);
      if (Number.isFinite(n) && n >= f.min && n <= f.max) clean[f.key] = n;
    }
    if (Object.keys(clean).length) out[it.linkId] = clean;
  }
  return out;
}
