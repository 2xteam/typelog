import mongoose, { Schema, type Model, type Types } from "mongoose";
import { defineModel } from "@/lib/model";
import type { Answer, OutcomeScore } from "@/lib/scoring";

/**
 * 응시 1회 = 답변 배열 + 계산된 결과 스냅샷.
 *
 * 항상 함께 읽으므로 한 문서에 담는다. **재응시는 기능이므로 유니크 제약이 없다** —
 * FitLog 가 날짜당 1건으로 묶는 것과 정반대다. `attemptNo` 로 회차를 센다.
 *
 * 답은 **순서가 아니라 `linkId` 로** 저장한다. 문항을 섞을 수 있고, `enableWhen`
 * 분기가 있으면 사람마다 답한 문항이 다르며, 배열 인덱스로 저장하면 화면 코드의
 * 실수 하나로 답이 통째로 밀린다.
 *
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

const AnswerSchema = new Schema(
  {
    linkId: { type: String, required: true },
    /** choice — 고른 선택지들 (repeats 면 여럿) */
    oids: { type: [String], default: [] },
    /** integer · boolean · string · date */
    value: { type: Schema.Types.Mixed, default: null },
    answeredAt: { type: Date, default: Date.now },
    /** 응시 중 답을 고치는 것은 정상이다. 마지막 값만 남기되 횟수는 세어 둔다 */
    changedCount: { type: Number, default: 0 },
  },
  { _id: false },
);

/** 원점수와 그 회차의 가능 범위를 **함께** 남긴다. 하나라도 빠지면 재현할 수 없다 */
const OutcomeScoreSchema = new Schema(
  {
    id: { type: String, required: true },
    raw: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    /** 100 × (raw − min) / (max − min). 규칙에 쓰는 숫자는 항상 이것이다 */
    pomp: { type: Number, default: 0 },
  },
  { _id: false },
);

const AttemptSchema = new Schema(
  {
    owner: {
      kind: { type: String, enum: ["user", "guest"], required: true },
      userId: { type: String, default: null, index: true },
      /** localStorage UUID. 게스트는 설문지당 1회만 */
      guestKey: { type: String, default: null, index: true },
    },

    quizId: { type: Schema.Types.ObjectId, required: true, index: true },
    quizSlug: { type: String, required: true },
    quizRevision: { type: Number, default: 1 },
    scoringRevision: { type: Number, default: 1 },

    /** 이 사람의 이 설문지 n번째 회차 */
    attemptNo: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    durationSec: { type: Number, default: null },
    /** 섞었다면 재현용 */
    shuffleSeed: { type: Number, default: null },

    answers: { type: [AnswerSchema], default: [] },

    result: {
      code: { type: String, default: null },
      /** 1등만이 아니라 순위 전체 — "아슬아슬하게 2등"이 재미 요소다 */
      ranked: {
        type: [new Schema({ code: String, score: Number }, { _id: false })],
        default: [],
      },
      outcomes: { type: [OutcomeScoreSchema], default: [] },
      confidence: { type: Number, default: null },
      engineVersion: { type: Number, default: 1 },
      computedAt: { type: Date, default: null },
      recomputedAt: { type: Date, default: null },
    },

    share: {
      token: { type: String, default: null, index: true },
      isPublic: { type: Boolean, default: false },
      viewCount: { type: Number, default: 0 },
    },

    /**
     * 게스트만. 30일 뒤 사라진다.
     *
     * ⚠️ TTL 은 **부분 인덱스**로 건다. 회원 문서에는 이 필드가 없어야 하고,
     * sparse 로 두면 회원 기록까지 지워질 위험이 있다.
     */
    expiresAt: { type: Date, default: undefined },
  },
  { versionKey: false },
);

AttemptSchema.index({ "owner.userId": 1, quizId: 1, attemptNo: -1 });
AttemptSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { "owner.kind": "guest" } },
);

export type AttemptDoc = {
  _id: Types.ObjectId;
  owner: { kind: "user" | "guest"; userId: string | null; guestKey: string | null };
  quizId: Types.ObjectId;
  quizSlug: string;
  quizRevision: number;
  scoringRevision: number;
  attemptNo: number;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: Date;
  completedAt: Date | null;
  durationSec: number | null;
  shuffleSeed: number | null;
  answers: (Answer & { answeredAt: Date; changedCount: number })[];
  result: {
    code: string | null;
    ranked: { code: string; score: number }[];
    outcomes: OutcomeScore[];
    confidence: number | null;
    engineVersion: number;
    computedAt: Date | null;
    recomputedAt: Date | null;
  };
  share: { token: string | null; isPublic: boolean; viewCount: number };
  expiresAt?: Date;
};

export function getAttemptModel(): Model<AttemptDoc> {
  return defineModel<AttemptDoc>("Attempt", AttemptSchema, "attempts");
}
