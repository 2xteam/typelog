"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";

/**
 * 한 질문지의 회차 목록.
 *
 * 수치가 아니라 **타입이 바뀌었는지**로 변화를 말한다.
 * 최근 20건 + 더 보기 → my-obsidian-vault / 10-Projects/TypeLog.md
 */

type Row = {
  attemptId: string;
  attemptNo: number;
  completedAt: string | null;
  code: string | null;
  name: string | null;
  emoji: string | null;
  changed: boolean | null;
  prevCode: string | null;
};

const day = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

export default function RecordDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [quiz, setQuiz] = useState<{ title: string; emoji: string | null } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(
    async (skip: number) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/records/${slug}?skip=${skip}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setMsg(data.error ?? "불러올 수 없어요.");
          return;
        }
        setQuiz(data.quiz);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setRows((prev) => (skip === 0 ? data.attempts : [...prev, ...data.attempts]));
      } finally {
        setBusy(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  if (msg) {
    return (
      <Sheet eyebrow="RECORDS" headline="기록을 볼 수 없어요">
        <p className="lead">{msg}</p>
      </Sheet>
    );
  }
  if (!quiz) return null;

  return (
    <Sheet eyebrow="RECORDS" headline={`${quiz.emoji ?? ""} ${quiz.title}`.trim()}>
      <p className="lead">모두 {total}번 해봤어요. 최근 순서예요.</p>

      <div className="timeline">
        {rows.map((r) => (
          <Link key={r.attemptId} href={`/results/${r.attemptId}`} className="timeline-row">
            <span className="timeline-no">{r.attemptNo}회</span>
            <span className="timeline-emoji" aria-hidden="true">
              {r.emoji ?? "•"}
            </span>
            <span className="timeline-name">{r.name ?? r.code ?? "—"}</span>
            <span className="timeline-gap" />
            {r.changed === null ? (
              <span className="timeline-note">처음이에요</span>
            ) : r.changed ? (
              <span className="timeline-note timeline-note--changed">이번엔 다른 타입이 나왔어요</span>
            ) : (
              <span className="timeline-note">지난번과 같아요</span>
            )}
            <span className="timeline-date">{day(r.completedAt)}</span>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {hasMore ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void load(rows.length)}
            disabled={busy}
          >
            {busy ? "불러오는 중…" : "더 보기"}
          </button>
        ) : null}
        <Link className="btn btn--ghost btn--sm" href="/records">
          ← 기록으로
        </Link>
      </div>
    </Sheet>
  );
}
