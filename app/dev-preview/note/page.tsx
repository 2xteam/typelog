import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { DevNote } from "./DevNote";

/**
 * 개발용 미리보기 — 러닝 노트 결과 화면을 **DB 없이** 그린다(로컬에서만, 운영은 404).
 *   /dev-preview/note?code=CLAR&s=1010&id=abc&n=3
 *     code  유형 코드
 *     s     축마다 진하게(1) · 은은하게(0) — 색이 「진하게 둘 / 은은하게 둘」 중에서 정해진다
 *     id    기록 번호 대신 — 바꾸면 같은 유형 안에서 색 · 메시 모양이 바뀐다
 *     n     회차
 * 아래에 모은 카드(지갑)와 색 원판 돌기도 함께 그린다.
 */
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const q = await searchParams;
  const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/quizzes/runner-16type.json"), "utf8"));
  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: 16 }}>
      <DevNote quiz={json} code={q.code ?? "CLAR"} s={q.s ?? "1010"} id={q.id ?? "devpreview0000000000000001"} n={Number(q.n ?? 3)} />
    </main>
  );
}
