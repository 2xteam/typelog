"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NoteCard } from "./NoteCard";
import type { NoteCardData } from "./view";

/**
 * 카드 덱 — 목록과 상세가 **한 무대**에 있다(사용자 2026-11-18).
 *
 *   목록  카드들이 좌우로 겹쳐 놓인 줄. 좌우로 넘겨 보고, 누르면 그 카드를 줄에서 **꺼내** 크게 세운다
 *   상세  오른쪽 → 왼쪽으로 밀면 카드가 손가락을 따라 돌아 **뒷면까지** 넘어간다(또 밀면 앞면)
 *         왼쪽 → 오른쪽으로 밀면 카드가 손가락을 따라 작아지며 **줄 안 제자리로 들어간다** → 목록
 *         (사용자 2026-11-18 방향 확정)
 *         누르면 뒤집힌다. 마우스면 커서 쪽으로 살짝 기운다
 *
 * 무대: 어두운 바탕 · 핀 조명 · 반사 바닥(카드사 공개 연출). 반사는 카드 자체에 붙여(-webkit-box-reflect)
 * 손가락을 늦지 않게 따라온다 — 전엔 반사용 복제 카드가 0.45초 늦게 따라왔다.
 * 처음 한 번(`reveal`): 조명이 켜지고 카드가 돌며 떠올라 선다 → 반사광. 움직임 줄이기면 처음부터 서 있다.
 */

type Mode = "list" | "detail";

