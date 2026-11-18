"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getGuestKey } from "@/lib/guestKey";
import { Wheel } from "./Wheel";
import { pickAxes, type AxisPick } from "./palette";
import { splitOutcomes } from "./view";
import { noteFontVars } from "./fonts";
import "./note.css";

/**
 * 러닝 노트 응시 — 러닝 자격증(`components/run/RunPlay.tsx`)과 같은 틀.
 * **선택은 간단하게, 보는 건 화려하게.** 한 화면에 질문 하나, 큰 타일 둘, 누르면 다음.
 * 분위기만 다르다 — 스튜디오 무대(보라 · 파랑 조명) · 라벤더 선(러닝 자격증이 가볍다면 이쪽은 무겁고 고급스럽게).
 *
 * 마지막 답을 내면 채점하고, 색 원판이 돌며 내 아이덴티티 컬러 4칸에 불이 켜진 뒤 결과로 간다.
 * 답은 매 화면 저장한다(일반 질문지와 같다). 뒤로 가서 고칠 수 있다.
 * → my-obsidian-vault / 50-Plans/K 러닝 노트.md
 */

export type NoteItem = {
  linkId: string;
  text: string | null;
  emoji: string | null;
  options: { oid: string; text: string; emoji?: string | null }[];
};
type Answer = { linkId: string; oids: string[]; value: unknown };
type Outcome = { id: string; label?: string | null; pomp: number; left: { code: string; label?: string | null } | null; right: { code: string; label?: string | null } | null };

/** 저장 · 채점 — 실제는 응시 API, 개발용 미리보기는 브라우저 안에서 */
export type NoteApi = {
  save: (answer: Answer, finish: boolean) => Promise<{ ok: boolean; error?: string }>;
  result: () => Promise<{ code: string; outcomes: Outcome[] }>;
};

export function attemptApi(attemptId: string): NoteApi {
  return {
    async save(answer, finish) {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ guestKey: getGuestKey(), answer, finish }),
        });
        const data = await res.json();
        return res.ok && data.ok ? { ok: true } : { ok: false, error: data.error ?? "저장하지 못했어요." };
      } catch {
        return { ok: false, error: "네트워크가 불안정해요." };
      }
    },
    async result() {
      const res = await fetch(`/api/attempts/${attemptId}?guestKey=${encodeURIComponent(getGuestKey())}`);
      const data = await res.json();
      return { code: data.result?.code ?? "", outcomes: data.result?.outcomes ?? [] };
    },
  };
}

export function NotePlay({
  attemptId,
  resultPath,
  quiz,
  items,
  initialAnswers,
  api,
}: {
  attemptId: string;
  resultPath: string;
  quiz: { title: string; emoji: string | null };
  items: NoteItem[];
  initialAnswers: Answer[];
  api?: NoteApi;
}) {
  const router = useRouter();
  const io = useMemo(() => api ?? attemptApi(attemptId), [api, attemptId]);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(initialAnswers.map((a) => [a.linkId, a])),
  );
  const [at, setAt] = useState(() => {
    const first = items.findIndex((it) => !initialAnswers.some((a) => a.linkId === it.linkId));
    return first === -1 ? Math.max(0, items.length - 1) : first;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [gen, setGen] = useState<{ picks: AxisPick[] } | null>(null);

  const item = items[at] ?? null;
  const chosen = item ? (answers[item.linkId]?.oids?.[0] ?? null) : null;

  const pick = useCallback(
    async (oid: string) => {
      if (!item || busy) return;
      const answer: Answer = { linkId: item.linkId, oids: [oid], value: null };
      setAnswers((prev) => ({ ...prev, [item.linkId]: answer }));
      const last = at === items.length - 1;
      setBusy(true);
      setMsg(null);
      const r = await io.save(answer, last);
      if (!r.ok) {
        setBusy(false);
        setMsg(r.error ?? "저장하지 못했어요.");
        return;
      }
      if (!last) {
        setBusy(false);
        setAt((i) => i + 1);
        return;
      }
      try {
        const res = await io.result();
        const { axes, pomp } = splitOutcomes(res.outcomes);
        setGen({ picks: pickAxes(axes, pomp, attemptId) });
      } catch {
        router.replace(resultPath);
      }
    },
    [item, busy, at, items.length, io, attemptId, router, resultPath],
  );

  const done = useCallback(() => router.replace(resultPath), [router, resultPath]);

  if (gen) {
    return (
      <div className={`np ${noteFontVars}`}>
        <div className="np-gen" onClick={done} role="button" tabIndex={0} aria-label="결과 바로 보기">
          <p className="np-gen-eyebrow">Blending · 블렌딩 중</p>
          <div className="np-gen-wheel">
            <Wheel picks={gen.picks} mode="spin" onDone={done} />
          </div>
          <p className="np-gen-copy">
            {gen.picks.map((p) => p.color.ko).join(" · ")}
          </p>
          <p className="np-gen-fine">12가지 답으로 나만의 러닝 노트를 내리고 있어요 ☕</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`np ${noteFontVars}`}>
      <div className="np-top">
        <button type="button" className="np-back" onClick={() => setAt((i) => Math.max(0, i - 1))} disabled={at === 0 || busy} aria-label="앞 질문">
          ←
        </button>
        <div className="np-bar" aria-hidden="true">
          {items.map((it, i) => (
            <i key={it.linkId} data-on={i <= at} />
          ))}
        </div>
        <p className="np-title">
          <span>Running Note</span>
          <span>
            {String(at + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
        </p>
      </div>

      {item ? (
        <div className="np-stage" key={item.linkId}>
          {item.emoji ? (
            <p className="np-emoji" aria-hidden="true">
              {item.emoji}
            </p>
          ) : null}
          <h1 className="np-q">{item.text}</h1>
          <div className="np-tiles">
            {item.options.map((o, i) => (
              <button
                key={o.oid}
                type="button"
                className="np-tile"
                data-chosen={chosen === o.oid}
                disabled={busy}
                onClick={() => void pick(o.oid)}
              >
                <span className="np-tile-mark" aria-hidden="true">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="np-tile-text">{o.text}</span>
              </button>
            ))}
          </div>
          {msg ? <p className="np-msg">{msg}</p> : null}
          <p className="np-fine">{quiz.emoji} {quiz.title}</p>
        </div>
      ) : null}
    </div>
  );
}
