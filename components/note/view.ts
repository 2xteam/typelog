import { cardTheme, meshCss, pickAxes, type AxisDecl, type AxisPick, type CardTheme } from "./palette";

/**
 * 카드 한 장에 필요한 것 — 결과 화면 · 모은 카드 · 공유 화면이 모두 이걸로 그린다.
 * 문장(요약 · 팁)은 카드에 다 들어가지 않아 카드 아래 페이지 글로 뺐다.
 */
export type NoteCardData = {
  attemptId: string;
  attemptNo: number;
  code: string;
  /** 유형 이름 「앞에서 끌고 가는 페이서」 */
  typeName: string;
  completedAt: string | null;
  /** 카드에 적힐 러너 이름 */
  runner: string;
  picks: AxisPick[];
  /** 커핑 노트 — 강점 두 줄 */
  strengths: string[];
  /** 잘 맞는 블렌드(코드) */
  goodWith: string[];
};

export type NoteLook = { theme: CardTheme; mesh: { image: string; base: string } };

export function buildCard(input: {
  attemptId: string;
  attemptNo: number;
  code: string;
  typeName: string;
  completedAt: string | null;
  runner: string;
  axes: AxisDecl[];
  pomp: Record<string, number>;
  strengths?: string[] | null;
  goodWith?: string[] | null;
}): NoteCardData {
  return {
    attemptId: input.attemptId,
    attemptNo: input.attemptNo,
    code: input.code,
    typeName: input.typeName,
    completedAt: input.completedAt,
    runner: input.runner,
    picks: pickAxes(input.axes, input.pomp, input.attemptId),
    strengths: (input.strengths ?? []).slice(0, 2),
    goodWith: (input.goodWith ?? []).slice(0, 2),
  };
}

export const lookOf = (c: NoteCardData): NoteLook => ({
  theme: cardTheme(c.picks.map((p) => p.color.hex)),
  mesh: meshCss(c.picks, c.attemptId),
});

/** 「2026.11.18」 — 한국 시각 */
export function dotDate(iso: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const k = new Date(d.getTime() + 9 * 3600e3);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}.${p(k.getUTCMonth() + 1)}.${p(k.getUTCDate())}`;
}

/** 결과 API 의 outcomes(축마다 pomp · left · right) → 축 선언 + pomp 표 */
export function splitOutcomes(outcomes: { id: string; label?: string | null; pomp: number; left: AxisDecl["left"]; right: AxisDecl["right"] }[]) {
  const axes: AxisDecl[] = outcomes.map((o) => ({ id: o.id, label: o.label, left: o.left, right: o.right }));
  const pomp = Object.fromEntries(outcomes.map((o) => [o.id, o.pomp]));
  return { axes, pomp };
}
