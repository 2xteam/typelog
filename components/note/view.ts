import type React from "react";
import { cardTheme, glowOn, lightestOf, meshCss, pickAxes, stageOf, type AxisDecl, type AxisPick, type CardTheme } from "./palette";

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

export type NoteLook = { theme: CardTheme; mesh: { image: string; base: string; fills: string[] } };

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
    // 카드 뒷면 커핑 노트는 글자만 — 맛평가 문장의 이모티콘은 카드 아래 판에서만 보인다
    strengths: (input.strengths ?? []).slice(0, 2).map(plain),
    goodWith: (input.goodWith ?? []).slice(0, 2),
  };
}

/**
 * 글자색은 메시에 쓴 색(중간색 포함) 전부에서 대비를 잰다.
 * 카드마다 결과가 고정이라 한 번만 계산한다 — 카드를 끄는 동안 손가락이 움직일 때마다(앞 · 뒤 · 반사 4번)
 * SVG 를 새로 만들어 모바일이 버벅였다(2026-11-18).
 */
const looks = new Map<string, NoteLook>();
export const lookOf = (c: NoteCardData): NoteLook => {
  const key = `${c.attemptId}|${c.picks.map((p) => p.color.hex).join(",")}`;
  const hit = looks.get(key);
  if (hit) return hit;
  const mesh = meshCss(c.picks, c.attemptId);
  const look = { theme: cardTheme(mesh.fills.length ? mesh.fills : c.picks.map((p) => p.color.hex), lightestOf(c.picks[0])), mesh };
  looks.set(key, look);
  return look;
};

/** 이모티콘 · 변형 문자를 걷고 공백을 정리한다 */
export const plain = (t: string) =>
  t.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}‍️]/gu, "").replace(/\s+/g, " ").trim();

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

/** 카드 무대 색 — 첫 번째 색에서 강조(밝게) · 바탕(어둡게)을 뽑는다(사용자 2026-11-19). 색이 없으면 기본 네이비 · 라임 */
export function shellStyle(pick: AxisPick | undefined): React.CSSProperties | undefined {
  if (!pick) return undefined;
  const st = stageOf(pick.color.hex);
  // 강조는 그 계열의 가장 옅은 색(이미 밝아 glowOn 은 대개 그대로 둔다) · 바탕은 고른 색을 어둡게
  return { "--nt-accent": glowOn(lightestOf(pick) ?? pick.color.hex), "--st-base": st.base, "--st-top": st.top, "--st-mid": st.mid } as React.CSSProperties;
}
