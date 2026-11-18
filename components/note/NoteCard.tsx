"use client";

import { useId } from "react";
import { AXIS_EN, poleByCode, rgb, mix, ROAST, roastLevel, type AxisPick } from "./palette";
import { dotDate, lookOf, type NoteCardData } from "./view";

/**
 * 러너 카드 — 정체성은 **커피 테이스팅 카드**, 보여 주는 방식만 카드사(→ NoteDeck.tsx).
 *
 * 앞면(레퍼런스: 원두 카드) — 메시 색 바탕 · 세리프 · 얇은 괘선 · 표. 여백 있게.
 * 뒷면(레퍼런스: 테이스팅 노트) — 물병에 4축이 층층이 차오른다 · 로스팅 포인트 · 커핑 노트.
 * 요약 · 팁 · 주의 같은 긴 문장은 카드에 넣지 않는다(카드 아래 페이지 글).
 *
 * 크기는 카드 너비 기준(cqw)이라 어디에 놓아도 비율이 같다.
 */

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** 두께 판의 깊이 — 앞(+0.5) ~ 뒤(-0.5) 사이를 고르게 */
const CORE = [-0.4, -0.27, -0.13, 0, 0.13, 0.27, 0.4];

export function NoteCard({
  card,
  face = "front",
  rot,
  pour = false,
}: {
  card: NoteCardData;
  face?: "front" | "back";
  /** 회전 각도(도) — 덱이 손가락을 따라 돌릴 때. 주면 `face` 대신 이 값으로 돈다 */
  rot?: number;
  /** 뒷면 물병이 차오르는 연출 — 뒷면을 처음 볼 때 */
  pour?: boolean;
}) {
  return (
    <div className="nc" data-face={rot === undefined ? face : undefined} style={rot === undefined ? undefined : { transform: `rotateY(${rot}deg)` }}>
      <CardFront card={card} />
      <CardBack card={card} pour={pour} />
      {/*
        두께 0.5mm(실물 카드 너비 54mm 기준) — 카드와 같은 둥근 판을 앞뒷면 사이에 겹쳐 쌓는다.
        옆면 두 장만 세우면 둥근 모서리가 비어 보였다(사용자 2026-11-18)
      */}
      {CORE.map((z) => (
        <i key={z} className="nc-core" style={{ transform: `translateZ(calc(var(--t) * ${z}))` }} aria-hidden="true" />
      ))}
    </div>
  );
}

