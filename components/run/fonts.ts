import {
  Black_Han_Sans,
  IBM_Plex_Mono,
  Nanum_Myeongjo,
  Nanum_Pen_Script,
  Noto_Sans_KR,
  Noto_Serif_KR,
  Old_Standard_TT,
  Rye,
  UnifrakturMaguntia,
} from "next/font/google";

/**
 * 러닝 기록 결과 화면의 글꼴 — **자체 호스팅**(next/font).
 *
 * 공유 이미지를 브라우저에서 그릴 때(html-to-image) 다른 도메인의 글꼴은 끼워 넣지
 * 못하는 경우가 있다. 같은 출처에서 내려가면 이미지에도 그대로 박힌다.
 * 한글 글꼴은 조각이 많아 미리 불러오지 않는다(preload: false).
 */
export const fBlackHan = Black_Han_Sans({ weight: "400", subsets: ["latin"], preload: false, variable: "--rf-blackhan" });
export const fMono = IBM_Plex_Mono({ weight: ["500", "700"], subsets: ["latin"], variable: "--rf-mono" });
export const fPen = Nanum_Pen_Script({ weight: "400", subsets: ["latin"], preload: false, variable: "--rf-pen" });
export const fSans = Noto_Sans_KR({ weight: ["500", "600", "700", "800", "900"], subsets: ["latin"], preload: false, variable: "--rf-sans" });
export const fSerif = Noto_Serif_KR({ weight: ["400", "600", "700", "900"], subsets: ["latin"], preload: false, variable: "--rf-serif" });
/** 도장 글씨 — 인장처럼 굵은 명조 */
export const fSeal = Nanum_Myeongjo({ weight: "800", subsets: ["latin"], preload: false, variable: "--rf-seal" });
export const fOld = Old_Standard_TT({ weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--rf-old" });
/** 현상수배 전단의 WANTED — 서부극 목판 활자(2026-11-17) */
export const fWestern = Rye({ weight: "400", subsets: ["latin"], preload: false, variable: "--rf-western" });
export const fBlack = UnifrakturMaguntia({ weight: "400", subsets: ["latin"], variable: "--rf-blackletter" });

export const runFontVars = [fBlackHan, fMono, fPen, fSans, fSerif, fOld, fBlack, fSeal, fWestern].map((f) => f.variable).join(" ");
