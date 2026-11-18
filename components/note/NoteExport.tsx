"use client";

import { useCallback, useRef, useState } from "react";
import { embedFontCSS } from "@/components/run/RunResult";
import { CardBack, CardFront } from "./NoteCard";
import { dotDate, type NoteCardData } from "./view";
import { noteFontVars } from "./fonts";

/**
 * 러닝 노트 이미지 — 화면 밖에 반듯하게(3D 없이) 그려 두고 찍는다(러닝 자격증과 같은 html-to-image 방식).
 *
 *   공유하기    지금 무대에 보이는 **카드 면 한 장만**(앞면이면 앞면, 뒷면이면 뒷면)
 *   이미지 저장 **앞면 · 뒷면을 양옆에** 놓은 전용 화면 — 어두운 무대 · 핀 조명 · 머리글(사용자 2026-11-18)
 *
 * 글꼴은 직접 골라 넣는다(`embedFontCSS`) — 라이브러리에 맡기면 다른 도메인 CSS 를 읽다 SecurityError.
 * 사파리는 첫 그림에 글꼴을 덜 불러오므로 두 번 그린다(러닝 자격증에서 겪은 것).
 */
const FONT_VARS = ["--nf-garamond", "--rf-serif", "--rf-sans"];

export function NoteExport({ card, face }: { card: NoteCardData; face: "front" | "back" }) {
  const box = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const render = useCallback(async (which: "single" | "spread") => {
    const node = box.current?.querySelector<HTMLElement>(which === "single" ? ".nx-single" : ".nx-spread");
    if (!node) throw new Error("이미지를 그릴 수 없어요.");
    const { toBlob } = await import("html-to-image");
    await document.fonts?.ready;
    setProgress(3);
    const fontEmbedCSS = await embedFontCSS(node, (k) => setProgress(3 + Math.round(k * 67)), FONT_VARS);
    setProgress(72);
    const opts = { pixelRatio: 2, fontEmbedCSS, backgroundColor: which === "single" ? undefined : "#07060b" };
    const ua = navigator.userAgent;
    if (/Safari/.test(ua) && !/Chrome|CriOS|Android/.test(ua)) {
      await toBlob(node, opts);
      setProgress(86);
    }
    const blob = await toBlob(node, opts);
    setProgress(100);
    if (!blob) throw new Error("이미지를 만들지 못했어요.");
    return blob;
  }, []);

  const name = `myjane-running-note-${card.code}-${String(card.attemptNo).padStart(2, "0")}`;

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await render("spread");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setMsg("✅ 앞면 · 뒷면을 한 장에 저장했어요.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const share = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await render("single");
      const file = new File([blob], `${name}-${face}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        // 바로 공유가 안 되는 브라우저(데스크톱 등) — 같은 그림을 내려받는다
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        setMsg("이 브라우저는 바로 공유가 안 돼서 카드 그림을 내려받았어요.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <>
      <div className="nt-ctrl nt-ctrl--export">
        <button type="button" className="nt-chip nt-chip--gold" onClick={() => void share()} disabled={busy}>
          📤 공유하기
        </button>
        <button type="button" className="nt-chip" onClick={() => void save()} disabled={busy}>
          ⬇ 이미지 저장 · 앞뒤 한 장
        </button>
      </div>
      {progress !== null ? (
        <div className="nt-progress" aria-label="이미지 만드는 중">
          <i style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {msg ? <p className="nt-hint">{msg}</p> : null}

      {/* 화면 밖 — 찍기용 */}
      <div ref={box} className={`nx ${noteFontVars}`} aria-hidden="true">
        <div className="nx-single">
          <div className="nx-card">{face === "front" ? <CardFront card={card} /> : <CardBack card={card} />}</div>
        </div>
        <div className="nx-spread">
          <div className="nx-spot" />
          <header className="nx-head">
            <p>
              <span>Running Note</span>
              <span>No. {String(card.attemptNo).padStart(2, "0")}</span>
            </p>
            <h2>
              <b>{card.code}</b> {card.typeName}
            </h2>
          </header>
          <div className="nx-pair">
            <figure>
              <div className="nx-card">
                <CardFront card={card} />
              </div>
              <figcaption>Front · 앞면</figcaption>
            </figure>
            <figure>
              <div className="nx-card">
                <CardBack card={card} />
              </div>
              <figcaption>Back · 뒷면</figcaption>
            </figure>
          </div>
          <footer className="nx-foot">
            <span>◆ Blended by MyJane · {dotDate(card.completedAt)}</span>
            <span>typelog.myjane.co.kr</span>
          </footer>
        </div>
      </div>
    </>
  );
}
