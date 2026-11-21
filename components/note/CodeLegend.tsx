"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lookOf, type NoteCardData } from "./view";
import { kitOf, type AxisDecl } from "./palette";
import { GRAIN } from "./NoteCard";
import { noteFontVars } from "./fonts";

/**
 * 코드 읽는 법(사용자 2026-11-21) — 「CLAR」 네 글자가 무슨 뜻인지. 화면에 늘 펼쳐 두지 않고,
 * 카드 아래 작은 버튼을 누르면 카드 뒷면 색의 노트가 떠오른다. 글자마다 축 이름 · 내 쪽(진하게) · 반대쪽(옅게) · 기운 정도.
 */
export function CodeLegend({ card, axes }: { card: NoteCardData; axes: AxisDecl[] }) {
  const [open, setOpen] = useState(false);
  const kit = kitOf(card.picks);
  const { theme } = lookOf(card);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const rows = card.picks.map((p) => {
    const ax = axes.find((a) => a.id === p.id);
    const other = ax ? (ax.left?.code === p.code ? ax.right : ax.left) : null;
    const otherNote = other ? kit.poles.find((x) => x.code === other.code)?.note ?? other.code : null;
    return { p, label: ax?.label ?? kit.axisEn[p.id] ?? p.id, other, otherNote };
  });

  return (
    <>
      <button type="button" className="ncl-open" onClick={() => setOpen(true)}>
        <b>{card.code}</b> 는 무슨 뜻? <span aria-hidden="true">›</span>
      </button>
      {open
        ? createPortal(
            <div className={`ncl-back ${noteFontVars}`} role="dialog" aria-modal="true" aria-label={`${card.code} 읽는 법`} onClick={() => setOpen(false)}>
              <div
                className="ncl"
                onClick={(e) => e.stopPropagation()}
                style={{ "--pb": theme.back, "--pi": theme.backInk, backgroundImage: GRAIN } as React.CSSProperties}
              >
                <header className="ncl-head">
                  <p>{kit.brand} · How to read</p>
                  <h2 aria-label={card.code}>
                    {card.code.split("").map((l, i) => (
                      <span key={i}>{l}</span>
                    ))}
                  </h2>
                  <p className="ncl-name">{card.typeName}</p>
                </header>
                <ol className="ncl-rows">
                  {rows.map(({ p, label, other, otherNote }) => (
                    <li key={p.id}>
                      <i className="ncl-letter" style={{ background: p.color.hex }}>
                        {p.code}
                      </i>
                      <div>
                        <p className="ncl-axis">{label}</p>
                        <p className="ncl-me">
                          <b>{p.pole}</b> <em>{p.note}</em>
                        </p>
                        {other ? (
                          <p className="ncl-other">
                            반대쪽 · {other.code} {other.label ?? ""} <em>{otherNote}</em>
                          </p>
                        ) : null}
                      </div>
                      <span className="ncl-pct">
                        {p.strong ? "진하게" : "은은하게"}
                        <small>{p.pct}%</small>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="ncl-foot">네 글자 중 하나씩 — 내가 더 기운 쪽의 첫 글자예요. 진하게 나온 축은 카드 색도 진해요.</p>
                <footer className="ncl-bfoot">
                  <span>◆ Blended by MyJane</span>
                  <button type="button" onClick={() => setOpen(false)}>
                    닫기
                  </button>
                </footer>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
