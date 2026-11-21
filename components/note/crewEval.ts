import type { AxisDecl } from "./palette";

/**
 * 크루 평가(사용자 2026-11-21) — 크루 카드들의 코드로 축마다 어느 쪽이 많은지 세고, 재미있는 한 줄 진단을 붙인다.
 * 점수가 아니라 놀이 — 「누가 더 낫다」 가 아니라 「우리 크루는 이런 블렌드」.
 * 문장은 러닝 노트(C/P · L/S · A/I · R/F) 기준. 다른 노트면 축 이름만으로 담백하게.
 */
type Side = { code: string; label: string; n: number };
export type AxisEval = { id: string; label: string; left: Side; right: Side; leftPct: number; line: string };

const LINES: Record<string, [string, string, string]> = {
  // [왼쪽이 많을 때, 오른쪽이 많을 때, 반반]
  who: ["같이 뛰어야 힘나는 크루 — 단톡방 알림이 쉬지 않아요 💬", "따로 또 같이 — 각자 뛰고 인증만 모이는 크루 📸", "혼자도 같이도 OK — 번개도 개인런도 다 되는 크루 🤝"],
  dist: ["주말엔 장거리가 기본 — 하프 신청은 늘 단체로 🗺️", "짧고 굵게 — 인터벌 끝나면 다들 바닥에 누워요 ⚡", "장거리파와 스피드파가 반반 — 페이스 그룹 나누기 필수 🏁"],
  freq: ["비 와도 눈 와도 — 쉬는 날이 없는 중독 크루 🔥", "번개가 뜨면 모이는 크루 — 대신 모이면 화끈해요 🌙", "매일파와 번개파가 섞여 — 출석 체크가 제일 바빠요 📅"],
  mind: ["기록 단톡이 바쁜 크루 — 워치 화면 공유가 인사예요 ⏱️", "뛰고 나서 커피가 본론인 크루 — 오늘도 즐겁게 ☕", "기록파와 즐김파의 밸런스 — 대회도 브런치도 다 챙겨요 🥐"],
};
const TITLES: Record<string, string> = {
  C: "수다", P: "마이웨이", L: "장거리", S: "스피드", A: "중독", I: "번개", R: "기록", F: "즐김",
};

export function evalCrew(codes: string[], axes: AxisDecl[]) {
  const per: AxisEval[] = axes.map((a, k) => {
    const l = codes.filter((c) => c[k] === a.left?.code).length;
    const r = codes.length - l;
    const pct = codes.length ? Math.round((l / codes.length) * 100) : 50;
    const set = LINES[a.id];
    const line = set ? (Math.abs(pct - 50) <= 10 ? set[2] : pct > 50 ? set[0] : set[1]) : `${a.left?.label ?? a.left?.code} ${l} : ${r} ${a.right?.label ?? a.right?.code}`;
    return { id: a.id, label: a.label ?? a.id, left: { code: a.left?.code ?? "", label: a.left?.label ?? "", n: l }, right: { code: a.right?.code ?? "", label: a.right?.label ?? "", n: r }, leftPct: pct, line };
  });
  // 크루 이름 — 가장 한쪽으로 쏠린 두 축의 많은 쪽
  const lean = [...per].sort((x, y) => Math.abs(y.leftPct - 50) - Math.abs(x.leftPct - 50)).slice(0, 2);
  const words = lean.map((e) => TITLES[e.leftPct >= 50 ? e.left.code : e.right.code] ?? (e.leftPct >= 50 ? e.left.label : e.right.label));
  const title = codes.length < 2 ? "아직 혼자인 크루" : `${words.join(" · ")} 블렌드 크루`;
  return { per, title };
}

/**
 * 크루 대표 카드(사용자 2026-11-21) — 다수결이 아니라 **쌓인 크루원 결과 전부를 합산**한다.
 * 축마다 모든 크루원의 기운 값(pomp, 0=왼쪽 끝 · 100=오른쪽 끝)을 평균 → 평균이 50 미만이면 왼쪽 글자, 넘으면 오른쪽(딱 50이면 공유한 사람 쪽).
 * 평균이 끝에 가까울수록 진하게. 색 · 무늬 씨앗에 크루 수를 넣어 한 명 늘 때마다 대표 카드(와 크루 화면 색)가 다시 블렌딩된다.
 */
export function crewBlend(cards: { code: string; pomp: Record<string, number> }[], axes: AxisDecl[]) {
  const leader = cards[0];
  const pomp: Record<string, number> = {};
  let code = "";
  axes.forEach((a, k) => {
    const avg = cards.reduce((s, c) => s + (c.pomp[a.id] ?? 50), 0) / (cards.length || 1);
    const left = avg === 50 ? leader?.code[k] === a.left?.code : avg < 50;
    code += (left ? a.left?.code : a.right?.code) ?? "";
    // 색을 고르는 pickAxes 도 50 미만을 왼쪽으로 본다 — 딱 50이면 고른 쪽으로 살짝 민다
    pomp[a.id] = avg === 50 ? (left ? 49.9 : 50.1) : avg;
  });
  return { code, pomp };
}
