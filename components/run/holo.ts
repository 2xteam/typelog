/**
 * 자격증 홀로그램 무늬 — 결과를 받은 사람이 고른다(사용자 2026-11-14).
 *
 * 무늬는 **마스크**로만 쓴다(검은 곳 = 무지개가 비치는 곳). 큰 문양 하나 + 카드 전체에 깔리는 잔무늬.
 * 고른 값은 `attempts.custom.holo` 에 저장 → 결과 링크 · 저장 이미지에도 같은 무늬.
 * 서버(PATCH 검증)도 이 파일의 `HOLO_IDS` 를 쓴다 — "use client" 를 붙이지 않는다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md 「공유 사진」 아래 「홀로그램」
 */

export const HOLO_IDS = ["rosette", "track", "laurel", "prints", "seal"] as const;
export type HoloId = (typeof HOLO_IDS)[number];
export const DEFAULT_HOLO: HoloId = "rosette";

export const HOLO_LABEL: Record<HoloId, string> = {
  rosette: "🌸 꽃무늬",
  track: "🏟️ 트랙",
  laurel: "🏅 월계관",
  prints: "👟 발자국",
  seal: "🔏 글씨 도장",
};

export function isHolo(v: unknown): v is HoloId {
  return typeof v === "string" && (HOLO_IDS as readonly string[]).includes(v);
}

const f = (n: number) => n.toFixed(1);
const S = (vb: string, body: string, extra = "") =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}' fill='none' stroke='black' ${extra}>${body}</svg>`;
const uri = (svg: string) =>
  `url("data:image/svg+xml;utf8,${svg.replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/"/g, "'")}")`;

/* ── 잔무늬 ── */
const WAVES = S("0 0 140 22", "<path d='M0 11 C 23 1 47 1 70 11 S 117 21 140 11' stroke-width='1'/>", "stroke-opacity='.55'");
const HATCH = S("0 0 36 36", "<path d='M0 36 L36 0' stroke-width='.8'/>", "stroke-opacity='.5'");
const MICRO = S(
  "0 0 230 26",
  "<text x='0' y='17' font-family='Arial' font-size='11' font-weight='700' letter-spacing='2' fill='black' stroke='none' fill-opacity='.55'>MYJANE RUNNING ·</text>",
);

/* ── 큰 문양 ── */
const ROSETTE = S(
  "0 0 400 400",
  Array.from(
    { length: 18 },
    (_, i) =>
      `<circle cx='${f(200 + 70 * Math.cos((i * Math.PI) / 9))}' cy='${f(200 + 70 * Math.sin((i * Math.PI) / 9))}' r='110' stroke-width='1.6'/>`,
  ).join("") +
    "<circle cx='200' cy='200' r='186' stroke-width='3.4'/><circle cx='200' cy='200' r='194' stroke-width='1.2'/><circle cx='200' cy='200' r='34' stroke-width='2.4'/>",
);

const TRACK = S(
  "0 0 560 330",
  Array.from({ length: 6 }, (_, i) => {
    const p = 8 + i * 15;
    return `<rect x='${p}' y='${p}' width='${560 - 2 * p}' height='${330 - 2 * p}' rx='${157 - i * 15}' stroke-width='3'/>`;
  }).join("") +
    "<path d='M280 5 V 90' stroke-width='3'/><path d='M268 5 V 90' stroke-width='1.2'/>" +
    "<text x='280' y='186' font-family='Arial Black, Arial' font-weight='900' font-size='72' text-anchor='middle' stroke-width='2.6'>RUN</text>",
);

function star(cx: number, cy: number, R: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r : R;
    return `${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`;
  }).join(" ");
}
const LAUREL = (() => {
  let s = "";
  for (const side of [-1, 1]) {
    for (let k = 0; k < 11; k++) {
      const th = ((100 + k * 14) * Math.PI) / 180;
      let x = 200 + 145 * Math.cos(th);
      const y = 205 + 145 * Math.sin(th);
      let rot = (th * 180) / Math.PI + 125;
      if (side === 1) {
        x = 400 - x;
        rot = 180 - rot;
      }
      s += `<ellipse cx='${f(x)}' cy='${f(y)}' rx='27' ry='11' transform='rotate(${f(rot)} ${f(x)} ${f(y)})' stroke-width='2.6' fill='black' fill-opacity='.4'/>`;
    }
  }
  s += "<path d='M115 330 Q200 395 285 330' stroke-width='2'/>";
  s += `<polygon points='${star(200, 200, 70, 28)}' stroke-width='3.2' fill='black' fill-opacity='.3'/><circle cx='200' cy='200' r='92' stroke-width='2'/>`;
  return S("0 0 400 400", s);
})();

const PRINTS = (() => {
  let s = "";
  const A = [60, 600];
  const B = [960, 60];
  const N = 8;
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const off = (i % 2 ? 1 : -1) * 26;
    const x = A[0] + (B[0] - A[0]) * t - Math.sin(ang) * off;
    const y = A[1] + (B[1] - A[1]) * t + Math.cos(ang) * off;
    const deg = (ang * 180) / Math.PI + 90;
    s +=
      `<g transform='translate(${f(x)} ${f(y)}) rotate(${f(deg)}) scale(1.45)'>` +
      "<path d='M0 -40 C 16 -40 20 -18 18 -4 C 16 8 10 10 0 10 C -10 10 -16 8 -18 -4 C -20 -18 -16 -40 0 -40 Z' stroke-width='1.8' fill='black' fill-opacity='.4'/>" +
      "<path d='M-12 -28 H12 M-15 -18 H15 M-15 -8 H15 M-12 2 H12' stroke-width='1'/>" +
      "<ellipse cx='0' cy='26' rx='12' ry='13' stroke-width='2.2' fill='black' fill-opacity='.4'/></g>";
  }
  return S("0 0 1000 620", s);
})();

const SEAL = S(
  "0 0 400 400",
  "<defs><path id='c' d='M200,200 m-152,0 a152,152 0 1,1 304,0 a152,152 0 1,1 -304,0'/></defs>" +
    "<circle cx='200' cy='200' r='178' stroke-width='2.6'/><circle cx='200' cy='200' r='126' stroke-width='1.4'/>" +
    "<text font-family='Arial' font-weight='700' font-size='26' letter-spacing='5' fill='black' stroke='none'><textPath href='#c'>MYJANE · RUNNING LICENSE · MYJANE · RUNNING LICENSE ·</textPath></text>" +
    "<text x='200' y='232' font-family='Arial Black, Arial' font-weight='900' font-size='92' text-anchor='middle' stroke-width='1.8'>RUN</text>",
);

/** `mask` 단축 속성 값 — 카드(1000×620) 기준 위치 · 크기 */
export const HOLO_MASK: Record<HoloId, string> = {
  rosette: `${uri(ROSETTE)} 250px 210px / 380px 380px no-repeat, ${uri(WAVES)} 0 0 / 140px 22px repeat`,
  track: `${uri(TRACK)} 230px 230px / 560px 330px no-repeat, ${uri(HATCH)} 0 0 / 36px 36px repeat`,
  laurel: `${uri(LAUREL)} 250px 200px / 390px 390px no-repeat, ${uri(WAVES)} 0 0 / 140px 22px repeat`,
  prints: `${uri(PRINTS)} 0 0 / 1000px 620px no-repeat, ${uri(WAVES)} 0 0 / 140px 22px repeat`,
  seal: `${uri(SEAL)} 250px 210px / 380px 380px no-repeat, ${uri(MICRO)} 0 0 / 230px 26px repeat`,
};
