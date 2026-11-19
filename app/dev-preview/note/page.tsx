import type { Metadata } from "next";
import quiz from "@/content/quizzes/runner-16type.json";
import { DevNote } from "./DevNote";

/**
 * 개발용 미리보기 — 러닝 노트 결과 화면을 **DB 없이** 그린다(디자인 리뷰용 — 운영에서도 열림, 검색 제외).
 *   /dev-preview/note?code=CLAR&s=1010&id=abc&n=3
 *     code  유형 코드
 *     s     축마다 진하게(1) · 은은하게(0) — 색이 「진하게 둘 / 은은하게 둘」 중에서 정해진다
 *     id    기록 번호 대신 — 바꾸면 같은 유형 안에서 색 · 메시 모양이 바뀐다
 *     n     회차(기본 5 — 앞의 네 장이 덱 목록에 들어간다)
 *     view  shared 면 공유 화면 · collection 이면 모은 카드(덱 목록, n 장)
 */
export const dynamic = "force-dynamic";
/** 디자인 리뷰용으로 운영에서도 연다(사용자 2026-11-19). DB · 개인 정보 없이 저장소의 질문지 파일만 그린다. 검색에는 안 나오게 */
export const metadata: Metadata = { title: "러닝 노트 미리보기 | TypeLog", robots: { index: false, follow: false } };


export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = await searchParams;
  const json = quiz as never;
  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: 16 }}>
      <DevNote quiz={json} code={q.code ?? "CLAR"} s={q.s ?? "1010"} id={q.id ?? "devpreview0000000000000001"} n={Number(q.n ?? 5)} view={q.view ?? "result"} />
    </main>
  );
}
