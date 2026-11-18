"use client";

import { useEffect, useRef, useState } from "react";
import { NoteCard } from "./NoteCard";
import type { NoteCardData } from "./view";

/**
 * 카드를 무대에 세운다 — 카드사가 새 카드를 공개하는 방식(레퍼런스: 어두운 무대 · 핀 조명 · 반사 바닥).
 *
 * - 처음 한 번: 조명이 켜지고 → 카드가 돌며 떠올라 바닥에 선다 → 반사광이 한 번 지나간다
 * - 오른쪽 → 왼쪽으로 밀면 뒷면(다시 밀면 앞면). 왼쪽 → 오른쪽으로 밀면 모은 카드(`onList`).
 *   뒷면에서 왼쪽 → 오른쪽은 먼저 앞면으로 돌아온다. 누르면 뒤집힌다
 * - 마우스면 카드가 커서 쪽으로 살짝 기운다
 * - 연출은 장식이다. 움직임 줄이기 설정이면 처음부터 서 있다
 */
export function Stage({
  card,
  reveal = false,
  onList,
  face: faceProp,
  onFace,
}: {
  card: NoteCardData;
  reveal?: boolean;
  onList?: () => void;
  face?: "front" | "back";
  onFace?: (f: "front" | "back") => void;
}) {
  const [faceState, setFaceState] = useState<"front" | "back">("front");
  const face = faceProp ?? faceState;
  const setFace = (f: "front" | "back") => {
    setFaceState(f);
    onFace?.(f);
  };
  /** 뒷면을 한 번이라도 봤나 — 물병은 처음 뒤집을 때 차오른다 */
  const [poured, setPoured] = useState(false);
  useEffect(() => {
    if (face === "back") setPoured(true);
  }, [face]);

  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; id: number; horiz: boolean | null } | null>(null);
  const rig = useRef<HTMLDivElement>(null);

  const onDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horiz: null };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (s && s.id === e.pointerId) {
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (s.horiz === null && Math.hypot(dx, dy) > 8) {
        s.horiz = Math.abs(dx) > Math.abs(dy);
        if (s.horiz) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      if (s.horiz) setDrag(Math.max(-90, Math.min(90, dx * 0.45)));
      return;
    }
    if (e.pointerType !== "mouse" || !rig.current) return;
    const r = rig.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: Math.max(-1, Math.min(1, py)) * -7, ry: Math.max(-1, Math.min(1, px)) * 9 });
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    setDrag(null);
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) < 8) {
      setFace(face === "front" ? "back" : "front");
      return;
    }
    if (!s.horiz) return;
    if (dx < -50) setFace(face === "front" ? "back" : "front");
    else if (dx > 50) {
      if (face === "back") setFace("front");
      else onList?.();
    }
  };

  const transform = `rotateX(${tilt.rx}deg) rotateY(${tilt.ry + (drag ?? 0)}deg)`;
  const glow = card.picks[0]?.color.hex ?? "#6b4a2a";

  return (
    <div
      className="nt-stage"
      data-reveal={reveal ? "true" : undefined}
      style={{ "--glow": glow } as React.CSSProperties}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        start.current = null;
        setDrag(null);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && !start.current) setTilt({ rx: 0, ry: 0 });
      }}
      role="group"
      aria-label={`러닝 노트 카드 ${face === "front" ? "앞면" : "뒷면"} — 누르거나 왼쪽으로 밀면 뒤집혀요`}
    >
      <div className="nt-spot" aria-hidden="true" />
      <div className="nt-floor" aria-hidden="true" />
      <div className="nt-pool" aria-hidden="true" />
      <div className="nt-lift">
        <div ref={rig} className="nt-rig" data-drag={drag !== null ? "true" : undefined} style={{ transform }}>
          <NoteCard card={card} face={face} pour={poured} />
        </div>
        <div className="nt-reflect" aria-hidden="true">
          <div className="nt-rig" style={{ transform }}>
            <NoteCard card={card} face={face} />
          </div>
        </div>
      </div>
    </div>
  );
}