export function NoteDeck({
  cards: input,
  initialId,
  start = "detail",
  reveal = false,
  allowList = true,
  onChange,
}: {
  cards: NoteCardData[];
  initialId?: string | null;
  start?: Mode;
  reveal?: boolean;
  /** 공유 화면처럼 한 장뿐이면 목록으로 들어가지 않는다 */
  allowList?: boolean;
  onChange?: (s: { mode: Mode; id: string }) => void;
}) {
  // 오래된 것 → 최근 순으로 왼쪽부터 놓는다
  const cards = useMemo(() => [...input].sort((a, b) => a.attemptNo - b.attemptNo), [input]);
  const initIdx = Math.max(0, initialId ? cards.findIndex((c) => c.attemptId === initialId) : cards.length - 1);

  const [mode, setMode] = useState<Mode>(allowList ? start : "detail");
  const [cur, setCur] = useState(initIdx);
  const [focus, setFocus] = useState(initIdx);
  const [rot, setRot] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [poured, setPoured] = useState<Record<string, boolean>>({});
  const [w, setW] = useState(360);
  const stage = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; id: number; horiz: boolean | null; focus0: number } | null>(null);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const card = cards[cur] ?? cards[0];
  const face = ((((rot / 180) % 2) + 2) % 2) === 1 ? "back" : "front";
  useEffect(() => {
    if (face === "back" && card) setPoured((p) => (p[card.attemptId] ? p : { ...p, [card.attemptId]: true }));
  }, [face, card]);
  useEffect(() => {
    if (card) onChange?.({ mode, id: card.attemptId });
  }, [mode, card, onChange]);

  // ── 크기 ──
  const cw = Math.min(280, w * 0.7);
  const ch = cw * 1.5873;
  const listScale = 0.56;
  const gap = cw * listScale * 0.64;

  // 상세에서 오른쪽(→)으로 민 만큼 — 0(상세) ~ 1(줄 안 제자리)
  const putBack = mode === "detail" && drag !== null && drag > 0 && allowList ? Math.min(1, drag / (cw * 0.9)) : 0;
  // 상세에서 왼쪽(←)으로 민 만큼의 회전 — 손가락 쪽으로 돈다(음수)
  const flipDeg = mode === "detail" && drag !== null && drag < 0 ? -Math.min(180, (-drag / cw) * 180) : 0;
  // 목록에서 넘기는 중의 가운데
  const center = mode === "list" ? focus : cur;

  const slot = (i: number) => {
    const d = i - center;
    const listX = d * gap;
    const listS = listScale * (1 - Math.min(0.24, Math.abs(d) * 0.07));
    const listRY = Math.max(-28, Math.min(28, -d * 9));
    if (mode === "list") return { x: listX, y: 0, s: listS, ry: listRY, op: Math.abs(d) > 3.5 ? 0 : 1, z: 100 - Math.round(Math.abs(d) * 10) };
    if (i === cur) {
      const t = putBack;
      return { x: listX * t, y: 0, s: 1 + (listS - 1) * t, ry: listRY * t, op: 1, z: 200 };
    }
    // 상세일 때 나머지는 줄째로 뒤로 물러나 어둡게 — 꺼낸 카드 뒤에 줄이 남아 있다
    const t = putBack;
    return { x: listX, y: ch * 0.06 * (1 - t), s: listS * (0.92 + 0.08 * t), ry: listRY, op: 0.28 + 0.72 * t, z: 100 - Math.round(Math.abs(d) * 10) };
  };

  // ── 손가락 ──
  const onDown = (e: React.PointerEvent) => {
    gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horiz: null, focus0: focus };
  };
  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (g && g.id === e.pointerId) {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (g.horiz === null && Math.hypot(dx, dy) > 8) {
        g.horiz = Math.abs(dx) > Math.abs(dy);
        if (g.horiz) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      if (!g.horiz) return;
      if (mode === "list") setFocus(Math.max(-0.4, Math.min(cards.length - 0.6, g.focus0 - dx / gap)));
      else setDrag(allowList || dx < 0 ? dx : dx * 0.25);
      return;
    }
    if (mode !== "detail" || e.pointerType !== "mouse" || !stage.current) return;
    const r = stage.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: py * -10, ry: px * 14 });
  };
  const end = (e: React.PointerEvent, cancelled = false) => {
    const g = gesture.current;
    gesture.current = null;
    const dx = g ? e.clientX - g.x : 0;
    const dy = g ? e.clientY - g.y : 0;
    const tap = !cancelled && g && Math.hypot(dx, dy) < 8;
    setDrag(null);
    if (!g || g.id !== e.pointerId) return;
    if (mode === "list") {
      if (tap) {
        // 누른 카드를 찾는다 — 가운데에서 떨어진 만큼
        const r = stage.current?.getBoundingClientRect();
        const off = r ? e.clientX - (r.left + r.width / 2) : 0;
        const i = Math.max(0, Math.min(cards.length - 1, Math.round(focus + off / gap)));
        open(i);
        return;
      }
      setFocus((f) => Math.max(0, Math.min(cards.length - 1, Math.round(f))));
      return;
    }
    if (tap) {
      setRot((v) => v - 180);
      return;
    }
    if (!g.horiz || cancelled) return;
    if (dx < -cw * 0.3) setRot((v) => v - 180);
    else if (dx > cw * 0.32 && allowList) toList();
  };

  const open = (i: number) => {
    setCur(i);
    setFocus(i);
    setRot(0);
    setMode("detail");
  };
  const toList = () => {
    setFocus(cur);
    setMode("list");
    setTilt({ rx: 0, ry: 0 });
  };

  const visible = cards.map((c, i) => ({ c, i })).filter(({ i }) => Math.abs(i - center) <= 4);
  const glow = card?.picks[0]?.color.hex ?? "#6b4a2a";

  return (
    <>
      <div
        ref={stage}
        className="nd"
        data-mode={mode}
        data-drag={drag !== null || gesture.current?.horiz ? "true" : undefined}
        data-reveal={reveal ? "true" : undefined}
        style={{ "--glow": glow, "--cw": `${cw}px`, height: ch + 150 } as React.CSSProperties}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => end(e)}
        onPointerCancel={(e) => end(e, true)}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && !gesture.current) setTilt({ rx: 0, ry: 0 });
        }}
        role="group"
        aria-label={
          mode === "list"
            ? `모은 러닝 노트 ${cards.length}장 — 좌우로 넘기고 누르면 꺼내요`
            : `러닝 노트 카드 ${face === "front" ? "앞면" : "뒷면"} — 왼쪽으로 밀면 뒤집히고 오른쪽으로 밀면 목록에 넣어요`
        }
      >
        <div className="nt-spot" aria-hidden="true" />
        <div className="nt-floor" aria-hidden="true" />
        <div className="nt-pool" aria-hidden="true" />
        {visible.map(({ c, i }) => {
          const p = slot(i);
          const isCur = i === cur && mode === "detail";
          const deg = isCur ? rot + flipDeg : 0;
          return (
            <div
              key={c.attemptId}
              className="nd-slot"
              data-cur={isCur ? "true" : undefined}
              style={{
                transform: `translateX(${p.x}px) translateY(${p.y}px) scale(${p.s})`,
                opacity: p.op,
                zIndex: p.z,
              }}
            >
              <div className="nd-rise">
                <div
                  className="nd-rig"
                  style={{
                    transform: `rotateY(${p.ry}deg)${isCur && drag === null ? ` rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` : ""}`,
                  }}
                >
                  <NoteCard card={c} rot={deg} pour={!!poured[c.attemptId]} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="nt-ctrl">
        {mode === "detail" ? (
          <>
            <button type="button" className="nt-chip" onClick={() => setRot((v) => v - 180)}>
              ↺ {face === "front" ? "뒷면 보기" : "앞면 보기"}
            </button>
            {allowList ? (
              <button type="button" className="nt-chip" onClick={toList}>
                ▤ 목록에 넣기 · {cards.length}장
              </button>
            ) : null}
          </>
        ) : (
          <button type="button" className="nt-chip" onClick={() => open(Math.round(focus))}>
            ⤴ 가운데 카드 꺼내기
          </button>
        )}
      </div>
      <p className="nt-hint">
        {mode === "detail"
          ? allowList
            ? "← 밀면 뒷면 · → 밀면 목록에 넣기"
            : "← 밀거나 누르면 뒷면이 보여요"
          : "← → 넘겨 보고, 누르면 꺼내요"}
      </p>
    </>
  );
}
