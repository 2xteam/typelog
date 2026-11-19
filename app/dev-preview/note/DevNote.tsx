"use client";

import { useMemo } from "react";
import { NoteResult, type NotePayload } from "@/components/note/NoteResult";
import { SharedNote } from "@/components/note/SharedNote";
import { buildCard, lookOf } from "@/components/note/view";
import { NoteDeck } from "@/components/note/NoteDeck";
import { noteFontVars } from "@/components/note/fonts";
import { kitOfSlug } from "@/components/note/palette";

type Q = {
  quiz: { title: string; disclaimer: string | null };
  outcomes: { id: string; label: string; left: { code: string; label: string }; right: { code: string; label: string } }[];
  resultTypes: {
    code: string;
    name: string;
    subtitle: string;
    emoji: string;
    content: { summary: string; strengths: string[]; cautions?: string[]; tips?: string[]; funFact?: string; goodWith?: string[] };
  }[];
};

/** 코드 + 세기 → 축마다 pomp (왼쪽이면 0 · 33, 오른쪽이면 67 · 100) */
function pompOf(q: Q, code: string, s: string) {
  return Object.fromEntries(
    q.outcomes.map((o, i) => {
      const left = code[i] === o.left.code;
      const strong = s[i] !== "0";
      return [o.id, left ? (strong ? 0 : 33.3) : strong ? 100 : 66.7];
    }),
  );
}

/**
 * 결과 화면 하나(덱 하나)만 그린다 — 앞의 회차 네 장이 덱 목록에 함께 들어간다.
 * 공유 화면은 `?view=shared` 로 따로 본다(한 화면에 스와이프 카드가 여럿이면 헷갈린다, 사용자 2026-11-18).
 */
export function DevNote({ quiz, slug, code, s, id, n, view }: { quiz: Q; slug: string; code: string; s: string; id: string; n: number; view: string }) {
  const t = quiz.resultTypes.find((x) => x.code === code) ?? quiz.resultTypes[0];
  const pomp = pompOf(quiz, t.code, s);
  const completedAt = useMemo(() => new Date().toISOString(), []);
  const data: NotePayload = {
    attemptId: id,
    attemptNo: n,
    isOwner: true,
    ownerName: "미리보기",
    custom: null,
    quiz: { slug, title: quiz.quiz.title, disclaimer: quiz.quiz.disclaimer ?? null },
    result: {
      code: t.code,
      completedAt,
      type: { name: t.name, subtitle: t.subtitle, emoji: t.emoji, content: t.content },
      goodWith: (t.content.goodWith ?? []).map((g) => {
        const x = quiz.resultTypes.find((r) => r.code === g);
        return { code: g, name: x?.name ?? g, emoji: x?.emoji ?? "" };
      }),
      outcomes: quiz.outcomes.map((o) => ({ id: o.id, label: o.label, pomp: pomp[o.id], left: o.left, right: o.right })),
    },
  };

  // 앞의 회차 — 유형 몇 개를 번갈아
  const before = useMemo(
    () =>
      Array.from({ length: Math.max(0, n - 1) }, (_, i) => {
        const c = quiz.resultTypes[(i * 5 + 3) % quiz.resultTypes.length].code;
        return buildCard({
          attemptId: `devdeck${i}${c}`,
          attemptNo: i + 1,
          code: c,
          typeName: quiz.resultTypes.find((r) => r.code === c)?.name ?? c,
          completedAt: new Date(Date.now() - (n - i) * 86400e3 * 9).toISOString(),
          runner: "미리보기",
          axes: quiz.outcomes,
          pomp: pompOf(quiz, c, ["0101", "1111", "0000", "1010", "1100", "0011"][i % 6]),
        });
      }),
    [quiz, n],
  );

  const look = lookOf(buildCard({ attemptId: id, attemptNo: n, code: t.code, typeName: t.name, completedAt, runner: "", axes: quiz.outcomes, pomp }));

  return (
    <>
      <p style={{ fontFamily: "monospace", fontSize: 12 }}>
        {t.code} s={s} id={id} n={n} · 글자 대비(가장 나쁜 곳) {look.theme.worst}:1 · {view === "shared" ? "공유 화면" : "결과 화면"}
      </p>
      {view === "collection" ? (
        /* 모은 카드(기록 화면)와 같은 덱 목록 — 로그인 없이 속도 · 동작을 보려고 */
        <div className={`nt ${noteFontVars}`}>
          <div className="nt-shell">
            <p className="nt-eyebrow">
              <span>{kitOfSlug(slug).brand}</span>
              <span>{before.length + 1} cards</span>
            </p>
            <h1 className="nt-head">내가 모은 {kitOfSlug(slug).brandKo}</h1>
            <NoteDeck cards={[...before, buildCard({ attemptId: id, attemptNo: n, code: t.code, typeName: t.name, completedAt, runner: "미리보기", axes: quiz.outcomes, pomp, strengths: t.content.strengths, goodWith: t.content.goodWith })]} start="list" />
          </div>
        </div>
      ) : view === "shared" ? (
        <SharedNote
          note={{
            attemptId: id,
            attemptNo: n,
            code: t.code,
            completedAt,
            runner: "미리보기",
            typeName: t.name,
            subtitle: t.subtitle,
            strengths: t.content.strengths,
            goodWith: t.content.goodWith ?? [],
            axes: quiz.outcomes,
            pomp,
          }}
        >
          <p className="nt-panel-eyebrow">Try it · 나도 내려 보기</p>
          <h2 className="nt-panel-title">{quiz.quiz.title}</h2>
          <div style={{ marginTop: 20 }}>
            <button type="button" className="nt-btn">
              나의 {kitOfSlug(slug).brandKo} 내리기 →
            </button>
          </div>
        </SharedNote>
      ) : (
        <NoteResult data={data} bare extraCards={before} />
      )}
    </>
  );
}
