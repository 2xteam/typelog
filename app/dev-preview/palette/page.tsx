import type { Metadata } from "next";
import quiz from "@/content/quizzes/runner-16type.json";
import { PaletteBoard } from "./PaletteBoard";

/**
 * 개발용 — 러닝 노트 색상 방향 비교(디자이너 리뷰 2026-11-18, 디자인 리뷰용 — 운영에서도 열림, 검색 제외).
 *   /dev-preview/palette
 * 보라 그라데이션 무대를 걷고 「단색 딥 네이비 + 네온 포인트 + Noto Sans」 세 방향을 실제 카드 · 무대 · 버튼으로 나란히.
 */
export const dynamic = "force-dynamic";
/** 디자인 리뷰용으로 운영에서도 연다(사용자 2026-11-19). DB · 개인 정보 없이 저장소의 질문지 파일만 그린다. 검색에는 안 나오게 */
export const metadata: Metadata = { title: "러닝 노트 미리보기 | TypeLog", robots: { index: false, follow: false } };


export default function Page() {
  return <PaletteBoard quiz={quiz as never} />;
}
