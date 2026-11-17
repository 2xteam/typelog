"use client";

import { formatPrime } from "@/lib/record";
import { dateDot, distLabel, pacePrime, serial, type RunView } from "./view";

/**
 * 현상수배 전단 — 말도 안 되게 빠르거나 느린 기록의 맨 위 그림(사용자 2026-11-17).
 * 등급(자격증)은 그대로 받고, 이건 이벤트로 붙는 한 장이다. 판정은 lib/record.ts wantedFor.
 *
 * 모양은 서부극 현상수배 전단의 일반 양식(낡은 종이 · 큰 WANTED · 사진 · 현상금)만 따른다.
 * 특정 만화 · 영화의 로고 · 문구 · 캐릭터는 쓰지 않는다. 발행은 가상의 「마이재인 러닝 단속반」.
 * 놀리되 깎아내리지 않는다 — 느림은 「끝까지 갔다」로 끝낸다. 빠름에는 심장 신호 문구를 둔다.
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md 「처방전 · 현상수배」
 */

export type WantedMode = "fast" | "slow";

/** 결과 화면 요약 문장 — 결과 타입의 문장 대신 쓴다 */
export const WANTED_SUMMARY: Record<WantedMode, string> = {
  fast: "🚨 말도 안 되게 빨라서 현상수배됐어요! 단속 카메라 셔터보다 빨랐대요 📸💨 자격증은 그대로 드려요 🏅",
  slow: "🚨 말도 안 되게 느려서 현상수배됐어요! 뒤에 러너들이 줄을 섰대요 🐌 그래도 끝까지 간 기록이라 자격증은 그대로 드려요 🏅",
};

const COPY: Record<WantedMode, { en: string; big: string; crime: string; body: (s: string) => string; notice: string; foot: string }> = {
  fast: {
    en: "FOR RUNNING TOO FAST",
    big: "말도 안 되게 빠름",
    crime: "러닝 질서 교란 혐의",
    body: (s) => `${s} 단속 카메라 셔터보다 빨라 사진이 흐리게 나왔다. 바람이 지나간 줄 알았다는 목격담이 잇따르고 있다.`,
    notice: "목격하면 박수로 신고해 주세요 · 쫓아가지 마세요(못 잡아요)",
    foot: "🫀 빠를수록 심장도 신호를 보내요. 두근거림 · 어지러움이 있으면 바로 멈추세요.",
  },
  slow: {
    en: "FOR RUNNING TOO SLOW",
    big: "말도 안 되게 느림",
    crime: "러닝 흐름 방해 혐의",
    body: (s) => `${s} 뒤따르던 러너들이 줄을 섰고, 산책하던 강아지가 먼저 결승선에 들어갔다. 그래도 끝까지 갔다는 제보가 가장 많다.`,
    notice: "목격하면 응원으로 신고해 주세요 · 체포 대신 물 한 컵",
    foot: "🐢 천천히 가도 완주는 완주예요. 끝까지 간 것도 기록이에요 👏",
  },
};

const won = (n: number) => n.toLocaleString("en-US");

export function Wanted({ v, mode }: { v: RunView; mode: WantedMode }) {
  const d = v.detail;
  const c = COPY[mode];
  const place = v.race?.trim() ? `${v.race.trim()}에서` : "동네 공원 일대에서";
  const what = `${place} ${distLabel(d)}를 ${formatPrime(d.seconds)}에 통과. 1km당 ${pacePrime(d.paceSec)}, 시속 ${d.kmh}km.`;
  // 현상금 — 재미로. 빠르면 시속에 비례해 크게, 느리면 국밥 값
  const bounty = mode === "fast" ? `₩ ${won(Math.round(d.kmh * 10) * 10_000_000)}` : "₩ 9,000";
  const bountyNote = mode === "fast" ? "단속반 1년 치 국밥값" : "국밥 한 그릇 값";
  const brand = v.issuer?.trim() || "마이재인";

  return (
    <div className="rw-poster" data-mode={mode}>
      <div className="rw-in">
        <p className="rw-top">★ {brand} 러닝 단속반 ★</p>
        <p className="rw-wanted">WANTED</p>
        <p className="rw-en">— {c.en} —</p>
        <div className="rw-photo">
          {v.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.photo} alt="" />
          ) : (
            <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <circle cx="150" cy="118" r="62" fill="#7a5a36" opacity=".35" />
              <path d="M38 300 C38 214 86 182 150 182 C214 182 262 214 262 300 Z" fill="#7a5a36" opacity=".35" />
            </svg>
          )}
          <span className="rw-stamp">{mode === "fast" ? "TOO FAST" : "TOO SLOW"}</span>
        </div>
        <p className="rw-big">{c.big}</p>
        <p className="rw-crime">{c.crime}</p>
        <p className="rw-name">{v.name}</p>
        <p className="rw-bounty">
          <span className="rw-bounty-l">현상금</span> {bounty}
        </p>
        <p className="rw-bounty-n">({bountyNote})</p>
        <p className="rw-body">{c.body(what)}</p>
        <p className="rw-notice">🚨 {c.notice}</p>
        <div className="rw-foot">
          <span>
            수배번호 W-{v.completedAt.getFullYear()}-{serial(v, 4)} · {dateDot(v.completedAt)}
          </span>
          <span className="rw-seal">
            {brand}
            <br />
            단속반
          </span>
        </div>
        <p className="rw-heart">{c.foot}</p>
      </div>
    </div>
  );
}
