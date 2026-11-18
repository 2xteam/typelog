"use client";

import { useMemo, useState } from "react";
import { NoteResult, type NotePayload } from "@/components/note/NoteResult";
import { Wallet } from "@/components/note/Wallet";
import { Wheel } from "@/components/note/Wheel";
import { buildCard, lookOf } from "@/components/note/view";
import { noteFontVars } from "@/components/note/fonts";
import { SharedNote } from "@/components/note/SharedNote";

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

export function DevNote({ quiz, code, s, id, n }: { quiz: Q; code: string; s: string; id: string; n: number }) {
  const t = quiz.resultTypes.find((x) => x.code === code) ?? quiz.resultTypes[0];
  const pomp = pompOf(quiz, t.code, s);
  const data: NotePayload = {
    attemptId: id,
    attemptNo: n,
    isOwner: true,
    ownerName: "미리보기",
    custom: null,
    quiz: { slug: "runner-16type", title: quiz.quiz.title, disclaimer: quiz.quiz.disclaimer },
    result: {
      code: t.code,
      completedAt: new Date().toISOString(),
      type: { name: t.name, subtitle: t.subtitle, emoji: t.emoji, content: t.content },
      goodWith: (t.content.goodWith ?? []).map((g) => {
        const x = quiz.resultTypes.find((r) => r.code === g);
        return { code: g, name: x?.name ?? g, emoji: x?.emoji ?? "" };
      }),
      outcomes: quiz.outcomes.map((o) => ({ id: o.id, label: o.label, pomp: pomp[o.id], left: o.left, right: o.right })),
    },
  };

  // 모은 카드 — 유형 다섯 개를 회차처럼
  const wallet = useMemo(
    () =>
      ["CLAR", "PSIF", "CSAF", "PLIR", t.code].map((c, i) =>
        buildCard({
          attemptId: `devwallet${i}${c}`,
          attemptNo: i + 1,
          code: c,
          typeName: quiz.resultTypes.find((r) => r.code === c)?.name ?? c,
          completedAt: new Date(Date.now() - (5 - i) * 86400e3 * 9).toISOString(),
          runner: "미리보기",
          axes: quiz.outcomes,
          pomp: pompOf(quiz, c, ["1010", "0101", "1111", "0000", s][i]),
        }),
      ),
    [quiz, t.code, s],
  );
  const [spinKey, setSpinKey] = useState(0);

  return (
    <>
      <p style={{ fontFamily: "monospace", fontSize: 12 }}>
        {t.code} s={s} id={id} · 대비(가장 나쁜 곳) {lookOf(wallet[4]).theme.worst}:1 · 막 {lookOf(wallet[4]).theme.scrim}
      </p>
      <NoteResult data={data} bare />
      <div style={{ marginTop: 24 }} id="shared">
        <SharedNote
          note={{
            attemptId: id,
            attemptNo: n,
            code: t.code,
            completedAt: data.result.completedAt,
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
          <p className="nt-panel-lead">공유 화면 미리보기 — 버튼은 동작하지 않아요</p>
          <div className="nt-pills">
            <span>질문 12개</span>
            <span>약 2분</span>
            <span>가입 없이 한 번</span>
          </div>
          <div style={{ marginTop: 20 }}>
            <button type="button" className="nt-btn">
              나의 러닝 노트 내리기 →
            </button>
          </div>
        </SharedNote>
      </div>
      <div className={`nt ${noteFontVars}`} style={{ marginTop: 24 }}>
        <div className="nt-shell">
          <p className="nt-eyebrow">
            <span>Wallet preview</span>
            <span>{wallet.length} cards</span>
          </p>
          <Wallet cards={wallet} current={wallet[4].attemptId} onPick={() => {}} />
        </div>
        <div className="nt-shell" style={{ marginTop: 14 }}>
          <p className="nt-eyebrow">
            <span>Wheel spin</span>
            <button type="button" className="nt-chip" onClick={() => setSpinKey((k) => k + 1)}>
              다시
            </button>
          </p>
          <div style={{ maxWidth: 360, margin: "16px auto" }}>
            <Wheel key={spinKey} picks={wallet[4].picks} mode="spin" />
          </div>
        </div>
      </div>
    </>
  );
}
