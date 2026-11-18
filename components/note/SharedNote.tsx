"use client";

import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { Stage } from "./Stage";
import { buildCard } from "./view";
import { noteFontVars } from "./fonts";
import type { AxisDecl } from "./palette";
import "./note.css";

/**
 * 결과 링크 첫 화면 — 러닝 노트. 공유 화면의 틀(카드 → 나도 해보기)은 러닝 자격증과 같고,
 * 옷만 이번 컨셉으로: 어두운 무대에 친구의 카드가 공개되고, 그 아래 금빛 버튼.
 * 버튼 · 안내(가입 · 로그인)는 공유 화면(`app/r/[token]/page.tsx`)이 `children` 으로 넣는다.
 */
export type SharedNoteData = {
  attemptId: string;
  attemptNo: number;
  code: string;
  completedAt: string | null;
  runner: string;
  typeName: string;
  subtitle: string | null;
  strengths: string[];
  goodWith: string[];
  axes: AxisDecl[];
  pomp: Record<string, number>;
};

export function SharedNote({ note, children }: { note: SharedNoteData; children: React.ReactNode }) {
  const card = useMemo(() => buildCard({ ...note }), [note]);
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) setReveal(true);
  }, []);

  return (
    <div className={`nt ${noteFontVars}`}>
      <div className="nt-shell">
        <div className="nt-share-brand">
          <AppIcon size={30} />
          {/* 어두운 무대라 앞 글자는 밝게(소개 화면 푸터의 myjane 워드마크와 같다) */}
          <span className="myjane-mark shared-wordmark" style={{ color: "var(--on-dark)" }}>
            type<span>log</span>
          </span>
        </div>
        <p className="nt-eyebrow" style={{ marginTop: 14 }}>
          <span>A friend shared</span>
          <span>Running Note</span>
        </p>
        <h1 className="nt-head">
          <span>{note.code}</span>
          {note.runner} 님의 러닝 노트예요
        </h1>
        <p className="nt-sub">{note.typeName}</p>
        <Stage card={card} reveal={reveal} />
        <p className="nt-hint">카드를 누르거나 ← 밀면 뒷면이 보여요</p>
        <div className="nt-share-cta">{children}</div>
      </div>
    </div>
  );
}
