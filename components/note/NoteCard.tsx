"use client";

import { memo, useId } from "react";
import { AXIS_EN, poleByCode, rgb, mix, ROAST, roastLevel, type AxisPick, vividMix } from "./palette";
import { dotDate, lookOf, type NoteCardData } from "./view";
import { useMeshImage } from "./meshRaster";

/**
 * 러너 카드 — 정체성은 **커피 테이스팅 카드**, 보여 주는 방식만 카드사(→ NoteDeck.tsx).
 *
 * 앞면(레퍼런스: 원두 카드) — 메시 색 바탕 · 세리프 · 얇은 괘선 · 표. 여백 있게.
 * 뒷면(레퍼런스: 테이스팅 노트) — 물병에 4축이 층층이 차오른다 · 로스팅 포인트 · 커핑 노트.
 * 요약 · 팁 · 주의 같은 긴 문장은 카드에 넣지 않는다(카드 아래 페이지 글).
 *
 * 크기는 카드 너비 기준(cqw)이라 어디에 놓아도 비율이 같다.
 */

export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url%28%23n%29'/%3E%3C/svg%3E\")";

/** 두께 판의 깊이 — 앞(+0.5) ~ 뒤(-0.5) 사이를 고르게 */
/* 판이 많을수록 모바일에서 무겁다 — 셋이면 옆에서 봐도 꽉 차 보인다 */
const CORE = [-0.3, 0, 0.3];

export function NoteCard({
  card,
  face = "front",
  rot,
  pour = false,
  back = true,
}: {
  card: NoteCardData;
  face?: "front" | "back";
  /** 회전 각도(도) — 덱이 손가락을 따라 돌릴 때. 주면 `face` 대신 이 값으로 돈다 */
  rot?: number;
  /** 뒷면 물병이 차오르는 연출 — 뒷면을 처음 볼 때 */
  pour?: boolean;
  /** 뒷면을 그릴까 — 덱 목록의 카드는 앞면만 보이므로 안 그린다(모은 카드가 많을 때 가볍게) */
  back?: boolean;
}) {
  return (
    <div className="nc" data-face={rot === undefined ? face : undefined} style={rot === undefined ? undefined : { transform: `rotateY(${rot}deg)` }}>
      <CardFront card={card} />
      {back ? <CardBack card={card} pour={pour} /> : null}
      {/*
        두께 0.5mm(실물 카드 너비 54mm 기준) — 카드와 같은 둥근 판을 앞뒷면 사이에 겹쳐 쌓는다.
        옆면 두 장만 세우면 둥근 모서리가 비어 보였다(사용자 2026-11-18)
      */}
      {CORE.map((z) => (
        <i key={z} className="nc-core" style={{ transform: `translateZ(calc(var(--t, 0.93cqw) * ${z}))` }} aria-hidden="true" />
      ))}
    </div>
  );
}

