"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * 버튼 · 만드는 중 화면 · 안내 문구는 러닝 자격증(`RunResult.tsx`)과 같은 틀이다(사용자 2026-11-18) —
 * 큰 「공유하기」, 그 아래 「이미지 저장」, 만드는 동안 가운데 카드(진행률 · 글꼴 담는 중 → 그리는 중).
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
    const opts = { pixelRatio: 2, fontEmbedCSS, backgroundColor: which === "single" ? undefined : "#0b0b24" };
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
      setMsg("✅ 이미지를 저장했어요. 인스타그램에 올려 보세요 📲");
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
        setMsg(null);
      } else {
        setMsg("이 브라우저는 바로 공유가 안 돼요. 휴대폰 브라우저에서 열어 공유해 주세요.");
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
      <div className="nt-actions">
        <button type="button" className="nt-btn nt-btn--main" disabled={busy} onClick={() => void share()}>
          공유하기
        </button>
        <button type="button" className="nt-btn nt-btn--ghost" disabled={busy} onClick={() => void save()}>
          이미지 저장
        </button>
      </div>
      {msg ? <p className="nt-msg">{msg}</p> : null}
      {/* 만드는 중 — 덱 카드(z-index 200)보다 위에 오도록 body 에 띄운다 */}
      {progress !== null
        ? createPortal(
            <div className="nt-making" role="status" aria-live="polite">
              <div className="nt-making-card">
                <p className="nt-making-t">🎨 이미지를 만드는 중이에요</p>
                <div className="nt-making-bar" aria-hidden="true">
                  <i style={{ width: `${progress}%` }} />
                </div>
                <p className="nt-making-n">
                  {progress}% · {progress < 70 ? "글꼴을 담는 중" : progress < 100 ? "그리는 중" : "거의 다 됐어요"}
                </p>
                <p className="nt-making-sub">보통 2~5초 걸려요. 휴대폰에서는 조금 더 걸릴 수 있어요.</p>
              </div>
            </div>,
            document.body,
          )
        : null}

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
