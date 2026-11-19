import type { Metadata } from "next";
import quiz from "@/content/quizzes/runner-16type.json";
import { DevNotePlay } from "./DevNotePlay";

/**
 * 개발용 미리보기 — 러닝 노트 **선택 화면**을 DB 없이(디자인 리뷰용 — 운영에서도 열림, 검색 제외).
 * 답은 브라우저 안에서 채점하고, 끝나면 색 원판 → /dev-preview/note 로 간다.
 */
export const dynamic = "force-dynamic";
/** 디자인 리뷰용으로 운영에서도 연다(사용자 2026-11-19). DB · 개인 정보 없이 저장소의 질문지 파일만 그린다. 검색에는 안 나오게 */
export const metadata: Metadata = { title: "러닝 노트 미리보기 | TypeLog", robots: { index: false, follow: false } };


export default function Page() {
  return <DevNotePlay quiz={quiz as never} />;
}
