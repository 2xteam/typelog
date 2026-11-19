"use client";

import { useEffect, useState } from "react";
import { inkOn, POLES, type AxisPick } from "./palette";

/** 원판 자리 순서 — 같은 축은 i 와 i+4. C/P 누구와 · S/L 거리 · A/I 빈도 · F/R 마음 */
const WHEEL_ORDER = ["S", "C", "F", "I", "L", "P", "R", "A"];

/**
 * 이름 있는 색 원판(레퍼런스: 커피 향미 원판).
 *   안쪽 고리 — 8개 극(크루형 · 즐김형 …)
 *   바깥 고리 — 극마다 이름 있는 색 4개(테라코타 · 러스트 …)
 *
 * `spin`     생성 중 — 원판이 돌다 멈추고, 내 4색 칸에 불이 켜진다(`onDone`)
 * `identity` 결과 — 내 색이 어디 있는지만 비춘다. **고르는 기능은 없다**(사용자 2026-11-18,
 *            정해진 성향을 바꿀 수 없는 것처럼 아이덴티티 컬러도 바꾸지 않는다)
 */

const R0 = 28;
const R1 = 56;
const R2 = 100;

function sector(r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(r * Math.cos(t)).toFixed(2)} ${(r * Math.sin(t)).toFixed(2)}`;
  };
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

export function Wheel({
  picks,
  mode,
  onDone,
}: {
  picks: AxisPick[];
  mode: "spin" | "identity";
  onDone?: () => void;
}) {
  /** 0 돌기 · 1 불 켜짐 */
  const [lit, setLit] = useState(mode === "identity");
  useEffect(() => {
    if (mode !== "spin") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t1 = setTimeout(() => setLit(true), reduce ? 0 : 2300);
    const t2 = setTimeout(() => onDone?.(), reduce ? 400 : 3900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mode, onDone]);

  const mine = new Set(picks.map((p) => `${p.at.pole}:${p.at.shade}`));
  const myPoles = new Set(picks.map((p) => p.at.pole));
  const step = 360 / POLES.length;
  /*
    자리 — 한 축의 두 끝이 서로 마주 보게(4칸 떨어지게) 놓는다(사용자 2026-11-19 — 크루 ↔ 개인 · 즐김 ↔ 기록 · 중독 ↔ 간헐적이
    엇갈려 있었다). 그 안에서 색이 이웃끼리 이어지도록: 단거리(분홍) · 크루(주황) · 즐김(노랑) · 간헐적(회색) |
    장거리(라임) · 개인(청록) · 기록(파랑) · 중독(보라) → 다시 분홍. 회색만 노랑과 라임 사이에 끼인다
  */
  const slotOf = (code: string) => Math.max(0, WHEEL_ORDER.indexOf(code));
  const sub = step / 4;

  return (
    <svg className="nw" viewBox="-108 -108 216 216" data-mode={mode} data-lit={lit ? "true" : undefined} role="img" aria-label={`아이덴티티 컬러 — ${picks.map((p) => p.color.ko).join(" · ")}`}>
      <defs>
        <filter id="nw-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="nw-rot">
        {POLES.map((pole, i) => {
          const a0 = slotOf(pole.code) * step;
          const on = myPoles.has(i);
          const mid = a0 + step / 2;
          const flip = mid > 90 && mid < 270;
          return (
            <g key={pole.code} className="nw-pole" data-on={on ? "true" : undefined}>
              <path d={sector(R0, R1 - 1, a0 + 0.4, a0 + step - 0.4)} fill={pole.colors[0].hex} className="nw-pole-seg" />
              <text
                transform={flip ? `rotate(${mid + 180}) translate(0 ${(R0 + R1) / 2 + 2})` : `rotate(${mid}) translate(0 ${-(R0 + R1) / 2 + 2})`}
                className="nw-pole-label"
                fill={inkOn(pole.colors[0].hex)}
              >
                {pole.ko.replace("형", "")}
              </text>
              {pole.colors.map((c, j) => {
                const b0 = a0 + j * sub;
                const m = b0 + sub / 2;
                const left = m > 180;
                const key = `${i}:${j}`;
                const me = mine.has(key);
                // 내 색은 바깥으로 살짝 튀어나온다 — 원판에서 자리가 한눈에 보이게
                const t = ((m - 90) * Math.PI) / 180;
                const pop = me && lit ? `translate(${(Math.cos(t) * 6).toFixed(2)}px, ${(Math.sin(t) * 6).toFixed(2)}px)` : undefined;
                return (
                  <g key={c.en} className="nw-shade" data-on={me ? "true" : undefined} data-family={on ? "true" : undefined} style={{ transform: pop }}>
                    <path d={sector(R1, R2, b0 + 0.3, b0 + sub - 0.3)} fill={c.hex} filter={me && lit ? "url(#nw-glow)" : undefined} />
                    <text
                      transform={left ? `rotate(${m + 90}) translate(${-R2 + 5} 1.4)` : `rotate(${m - 90}) translate(${R1 + 5} 1.4)`}
                      textAnchor="start"
                      className="nw-shade-label"
                      fill={inkOn(c.hex)}
                    >
                      {c.ko}
                    </text>
                    {me ? (
                      <circle
                        className="nw-mark"
                        cx={(Math.cos(t) * (R2 + 6)).toFixed(2)}
                        cy={(Math.sin(t) * (R2 + 6)).toFixed(2)}
                        r="1.9"
                      />
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
      <circle r={R0 - 2} className="nw-hole" />
      <text className="nw-center" y="2">
        {lit ? picks.map((p) => p.code).join("") : "BLEND"}
      </text>
    </svg>
  );
}