/* 앞 · 뒷면은 카드가 같으면 다시 그리지 않는다 — 끄는 동안엔 각도만 바뀐다(모바일 끊김) */
/* 앞면 — 예전 디자인 그대로(섞임 배경 · 세리프 · 표, 사용자 2026-11-18). 색은 새 색표 */
export const CardFront = memo(function CardFront({ card }: { card: NoteCardData }) {
  const { theme, mesh } = lookOf(card);
  const meshImage = useMeshImage(mesh.image);
  const letters = card.code.split("");
  return (
    <div
      className="nc-face nc-front"
      data-loading={meshImage ? undefined : "true"}
      style={
        {
          "--ink": theme.ink,
          backgroundColor: mesh.base,
          // 메시는 한 번 그린 그림으로(meshRaster) — SVG 필터 그대로면 모바일에서 끊긴다. 입자도 그 안에 있다
          backgroundImage: meshImage ?? "none",
          backgroundSize: "100% 100%",
        } as React.CSSProperties
      }
    >
      {/* 배경 그림을 만드는 동안 — 빛이 지나가고 「블렌딩 중」(meshRaster 가 끝나면 사라진다) */}
      {meshImage ? null : (
        <div className="nc-loading" aria-hidden="true">
          <span>Blending…</span>
        </div>
      )}
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
});

export const CardBack = memo(function CardBack({ card, pour }: { card: NoteCardData; pour?: boolean }) {
  const { theme } = lookOf(card);
  const level = roastLevel(card.picks);
  return (
    <div
      className="nc-face nc-back"
      style={{ "--ink": theme.backInk, backgroundColor: theme.back, backgroundImage: GRAIN } as React.CSSProperties}
    >
      <header className="nc-bhead">
        <p className="nc-eyebrow">Running Note</p>
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
        {/* 레퍼런스(로스팅 단계 표): 굵은 선으로 이은 갈색 원 다섯 · 내 단계 자리에는 금속 메달 */}
        <ol>
          {ROAST.map((r, i) => (
            <li key={r} data-on={i === level} aria-current={i === level ? "step" : undefined}>
              {i === level ? <RoastMedal colors={[...card.picks].sort((a, b) => Number(b.strong) - Number(a.strong)).map((p) => p.color.hex)} /> : <i aria-hidden="true" />}
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
});

/**
 * 내 단계 — 동그라미 자리에 들어가는 육각 메달. 플랫하게(사용자 2026-11-18 — 입체 표현 빼고 심플):
 * 단색 리본 두 갈래(진하게 나온 색 먼저 — 연한 색은 바탕에 묻힌다) + 단색 육각판 + 가운데 작은 「RUN」. 그라데이션 · 테두리 · 그림자 없음.
 */
function RoastMedal({ colors }: { colors: string[] }) {
  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = ((k * 60 - 90) * Math.PI) / 180;
      return `${(20 + Math.cos(a) * r).toFixed(2)},${(25 + Math.sin(a) * r).toFixed(2)}`;
    }).join(" ");
  const c1 = colors[0] ?? "#9aa2ab";
  const c2 = colors[1] ?? c1;
  return (
    <svg className="nc-medal" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M14.5 0 H20 L20 12 H17 Z" fill={c1} />
      <path d="M20 0 H25.5 L23 12 H20 Z" fill={c2} />
      <polygon points={hex(13)} className="nc-medal-plate" />
      <text x="20" y="27.2" textAnchor="middle" className="nc-medal-t">
        RUN
      </text>
    </svg>
  );
}

/**
 * 러닝 물병 — 소프트 플라스크(레퍼런스 쉐입, 사용자 2026-11-18).
 * 투명한 원통형 캡 · 넓은 칼라 링 · 비스듬히 꺾인 어깨 · 위가 조금 넓고 아래로 살짝 좁아지는 긴 몸통 ·
 * 각진 어깨 · 작게만 둥근 모서리(사용자 2026-11-18 — 약간 각지게, 바닥 고리는 뺌). 세로 「MY JANE」.
 * 4축이 아래(누구와)부터 위(마음)로 층층이 찬다. 진한 축은 층이 두껍다.
 */
const FLASK =
  "M23 20 L37 20 L43.2 28.6 Q44 29.8 44 31.4 L42.8 108.6 Q42.7 113.2 38.6 113.2 L21.4 113.2 Q17.3 113.2 17.2 108.6 L16 31.4 Q16 29.8 16.8 28.6 Z";
/** 안쪽 가는 선 — 말랑한 몸통의 가장자리 두께 */
const SEAM = "M18.4 36 C18.3 50 18.8 80 19.6 103.6 C19.8 108.4 22 110.8 26.8 111 L33.2 111 C38 110.8 40.2 108.4 40.4 103.6 C41.2 80 41.7 50 41.6 36";

function Bottle({ picks, pour }: { picks: AxisPick[]; pour?: boolean }) {
  const id = useId().replace(/:/g, "");
  const top = 30;
  const bottom = 113.2;
  const full = (bottom - top) * 0.84;
  const weights = picks.map((p) => (p.strong ? 1 : 0.62));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  // 물 — 4색이 아래(누구와)부터 위(마음)로 그라데이션으로 이어져 찬다(사용자 2026-11-18). 층 두께만큼 그 색이 길다
  const surface = bottom - full;
  /*
    층마다 제 색이 꽉 차고, 이웃 층과의 경계만 좁게 그라데이션으로 넘어간다(사용자 2026-11-19 — 경계가 너무 넓었다).
    전에는 층 가운데끼리 이어서 층 전체가 섞이는 띠였다. 경계 띠 BAND(물 높이 단위)는 얇은 층의 40%를 넘지 않는다.
    경계 한가운데에는 맑은 중간색(vividMix) — 그냥 이으면 회색빛으로 탁해진다
  */
  const BAND = 3.6;
  const layers: { key: string; a: number; b: number; color: string }[] = [];
  let acc = 0;
  picks.forEach((p, i) => {
    const h = (weights[i] / sum) * full;
    layers.push({ key: p.id, a: acc, b: acc + h, color: p.color.hex });
    acc += h;
  });
  const smooth: { key: string; offset: number; color: string }[] = [];
  layers.forEach((l, i) => {
    const prev = layers[i - 1];
    const next = layers[i + 1];
    const half = (o?: typeof l) => (o ? Math.min(BAND, 0.4 * Math.min(l.b - l.a, o.b - o.a)) / 2 : 0);
    smooth.push({ key: `${l.key}-a`, offset: (l.a + half(prev)) / full, color: l.color });
    smooth.push({ key: `${l.key}-b`, offset: (l.b - half(next)) / full, color: l.color });
    if (next) smooth.push({ key: `${l.key}-m`, offset: l.b / full, color: vividMix(l.color, next.color, 0.5) });
  });
  /* 플랫 실루엣(사용자 2026-11-18) — 외곽선 · 그라데이션 · 반사광 · 물방울 · 안쪽 선 없이 면만.
     캡 · 칼라는 글자색 단색, 몸통은 옅은 면 위에 4색이 그라데이션으로 이어진 물 */
  return (
    <svg className="nc-bottle" viewBox="0 0 60 120" aria-hidden="true" data-pour={pour ? "true" : undefined}>
      <defs>
        <clipPath id={`b${id}`}>
          <path d={FLASK} />
        </clipPath>
        <linearGradient id={`w${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={bottom} x2="0" y2={surface}>
          {smooth.map((st) => (
            <stop key={st.key} offset={st.offset.toFixed(3)} stopColor={st.color} />
          ))}
        </linearGradient>
      </defs>
      <path d="M25.2 3.6 C25.2 2.6 26 2 27 2 L33 2 C34 2 34.8 2.6 34.8 3.6 L35.2 13.4 L24.8 13.4 Z" className="nc-bottle-solid nc-bottle-solid--soft" />
      <rect x="22" y="13" width="16" height="7.4" rx="1.6" className="nc-bottle-solid" />
      <g clipPath={`url(#b${id})`}>
        <rect x="0" y="0" width="60" height="120" className="nc-bottle-body" />
        <g className="nc-liquid">
          {/* 윗면은 잔잔한 물결 — 몸통 폭 안에서 두 번 출렁인다 */}
          <path
            d={`M10 ${surface + 0.6} Q13.5 ${surface - 0.3} 17 ${surface + 0.6} T24 ${surface + 0.6} T31 ${surface + 0.6} T38 ${surface + 0.6} T45 ${surface + 0.6} T52 ${surface + 0.6} L52 ${bottom + 1} L10 ${bottom + 1} Z`}
            fill={`url(#w${id})`}
            className="nc-layer"
            style={{ animationDelay: "0.25s" }}
          />
        </g>
        <text x="0" y="0" transform="translate(35.6 54) rotate(90)" className="nc-bottle-text">
          MY JANE
        </text>
      </g>
    </svg>
  );
}
