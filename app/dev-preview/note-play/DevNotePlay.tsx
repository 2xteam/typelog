"use client";

import { useMemo, useRef, useState } from "react";
import { NotePlay, type NoteApi, type NoteItem } from "@/components/note/NotePlay";
import { score, type Answer } from "@/lib/scoring";
import type { Item, Outcome, Resolver } from "@/lib/quizTypes";

type Q = { quiz: { title: string; cover?: { emoji?: string } }; outcomes: Outcome[]; items: Item[]; resolver: Resolver };

const ID = "devplay00000000000000001";

export function DevNotePlay({ quiz }: { quiz: Q }) {
  const answers = useRef<Record<string, Answer>>({});
  const [code, setCode] = useState("CLAR");

  const api: NoteApi = useMemo(
    () => ({
      async save(answer) {
        answers.current[answer.linkId] = { linkId: answer.linkId, oids: answer.oids, value: null };
        return { ok: true };
      },
      async result() {
        const r = score({
          outcomes: quiz.outcomes,
          items: quiz.items,
          resolver: quiz.resolver,
          resultTypes: [],
          answers: Object.values(answers.current),
        });
        setCode(r.code ?? "CLAR");
        const outcomes = r.outcomes.flatMap((o) => {
          const d = quiz.outcomes.find((x) => x.id === o.id);
          return d?.left && d.right ? [{ id: o.id, label: d.label ?? o.id, pomp: o.pomp, left: d.left, right: d.right }] : [];
        });
        return { code: r.code ?? "", outcomes };
      },
    }),
    [quiz],
  );

  // 결과 미리보기로 — 세기(s)는 기본값(1010)
  const resultPath = `/dev-preview/note?code=${code}&id=${ID}`;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <NotePlay
        attemptId={ID}
        resultPath={resultPath}
        quiz={{ title: quiz.quiz.title, emoji: quiz.quiz.cover?.emoji ?? null }}
        items={quiz.items as unknown as NoteItem[]}
        initialAnswers={[]}
        api={api}
      />
    </main>
  );
}
