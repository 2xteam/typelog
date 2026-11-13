"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/record";

/**
 * ⑥ 생성 중 — 세 화면 공통 (2~3초, 탭하면 건너뜀).
 *
 * **결과를 미리 드러내지 않는다.** 셋 다 같은 연출이고, 갈림은 등장 효과부터다.
 *   1 기록 확인 중          — 숫자 시계가 0 에서 내 기록까지 돌아간다
 *   2 2만 5천 명과 비교 중   — 분포 곡선 위를 내 점이 달려가 자리에 멈춘다 · 상위 N%
 *   3 발급 중               — 인스타그램 그라디언트가 한 번 쓸고 번쩍
 *
 * 연출은 **장식일 뿐**이다. 끝내기 응답이 오면 결과로 간다 — 연출이 안 돌아도 결과는 같다.
 * `prefers-reduced-motion` 이면 바로 넘어간다.
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md 「생성 중 · 등장 효과」
 */

type FinishResult = { code: string; detail: { percentile: number | null; seconds: number } | null };

export function Generating({
  seconds,
  finish,
  onDone,
  onError,
}: {
  seconds: number;
  finish: () => Promise<FinishResult>;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [phase, setPhase] = useState(0);
  const [clock, setClock] = useState(0);
  const [pct, setPct] = useState<number | null>(null);
  const result = useRef<FinishResult | null>(null);
  const skip = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, skip.current || reduce ? 0 : ms));

    void (async () => {
      const req = finish().then(
        (r) => (result.current = r),
        (e: Error) => {
          throw e;
        },
      );
      try {
        // 1 — 숫자 시계
        const t0 = performance.now();
        const dur = 1000;
        await new Promise<void>((resolve) => {
          const tick = (t: number) => {
            const k = Math.min(1, (t - t0) / dur);
            setClock(Math.round(seconds * (1 - (1 - k) ** 3)));
            if (k < 1 && !skip.current && !reduce) requestAnimationFrame(tick);
            else {
              setClock(seconds);
              resolve();
            }
          };
          requestAnimationFrame(tick);
        });
        // 2 — 분포 위 내 자리 (응답이 와야 숫자를 안다)
        setPhase(1);
        const r = await req;
        const p = r.detail?.percentile ?? null;
        setPct(p);
        await wait(1300);
        // 3 — 번쩍
        setPhase(2);
        await wait(550);
        onDone();
      } catch (e) {
        onError((e as Error).message || "결과를 만들지 못했어요.");
      }
    })();
  }, [finish, onDone, onError, seconds]);

  /** 내 점의 자리 — 상위 % 를 곡선의 가로 위치로 (빠를수록 오른쪽) */
  const x = pct === null ? 50 : Math.max(4, Math.min(96, 100 - pct));

  return (
    <div className="run-gen" data-phase={phase} onClick={() => (skip.current = true)} role="status" aria-live="polite">
      <p className="run-gen-step">
        {phase === 0 ? "기록 확인 중" : phase === 1 ? "2만 5천 명의 기록과 비교 중" : "발급 중"}
      </p>
      <p className="run-gen-clock">{formatClock(clock)}</p>

      <svg className="run-gen-curve" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="gen-ig" x1="0" x2="1">
            <stop offset="0" stopColor="#4f5bd5" />
            <stop offset=".35" stopColor="#962fbf" />
            <stop offset=".7" stopColor="#d62976" />
            <stop offset="1" stopColor="#fa7e1e" />
          </linearGradient>
        </defs>
        <path d="M0 40 C 18 40 30 4 50 4 C 70 4 82 40 100 40 Z" fill="url(#gen-ig)" opacity=".25" />
        <path d="M0 40 C 18 40 30 4 50 4 C 70 4 82 40 100 40" fill="none" stroke="url(#gen-ig)" strokeWidth=".8" />
        {phase >= 1 ? <line className="run-gen-mark" x1={x} x2={x} y1="0" y2="40" /> : null}
      </svg>
      {phase >= 1 ? <span className="run-gen-dot" style={{ left: `${x}%` }} /> : null}

      <p className="run-gen-pct">
        {phase >= 1 ? (pct === null ? "완주가 곧 기록이에요" : pct <= 0.5 ? "상위 0.5% 이내" : `상위 ${pct}%`) : " "}
      </p>
      <div className="run-gen-flash" aria-hidden="true" />
      <p className="run-fine">누르면 바로 넘어가요</p>
    </div>
  );
}
