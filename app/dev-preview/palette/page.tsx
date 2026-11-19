import type { Metadata } from "next";
import quiz from "@/content/quizzes/runner-16type.json";
import { PaletteBoard } from "./PaletteBoard";

/**
 * 러닝 노트 디자인 리뷰 — 확정한 색 체계 + 카드 뷰어(유형 · 세기 · 랜덤 키). 운영에서도 열림, 검색 제외.
 *   /dev-preview/palette
 * 카드 · 무대는 실제 컴포넌트(NoteDeck) 그대로라 배포된 화면과 같다.
 */
export const dynamic = "force-dynamic";
/** 디자인 리뷰용으로 운영에서도 연다(사용자 2026-11-19). DB · 개인 정보 없이 저장소의 질문지 파일만 그린다. 검색에는 안 나오게 */
export const metadata: Metadata = { title: "러닝 노트 미리보기 | TypeLog", robots: { index: false, follow: false } };


export default function Page() {
  return <PaletteBoard quiz={quiz as never} />;
}
