"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EYE_Y, FACE_H, FACE_OVAL, FACE_W, readImage } from "@/lib/runPhoto";

/**
 * ⑤ 사진 — 얼굴 사진 한 장을 골라 **틀에 맞춘다.**
 *
 * 타원 안에 얼굴, 가로선에 눈을 맞추면 결과 화면 세 곳(자격증 · 신문 · 딱지)에 같은
 * 좌표로 들어간다. 끌어서 옮기고, 아래 막대나 두 손가락으로 키운다.
 * 사진은 서버로 가지 않는다 → lib/runPhoto.ts
 */

const VIEW = 0.5; // 화면은 출력(600×720)의 절반 크기로 보여 준다
const VW = FACE_W * VIEW;
const VH = FACE_H * VIEW;

export function PhotoStep({
  onDone,
  onSkip,
}: {
  onDone: (blob: Blob) => void;
  onSkip: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  /** 사진 중심이 틀 중심에서 얼마나 떨어졌나(화면 px) · 배율(화면 px / 사진 px) */
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const drag = useRef<{ id: number; x: number; y: number }[]>([]);
  const pinch = useRef<{ d: number; s: number } | null>(null);

  const pick = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setMsg(null);
    try {
      const c = await readImage(file);
      setImg(c);
      setUrl(c.toDataURL("image/jpeg", 0.9));
      // 처음엔 틀을 꽉 채우게
      const cover = Math.max(VW / c.width, VH / c.height);
      setMinScale(cover * 0.5);
      setScale(cover);
      setPos({ x: 0, y: 0 });
    } catch {
      setMsg("이 사진은 열 수 없어요. 다른 사진을 골라 주세요.");
    }
  }, []);

  useEffect(() => () => setUrl(null), []);

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = [...drag.current.filter((p) => p.id !== e.pointerId), { id: e.pointerId, x: e.clientX, y: e.clientY }];
    if (drag.current.length === 2) {
      const [a, b] = drag.current;
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const i = drag.current.findIndex((p) => p.id === e.pointerId);
    if (i === -1) return;
    const prev = drag.current[i];
    drag.current[i] = { id: e.pointerId, x: e.clientX, y: e.clientY };
    if (drag.current.length === 2 && pinch.current) {
      const [a, b] = drag.current;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setScale(Math.max(minScale, pinch.current.s * (d / pinch.current.d)));
      return;
    }
    setPos((p) => ({ x: p.x + (e.clientX - prev.x), y: p.y + (e.clientY - prev.y) }));
  };
  const onUp = (e: React.PointerEvent) => {
    drag.current = drag.current.filter((p) => p.id !== e.pointerId);
    if (drag.current.length < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    setScale((s) => Math.max(minScale, s * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
  };

  const done = useCallback(async () => {
    if (!img) return;
    setBusy(true);
    const c = document.createElement("canvas");
    c.width = FACE_W;
    c.height = FACE_H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#d9d4cc";
    ctx.fillRect(0, 0, FACE_W, FACE_H);
    // 화면 좌표를 출력 좌표로 (화면은 출력의 VIEW 배)
    const k = scale / VIEW;
    ctx.translate(FACE_W / 2 + pos.x / VIEW, FACE_H / 2 + pos.y / VIEW);
    ctx.scale(k, k);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    c.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onDone(blob);
        else setMsg("사진을 만들지 못했어요. 다시 해 볼까요?");
      },
      "image/jpeg",
      0.88,
    );
  }, [img, pos, scale, onDone]);

  if (!img || !url) {
    return (
      <div className="run-photo-pick">
        <div className="run-photo-hero" aria-hidden="true">
          <svg viewBox="0 0 120 140">
            <ellipse cx="60" cy="62" rx="40" ry="50" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx="46" cy="58" r="4" fill="currentColor" />
            <circle cx="74" cy="58" r="4" fill="currentColor" />
            <path d="M46 82 q14 12 28 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <p className="run-sub">얼굴이 잘 보이는 사진이면 더 재밌어요. 본인 사진을 넣어 주세요.</p>
        <p className="run-fine">사진은 이 기기 안에서만 쓰고 서버로 보내지 않아요.</p>
        <div className="run-actions">
          <button type="button" className="run-btn run-btn--main" onClick={() => fileRef.current?.click()}>
            사진 고르기
          </button>
          <button type="button" className="run-btn" onClick={() => camRef.current?.click()}>
            지금 찍기
          </button>
          <button type="button" className="run-link" onClick={onSkip}>
            사진 없이 할게요
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        {msg ? <p className="run-msg">{msg}</p> : null}
      </div>
    );
  }

  const w = img.width * scale;
  const h = img.height * scale;
  return (
    <div className="run-photo-fit">
      <p className="run-sub">얼굴을 타원 안에, 눈을 가로선에 맞춰 주세요</p>
      <div
        className="run-fit-stage"
        style={{ width: VW, height: VH }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          draggable={false}
          style={{ width: w, height: h, left: VW / 2 + pos.x - w / 2, top: VH / 2 + pos.y - h / 2 }}
        />
        <svg className="run-fit-guide" viewBox={`0 0 ${FACE_W} ${FACE_H}`} aria-hidden="true">
          <defs>
            <mask id="fit-hole">
              <rect width={FACE_W} height={FACE_H} fill="#fff" />
              <ellipse cx={FACE_OVAL.cx} cy={FACE_OVAL.cy} rx={FACE_OVAL.rx} ry={FACE_OVAL.ry} fill="#000" />
            </mask>
          </defs>
          <rect width={FACE_W} height={FACE_H} fill="rgba(0,0,0,.55)" mask="url(#fit-hole)" />
          <ellipse cx={FACE_OVAL.cx} cy={FACE_OVAL.cy} rx={FACE_OVAL.rx} ry={FACE_OVAL.ry} fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="14 10" />
          <line x1={FACE_OVAL.cx - FACE_OVAL.rx + 20} x2={FACE_OVAL.cx + FACE_OVAL.rx - 20} y1={EYE_Y} y2={EYE_Y} stroke="#feda75" strokeWidth="4" />
          <text x={FACE_OVAL.cx} y={EYE_Y - 14} textAnchor="middle" fill="#feda75" fontSize="26" fontWeight="700">눈</text>
        </svg>
      </div>
      <input
        className="run-zoom"
        type="range"
        min={minScale}
        max={minScale * 8}
        step={minScale / 50}
        value={scale}
        onChange={(e) => setScale(Number(e.target.value))}
        aria-label="크기"
      />
      <div className="run-actions">
        <button type="button" className="run-btn run-btn--main" onClick={() => void done()} disabled={busy}>
          이 사진으로 할게요
        </button>
        <button type="button" className="run-link" onClick={() => { setImg(null); setUrl(null); }}>
          다른 사진 고르기
        </button>
      </div>
      {msg ? <p className="run-msg">{msg}</p> : null}
    </div>
  );
}