export function CardFront({ card }: { card: NoteCardData }) {
  const { theme, mesh } = lookOf(card);
  const letters = card.code.split("");
  return (
    <div
      className="nc-face nc-front"
      style={
        {
          "--ink": theme.ink,
          backgroundColor: mesh.base,
          // 메시에 입자가 들어 있어 앞면엔 GRAIN 을 따로 깔지 않는다
          backgroundImage: mesh.image,
          backgroundSize: "100% 100%",
        } as React.CSSProperties
      }
    >
      {theme.scrim ? <div className="nc-scrim" style={{ background: theme.dark ? "#000" : "#fff", opacity: theme.scrim }} /> : null}
      <div className="nc-sheen" aria-hidden="true" />
      <header className="nc-top">
        <span>Running Note</span>
        <span>No. {String(card.attemptNo).padStart(2, "0")}</span>
      </header>
      <div className="nc-title">
        <p className="nc-code" aria-label={card.code}>
          {letters.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </p>
        <p className="nc-name">{card.typeName}</p>
        <p className="nc-notes">{card.picks.map((p) => poleByCode(p.code)?.note ?? p.code).join(" / ")}</p>
      </div>
      <dl className="nc-table">
        <div>
          <dt>Runner</dt>
          <dd>{card.runner}</dd>
        </div>
        {card.picks.map((p) => (
          <div key={p.id}>
            <dt>{AXIS_EN[p.id] ?? p.id}</dt>
            <dd>{p.pole}</dd>
          </div>
        ))}
      </dl>
      <footer className="nc-foot">
        <span>◆ Blended by MyJane</span>
        <span>{dotDate(card.completedAt)}</span>
      </footer>
    </div>
  );
}

export function CardBack({ card, pour }: { card: NoteCardData; pour?: boolean }) {
  const { theme } = lookOf(card);
  const level = roastLevel(card.picks);
  return (
    <div
      className="nc-face nc-back"
      style={{ "--ink": theme.ink, backgroundColor: theme.back, backgroundImage: GRAIN } as React.CSSProperties}
    >
      <header className="nc-bhead">
        <p className="nc-eyebrow">Running Note</p>
        <p className="nc-btitle">러닝 노트</p>
      </header>

      <section className="nc-blend">
        <Bottle picks={card.picks} pour={pour} />
        <ul>
          {[...card.picks].reverse().map((p) => (
            <li key={p.id}>
              <i style={{ background: p.color.hex }} aria-hidden="true" />
              <b>{p.pole}</b>
              <span>
                {p.color.ko} · {p.strong ? "진하게" : "은은하게"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="nc-roast">
        <p className="nc-label">Roast Point · 로스팅 포인트</p>
        <ol>
          {ROAST.map((r, i) => (
            <li key={r} data-on={i === level}>
              <i aria-hidden="true" />
              <span>{r}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="nc-cup">
        <p className="nc-label">Cupping Note · 커핑 노트</p>
        {card.strengths.map((s) => (
          <p key={s}># {s}</p>
        ))}
      </section>

      <footer className="nc-bfoot">
        <span>{card.goodWith.length ? `잘 맞는 블렌드 ${card.goodWith.join(" · ")}` : "Blended by MyJane"}</span>
        <b>{card.code}</b>
      </footer>
    </div>
  );
}

/**
 * 러닝 물병 — 실리콘 소프트 플라스크(레퍼런스: 러닝 조끼에 꽂는 접히는 물병).
 * 위에 바이트 밸브 · 링, 좁은 목, 아래로 갈수록 넓어지는 말랑한 몸통, 반투명 몸체, 옆 고리.
 * 4축이 아래(누구와)부터 위(마음)로 층층이 찬다. 진한 축은 층이 두껍다.
 */
const FLASK =
  "M25 19 L35 19 C35.6 23 41.5 26.5 42.5 33 C43.6 52 44.6 80 45.6 100 C46.2 112 42 116.6 33 116.8 L27 116.8 C18 116.6 13.8 112 14.4 100 C15.4 80 16.4 52 17.5 33 C18.5 26.5 24.4 23 25 19 Z";

function Bottle({ picks, pour }: { picks: AxisPick[]; pour?: boolean }) {
  const id = useId().replace(/:/g, "");
  const top = 30;
  const bottom = 116.8;
  const full = (bottom - top) * 0.84;
  const weights = picks.map((p) => (p.strong ? 1 : 0.62));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let y = bottom;
  const layers = picks.map((p, i) => {
    const h = (weights[i] / sum) * full;
    y -= h;
    const light = mix(rgb(p.color.hex), [255, 255, 255], 0.12).map(Math.round).join(",");
    return { key: p.id, y, h, fill: `rgb(${light})` };
  });
  return (
    <svg className="nc-bottle" viewBox="0 0 60 120" aria-hidden="true" data-pour={pour ? "true" : undefined}>
      <defs>
        <clipPath id={`b${id}`}>
          <path d={FLASK} />
        </clipPath>
        <linearGradient id={`g${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".18" stopColor="#fff" stopOpacity=".12" />
          <stop offset=".7" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".08" />
        </linearGradient>
      </defs>
      {/* 옆 고리 */}
      <path d="M36.5 15 C47 12 52 22 47.5 30 C45.5 33.5 43 34 42 33" className="nc-bottle-strap" />
      {/* 바이트 밸브 · 링 */}
      <rect x="26.5" y="2.5" width="7" height="7.5" rx="3.2" className="nc-bottle-valve" />
      <rect x="23.5" y="9.5" width="13" height="5" rx="1.6" className="nc-bottle-cap" />
      <rect x="24.5" y="14.2" width="11" height="5" rx="1" className="nc-bottle-neck" />
      <g clipPath={`url(#b${id})`}>
        <rect x="0" y="0" width="60" height="120" fill="rgba(255,255,255,.42)" />
        <g className="nc-liquid">
          {layers.map((l, i) => (
            <g key={l.key} style={{ animationDelay: `${0.25 + i * 0.28}s` }} className="nc-layer">
              <rect x="0" y={l.y} width="60" height={l.h + 0.6} fill={l.fill} />
              <path d={`M0 ${l.y + 0.6} Q15 ${l.y - 1.2} 30 ${l.y + 0.6} T60 ${l.y + 0.6}`} stroke="rgba(255,255,255,.45)" strokeWidth=".6" fill="none" />
            </g>
          ))}
        </g>
        {/* 말랑한 몸통의 주름 · 빛 */}
        <path d="M18.5 44 C25 46 35 46 41.5 44" className="nc-bottle-crease" />
        <path d="M17.8 70 C25 72.5 35 72.5 42.8 70" className="nc-bottle-crease" />
        <rect x="0" y="0" width="60" height="120" fill={`url(#g${id})`} />
        <path d="M20 36 C19.2 60 18.6 84 18.4 104" className="nc-bottle-shine" />
      </g>
      <path d={FLASK} className="nc-bottle-line" />
    </svg>
  );
}
