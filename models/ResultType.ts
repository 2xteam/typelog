import mongoose, { Schema, type Model, type Types } from "mongoose";
import { defineModel } from "@/lib/model";
import type { ResultTypeContent, Weights } from "@/lib/quizTypes";

/**
 * 결과 타입과 준비된 답안.
 *
 * 질문지 문서에서 떼어 둔다 — 결과 화면은 **1건만** 읽는데, 16종의 긴 콘텐츠를
 * 질문지에 함께 두면 목록 화면에서도 매번 따라온다. 문장만 따로 갱신하기도 쉽다.
 * 문장은 published 후에도 고칠 수 있다(응답 계산에 영향이 없다).
 *
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */
const ResultTypeSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, required: true, index: true },
    quizSlug: { type: String, required: true },
    code: { type: String, required: true },

    name: { type: String, required: true },
    subtitle: { type: String, default: null },
    emoji: { type: String, required: true },
    imageUrl: { type: String, default: null },
    imageCredit: { type: String, default: null },
    color: { type: String, default: null },
    /** nearest 전략의 매칭 기준 */
    vector: { type: Schema.Types.Mixed, default: null },
    rarity: { type: String, default: null },

    content: {
      summary: { type: String, required: true },
      strengths: { type: [String], default: [] },
      cautions: { type: [String], default: [] },
      tips: { type: [String], default: [] },
      goodWith: { type: [String], default: [] },
      funFact: { type: String, default: null },
    },

    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

ResultTypeSchema.index({ quizId: 1, code: 1 }, { unique: true });

export type ResultTypeDoc = {
  _id: Types.ObjectId;
  quizId: Types.ObjectId;
  quizSlug: string;
  code: string;
  name: string;
  subtitle: string | null;
  emoji: string;
  imageUrl: string | null;
  imageCredit: string | null;
  color: string | null;
  vector: Weights | null;
  rarity: string | null;
  content: ResultTypeContent;
  updatedAt: Date;
};

export function getResultTypeModel(): Model<ResultTypeDoc> {
  return defineModel<ResultTypeDoc>("ResultType", ResultTypeSchema, "resulttypes");
}
