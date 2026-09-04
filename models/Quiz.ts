import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { Item, Outcome, Resolver } from "@/lib/quizTypes";

/**
 * 질문지 하나 전부 — 메타 · 상태 · 일정 · outcome 선언 · 문항 · 결과 결정 규칙.
 *
 * 문항이 바뀌지 않으므로 **문항 은행을 따로 두지 않는다.** 이 문서 안에 담는다.
 * 문항은 `published` 가 되면 API 레벨에서 잠긴다.
 *
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

const OutcomeSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, enum: ["axis", "tally", "sum", "dim"], required: true },
    label: { type: String, default: null },
    left: {
      type: new Schema(
        { code: String, label: { type: String, default: null } },
        { _id: false },
      ),
      default: null,
    },
    right: {
      type: new Schema(
        { code: String, label: { type: String, default: null } },
        { _id: false },
      ),
      default: null,
    },
  },
  { _id: false },
);

/**
 * 문항·선택지는 모양이 타입마다 달라 **느슨하게 담는다**(`strict: false`).
 * 무엇이 유효한 조합인지는 스키마가 아니라 `lib/quizValidate.ts` 가 정한다 —
 * 사람이 검토하지 않는 입력이므로 검사를 한곳에 모아 둔다.
 */
const ItemSchema = new Schema({}, { _id: false, strict: false });

const QuizSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    tagline: { type: String, required: true },
    category: { type: String, default: "etc" },
    ageRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
    cover: {
      emoji: { type: String, default: null },
      imageUrl: { type: String, default: null },
    },

    /** draft 에서만 고칠 수 있고, published 가 되면 문항이 잠긴다 */
    status: { type: String, enum: ["draft", "published", "closed"], required: true, default: "draft" },
    publishedAt: { type: Date, default: null },

    /**
     * "지금 이 사람이 풀 수 있나"만 판정한다. 목록을 어떻게 그릴지는 별개다.
     * 둘 다 없을 수 있다 → lib/schedule.ts 의 canStart()
     */
    schedule: {
      startAt: { type: Date, default: null },
      endAt: { type: Date, default: null },
      openingNoticeText: { type: String, default: null },
    },

    estimatedMinutes: { type: Number, default: null },
    shuffle: { type: Boolean, default: false },
    order: { type: Number, default: 100 },

    outcomes: { type: [OutcomeSchema], default: [] },
    items: { type: [ItemSchema], default: [] },
    resolver: { type: Schema.Types.Mixed, default: {} },

    /** 문항 묶음이 바뀐 횟수. 동결이 아니라 "이 시점에 몇 문항이었나"의 표시다 */
    revision: { type: Number, default: 1 },
    /** 해석 규칙(임계값·구간·매핑)이 바뀐 횟수 */
    scoringRevision: { type: Number, default: 1 },
    /** 결과 문장이 바뀐 횟수 — published 후에도 올라간다 */
    contentRevision: { type: Number, default: 1 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

QuizSchema.index({ status: 1, order: 1 });

export type QuizDoc = {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  tagline: string;
  category: string;
  ageRange: { min: number | null; max: number | null };
  cover: { emoji: string | null; imageUrl: string | null };
  status: "draft" | "published" | "closed";
  publishedAt: Date | null;
  schedule: { startAt: Date | null; endAt: Date | null; openingNoticeText: string | null };
  estimatedMinutes: number | null;
  shuffle: boolean;
  order: number;
  outcomes: Outcome[];
  items: Item[];
  resolver: Resolver;
  revision: number;
  scoringRevision: number;
  contentRevision: number;
  createdAt: Date;
  updatedAt: Date;
};

export function getQuizModel(): Model<QuizDoc> {
  return (mongoose.models.Quiz ??
    mongoose.model("Quiz", QuizSchema, "quizzes")) as unknown as Model<QuizDoc>;
}
