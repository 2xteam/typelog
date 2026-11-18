"use client";

import { CardFront } from "./NoteCard";
import type { NoteCardData } from "./view";

/**
 * 모은 카드 — 지갑처럼 겹쳐 쌓는다. 위에 겹친 카드는 **앞면 윗부분**(번호 · 유형 코드)만 보인다
 * (사용자 2026-11-18, 색이 카드마다 달라 앞면이 보일 때 목록이 화려하다).
 * 가장 최근 카드가 맨 앞(아래쪽, 다 보임). 누르면 그 카드의 상세로.
 */
export function Wallet({
  cards,
  current,
  onPick,
}: {
  cards: NoteCardData[];
  current?: string | null;
  onPick: (attemptId: string) => void;
}) {
  // 오래된 것 → 최근 순으로 쌓는다(최근이 맨 앞)
  const stack = [...cards].sort((a, b) => a.attemptNo - b.attemptNo);
  return (
    <div className="nt-wallet" style={{ "--n": stack.length } as React.CSSProperties}>
      {stack.map((c, i) => (
        <button
          key={c.attemptId}
          type="button"
          className="nt-wcard"
          data-current={c.attemptId === current ? "true" : undefined}
          style={{ "--i": i } as React.CSSProperties}
          onClick={() => onPick(c.attemptId)}
          aria-label={`${c.attemptNo}번째 카드 · ${c.code} ${c.typeName}`}
        >
          <div className="nc nc--static">
            <CardFront card={c} />
          </div>
        </button>
      ))}
    </div>
  );
}
