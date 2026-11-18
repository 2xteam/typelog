"use client";

import { memo, useId } from "react";
import { AXIS_EN, poleByCode, rgb, mix, ROAST, roastLevel, type AxisPick } from "./palette";
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

const GRAIN =
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
        {/* 레퍼런스(로스팅 단계 표): 굵은 선으로 이은 갈색 원 다섯 · 내 단계 자리에는 금속 메달 */}
        <ol>
          {ROAST.map((r, i) => (
            <li key={r} data-on={i === level} aria-current={i === level ? "step" : undefined}>
              {i === level ? <RoastMedal colors={card.picks.map((p) => p.color.hex)} /> : <i aria-hidden="true" />}
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
 * 내 단계 — 동그라미 자리에 들어가는 육각 메달(사용자 2026-11-18, 심플하게).
 * 스틸 판 한 장(은은한 금속 그라디언트) + 가는 안쪽 선 + 가운데 작은 「RUN」.
 * 리본은 카드 앞면과 같은 아이덴티티 컬러 그라디언트(내 4색).
 */
function RoastMedal({ colors }: { colors: string[] }) {
  const id = useId().replace(/:/g, "");
  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = ((k * 60 - 90) * Math.PI) / 180;
      return `${(20 + Math.cos(a) * r).toFixed(2)},${(25 + Math.sin(a) * r).toFixed(2)}`;
    }).join(" ");
  const stops = colors.length ? colors : ["#9aa2ab"];
  return (
    <svg className="nc-medal" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="0">
          {stops.map((c, k) => (
            <stop key={k} offset={stops.length > 1 ? k / (stops.length - 1) : 0} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9ecef" />
          <stop offset=".55" stopColor="#bcc3ca" />
          <stop offset="1" stopColor="#8d959d" />
        </linearGradient>
      </defs>
      <path d="M14.5 0 H25.5 L23 12 H17 Z" fill={`url(#r${id})`} />
      <polygon points={hex(13)} fill={`url(#s${id})`} className="nc-medal-plate" />
      <polygon points={hex(10.2)} className="nc-medal-line" />
      <text x="20" y="27.2" textAnchor="middle" className="nc-medal-t">
        RUN
      </text>
    </svg>
  );
}

/**
 * 러닝 물병 — 소프트 플라스크(사용자 2026-11-18). 하단은 단순하게 **육각형의 아랫부분**처럼:
 * 옆선이 내려와 양쪽에서 비스듬히 꺾여 평평한 바닥으로(날개 · 꼬리는 물고기 같아 걷었다).
 * 가장자리 안쪽 열접착 띠, 세로 「MY JANE」, 맺힌 물방울, 왼쪽 위 마개 고리.
 * 4축이 아래(누구와)부터 위(마음)로 층층이 찬다. 진한 축은 층이 두껍다.
 */
const FLASK =
  "M25 20.6 L35 20.6 C35.4 24 40.6 26.4 41.8 32 C42.6 40 42.4 70 42 98 L35.6 113.4 C35.3 114.2 34.7 114.6 33.8 114.6 L26.2 114.6 C25.3 114.6 24.7 114.2 24.4 113.4 L18 98 C17.6 70 17.4 40 18.2 32 C19.4 26.4 24.6 24 25 20.6 Z";
/** 열접착 띠 — 가장자리보다 안쪽으로 한 겹(옆선 · 비스듬한 모서리 · 바닥) */
const SEAM = "M20.6 34 C20.2 46 20.2 72 20.4 97.6 L26.4 111.8 L33.6 111.8 L39.6 97.6 C39.8 72 39.8 46 39.4 34";

function Bottle({ picks, pour }: { picks: AxisPick[]; pour?: boolean }) {
  const id = useId().replace(/:/g, "");
  const top = 30;
  const bottom = 114.6;
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
          <stop offset=".22" stopColor="#fff" stopOpacity=".1" />
          <stop offset=".7" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".08" />
        </linearGradient>
      </defs>
      {/* 마개 고리 — 왼쪽 위로 나온 끈 */}
      <path d="M24 12.6 C17.6 11.4 14.2 15.4 16 19.4 C17.2 22 20.6 22.2 23.2 20.4" className="nc-bottle-strap" />
      {/* 바이트 밸브 — 위가 좁아지는 꼭지, 가운데 틈 */}
      <path d="M27.6 10.4 L28.3 4.6 Q28.5 2.6 30 2.6 Q31.5 2.6 31.7 4.6 L32.4 10.4 Z" className="nc-bottle-valve" />
      <path d="M30 3.6 L30 6.2" className="nc-bottle-slit" />
      {/* 마개 — 홈이 파인 링 */}
      <rect x="23.2" y="10.2" width="13.6" height="5.6" rx="1.2" className="nc-bottle-cap" />
      <path d="M26 10.8 V15.2 M28.6 10.8 V15.2 M31.4 10.8 V15.2 M34 10.8 V15.2" className="nc-bottle-rib" />
      {/* 목 — 단단한 칼라 */}
      <rect x="24.6" y="15.6" width="10.8" height="5.4" rx="0.8" className="nc-bottle-neck" />
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
        <rect x="0" y="0" width="60" height="120" fill={`url(#g${id})`} />
        {/* 열접착 띠 · 세로 글자 · 빛 · 물방울 */}
        <path d={SEAM} className="nc-bottle-seam" />
        <text x="0" y="0" transform="translate(35.6 54) rotate(90)" className="nc-bottle-text">
          MY JANE
        </text>
        <path d="M22.4 38 C21.8 56 22 74 22.8 88" className="nc-bottle-shine" />
        <ellipse cx="25.2" cy="62" rx="0.9" ry="1.3" className="nc-bottle-drop" />
        <ellipse cx="33.6" cy="80" rx="0.7" ry="1" className="nc-bottle-drop" />
        <ellipse cx="28.4" cy="100" rx="1" ry="1.4" className="nc-bottle-drop" />
        <ellipse cx="36.2" cy="40" rx="0.6" ry="0.9" className="nc-bottle-drop" />
      </g>
      <path d={FLASK} className="nc-bottle-line" />
    </svg>
  );
}
