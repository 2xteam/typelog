import localFont from "next/font/local";

/**
 * 러닝 기록 결과 화면의 글꼴.
 *
 * 공유 이미지를 브라우저에서 그릴 때(html-to-image) 다른 도메인의 글꼴은 끼워 넣지
 * 못하는 경우가 있다. 같은 출처에서 내려가면 이미지에도 그대로 박힌다.
 * 글꼴은 저장소에 포함해 빌드 때 외부 Google Fonts에 접속하지 않는다.
 * 이전에는 next/font/google을 사용해 네트워크 응답이나 로컬 캐시에 따라
 * production build가 실패할 수 있었다.
 */
export const fBlackHan = localFont({ src: "../../assets/fonts/BlackHanSans-Regular.ttf", weight: "400", variable: "--rf-blackhan" });
export const fMono = localFont({
  src: [
    { path: "../../assets/fonts/IBMPlexMono-Medium.ttf", weight: "500" },
    { path: "../../assets/fonts/IBMPlexMono-Bold.ttf", weight: "700" },
  ],
  variable: "--rf-mono",
});
export const fPen = localFont({ src: "../../assets/fonts/NanumPenScript-Regular.ttf", weight: "400", variable: "--rf-pen" });
export const fSans = localFont({ src: "../../assets/fonts/NotoSansKR-VF.ttf", weight: "100 900", variable: "--rf-sans" });
export const fSerif = localFont({ src: "../../assets/fonts/NotoSerifKR-VF.ttf", weight: "100 900", variable: "--rf-serif" });
/** 도장 글씨 — 인장처럼 굵은 명조 */
export const fSeal = localFont({ src: "../../assets/fonts/NanumMyeongjo-ExtraBold.ttf", weight: "800", variable: "--rf-seal" });
export const fOld = localFont({
  src: [
    { path: "../../assets/fonts/OldStandard-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../assets/fonts/OldStandard-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../assets/fonts/OldStandard-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--rf-old",
});
/** 현상수배 전단의 WANTED — 서부극 목판 활자 */
export const fWestern = localFont({ src: "../../assets/fonts/Rye-Regular.ttf", weight: "400", variable: "--rf-western" });
export const fBlack = localFont({ src: "../../assets/fonts/UnifrakturMaguntia-Book.ttf", weight: "400", variable: "--rf-blackletter" });

export const runFontVars = [fBlackHan, fMono, fPen, fSans, fSerif, fOld, fBlack, fSeal, fWestern].map((f) => f.variable).join(" ");
