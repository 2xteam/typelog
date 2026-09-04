"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/Sheet";
import { getGuestKey } from "@/lib/guestKey";

/**
 * 응시 화면 — 한 문항씩.
 *
 * **답은 매 문항 저장한다.** 아이는 중간에 나간다. 뒤로 가서 고치는 것도
 * 정상이므로 막지 않는다(서버가 마지막 값만 남기고 횟수를 센다).
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

type Option = { oid: string; text: string; emoji: string | null };
type Item = {
  linkId: string;
  type: string;
  text: string | null;
  emoji: string | null;
  required: boolean;
  repeats: boolean;
  scale: { min: number; max: number; labels?: string[] | null } | null;
  options: Option[];
};
type Answer = { linkId: string; oids: string[]; value: unknown };

export default function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [items, setItems] = useState<Item[] | null>(null);
  const [quiz, setQuiz] = useState<{ title: string; emoji: string | null } | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/attempts/${id}?guestKey=${encodeURIComponent(getGuestKey())}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "불러올 수 없어요.");
        return;
      }
      if (data.status === "completed") {
        router.replace(`/results/${id}`);
        return;
      }
      setQuiz(data.quiz);
      setItems(data.items ?? []);
      const map: Record<string, Answer> = {};
      for (const a of data.answers ?? []) map[a.linkId] = a;
      setAnswers(map);
      // 이어하기 — 아직 답하지 않은 첫 문항으로
      const first = (data.items ?? []).findIndex((it: Item) => !map[it.linkId]);
      setAt(first === -1 ? Math.max(0, (data.items ?? []).length - 1) : first);
    })();
  }, [id, router]);

  const item = items?.[at] ?? null;
  const total = items?.length ?? 0;
  const done = useMemo(() => Object.keys(answers).length, [answers]);

  const save = useCallback(
    async (answer: Answer, finish: boolean) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/attempts/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ guestKey: getGuestKey(), answer, finish }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setMsg(data.error ?? "저장하지 못했어요.");
          return false;
        }
        if (data.finished) router.replace(`/results/${id}`);
        return true;
      } catch {
        setMsg("네트워크가 불안정해요.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [id, router],
  );

  const pick = useCallback(
    async (oid: string) => {
      if (!item || busy) return;
      const answer: Answer = { linkId: item.linkId, oids: [oid], value: null };
      setAnswers((prev) => ({ ...prev, [item.linkId]: answer }));
      const last = at === total - 1;
      const ok = await save(answer, last);
      if (ok && !last) setAt((i) => i + 1);
    },
    [item, busy, at, total, save],
  );

  if (msg && !items) {
    return (
      <Sheet eyebrow="TYPE PLAY" headline="여기서는 이어갈 수 없어요">
        <p className="lead">{msg}</p>
      </Sheet>
    );
  }
  if (!item || !quiz) return null;

  const chosen = answers[item.linkId]?.oids?.[0] ?? null;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <Sheet tone="dark" eyebrow={`${quiz.emoji ?? ""} ${quiz.title}`.trim()} headline={item.text ?? ""}>
      <div className="play-progress" aria-hidden="true">
        <div className="play-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="play-count">
        {at + 1} / {total}
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        {item.options.map((o) => (
          <button
            key={o.oid}
            type="button"
            className="play-option"
            data-chosen={chosen === o.oid}
            onClick={() => void pick(o.oid)}
            disabled={busy}
          >
            {o.emoji ? <span aria-hidden="true">{o.emoji}</span> : null}
            <span>{o.text}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setAt((i) => Math.max(0, i - 1))}
          disabled={at === 0 || busy}
        >
          ← 앞 질문
        </button>
        {chosen && at < total - 1 ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setAt((i) => Math.min(total - 1, i + 1))}
            disabled={busy}
          >
            다음 →
          </button>
        ) : null}
      </div>

      {msg ? <p className="quiz-msg">{msg}</p> : null}
    </Sheet>
  );
}
