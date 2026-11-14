"use client";

import type { RecordDetail } from "@/lib/record";
import { runFontVars } from "./fonts";
import { License } from "./License";
import { Fit } from "./RunResult";
import "./result.css";

/**
 * 결과 링크 첫 화면 맨 위의 자격증 — 러닝 기록만.
 * 링크로는 모두 같은 형식(자격증)으로 나눈다. 신문 · 딱지 결과면 선수자격증.
 * 사진은 공유한 사람의 기기에만 있으므로 실루엣이다.
 */
export function SharedLicense({
  run,
}: {
  run: { attemptId: string; attemptNo: number; code: string; detail: RecordDetail; completedAt: string | null; name: string };
}) {
  const v = {
    attemptId: run.attemptId,
    attemptNo: run.attemptNo,
    code: run.code,
    detail: run.detail,
    name: run.name,
    race: null,
    completedAt: run.completedAt ? new Date(run.completedAt) : new Date(),
    photo: null,
  };
  return (
    <div className={`rr ${runFontVars}`} style={{ marginBottom: 18 }}>
      <Fit width={1000}>
        <License v={v} athlete={!run.code.startsWith("cert")} />
      </Fit>
    </div>
  );
}
