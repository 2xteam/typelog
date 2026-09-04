/**
 * 추천 연령을 화면에 쓸 한 줄로 만든다.
 *
 * 질문지가 늘어나면서 대상이 갈렸다 — 공룡·요정은 다섯 살도 되지만, 명품
 * 브랜드는 열세 살부터다. 목록에서 이걸 안 보여주면 아이가 자기와 안 맞는
 * 질문지를 붙잡고 있다가 무슨 말인지 몰라 그만둔다.
 *
 * `min`·`max` 는 둘 다 없을 수 있다 — 하나만 있는 경우까지 다 처리한다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

export type AgeRange = { min: number | null; max: number | null } | null | undefined;

/** 예: `6~12세` · `13세 이상` · `10세까지` · 범위가 없으면 `null` */
export function ageLabel(range: AgeRange): string | null {
  const min = typeof range?.min === "number" ? range.min : null;
  const max = typeof range?.max === "number" ? range.max : null;
  if (min !== null && max !== null) return `${min}~${max}세`;
  if (min !== null) return `${min}세 이상`;
  if (max !== null) return `${max}세까지`;
  return null;
}

/**
 * 목록을 거를 때 쓰는 묶음.
 *
 * 나이를 한 살씩 고르게 하지 않는다 — 아이가 자기 나이를 눌러 빈 목록을 보는
 * 일이 생긴다. 실제로 갈리는 지점(입학 전 · 초등 저학년 · 초등 고학년 · 중학생
 * 이상)으로 묶어 각 묶음에 반드시 몇 개는 남게 한다.
 */
export const AGE_BANDS = [
  { id: "all", label: "전체", from: null, to: null },
  { id: "pre", label: "학교 가기 전", from: 4, to: 6 },
  { id: "lower", label: "초등 저학년", from: 7, to: 9 },
  { id: "upper", label: "초등 고학년", from: 10, to: 12 },
  { id: "teen", label: "중학생 이상", from: 13, to: 19 },
] as const;

export type AgeBandId = (typeof AGE_BANDS)[number]["id"];

/**
 * 그 묶음의 나이대와 질문지의 추천 연령이 **겹치는가.**
 *
 * 겹침으로 본다. 포함으로 보면(`min >= from && max <= to`) 6~13세 질문지가
 * 어느 묶음에도 안 걸려 사라진다.
 */
export function inBand(range: AgeRange, bandId: AgeBandId): boolean {
  const band = AGE_BANDS.find((b) => b.id === bandId);
  if (!band || band.from === null || band.to === null) return true;
  const min = typeof range?.min === "number" ? range.min : 0;
  const max = typeof range?.max === "number" ? range.max : 99;
  return min <= band.to && max >= band.from;
}
