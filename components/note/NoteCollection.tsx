"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getGuestKey } from "@/lib/guestKey";
import { NoteDeck } from "./NoteDeck";
import { buildCard, type NoteCardData } from "./view";
import { noteFontVars } from "./fonts";
import type { AxisDecl } from "./palette";
import "./note.css";

/**
 * 기록 → 러닝 노트 — 지금까지 모은 카드를 좌우 줄로 놓고(덱 목록), 누르면 그 자리에서 꺼낸다(덱 상세).
 * 일반 질문지의 회차 목록(타임라인) 대신 이 화면을 쓴다.
 */
type Row = { attemptId: string; attemptNo: number; completedAt: string | null; code: string | null; name: string | null; pomp?: Record<string, number> | null; runner?: string | null };

export function NoteCollection({ slug }: { slug: string }) {
  const router = useRouter();
  const [data, setData] = useState<{ title: string; axes: AxisDecl[]; rows: Row[]; total: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [deck, setDeck] = useState<{ mode: "list" | "detail"; id: string; face: "front" | "back" } | null>(null);

  /** 한 장 더 — 목록(/types)의 「해보기」와 같은 방식으로 새 회차를 연다 */
  const again = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, guestKey: getGuestKey() }),
      });
      const json = (await res.json()) as { ok?: boolean; attemptId?: string; error?: string };
      if (!res.ok || !json.ok || !json.attemptId) {
        setMsg(json.error ?? "시작할 수 없어요.");
        return;
      }
      router.push(`/play/${json.attemptId}`);
    } catch {
      setMsg("네트워크가 불안정해요.");
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/records/${slug}?limit=60`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setMsg(json.error ?? "불러올 수 없어요.");
          return;
        }
        setData({ title: json.quiz.title, axes: json.quiz.axes ?? [], rows: json.attempts ?? [], total: json.total ?? 0 });
      } catch {
        setMsg("네트워크가 불안정해요.");
      }
    })();
  }, [slug]);

  const cards: NoteCardData[] = useMemo(
    () =>
      (data?.rows ?? [])
        .filter((r) => r.code && r.pomp)
        .map((r) =>
          buildCard({
            attemptId: r.attemptId,
            attemptNo: r.attemptNo,
            code: r.code!,
            typeName: r.name ?? r.code!,
            completedAt: r.completedAt,
            runner: r.runner ?? "러너",
            axes: data!.axes,
            pomp: r.pomp!,
          }),
        ),
    [data],
  );

  return (
    <div className={`nt ${noteFontVars}`}>
      <div className="nt-shell">
        <p className="nt-eyebrow">
          <span>Running Note</span>
          <span>{data ? `${data.total} cards` : ""}</span>
        </p>
        <h1 className="nt-head">내가 모은 러닝 노트</h1>
        <p className="nt-sub">{msg ?? (data && !cards.length ? "아직 카드가 없어요." : "회차마다 한 장씩 쌓여요. 눌러서 꺼내 봐요.")}</p>
        {cards.length ? <NoteDeck cards={cards} start="list" onChange={setDeck} /> : null}
        {deck?.mode === "detail" ? (
          <p className="nt-sub">
            <Link href={`/results/${deck.id}`} className="nt-link">
              이 회차 자세히 보기 →
            </Link>
          </p>
        ) : null}
        <div className="nt-ctrl" style={{ marginTop: 14 }}>
          <Link className="nt-chip" href="/records">
            ← 기록으로
          </Link>
          <button type="button" className="nt-chip nt-chip--gold" onClick={() => void again()} disabled={starting}>
            {starting ? "여는 중…" : "한 장 더 내리기 ☕"}
          </button>
        </div>
      </div>
    </div>
  );
}
