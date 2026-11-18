import { Cormorant_Garamond } from "next/font/google";
import { fSans, fSerif } from "@/components/run/fonts";

/**
 * 러닝 노트 글꼴 — 커피 카드의 고전 세리프(레퍼런스: 원두 카드 · 로스터리 카드).
 * 영문은 Cormorant Garamond, 한글은 러닝 자격증과 같은 Noto Serif KR(`--rf-serif`).
 * 자체 호스팅(next/font) — 나중에 이미지 저장을 붙여도 글꼴이 그대로 박힌다.
 */
export const fGaramond = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--nf-garamond",
});

export const noteFontVars = [fGaramond, fSerif, fSans].map((f) => f.variable).join(" ");
