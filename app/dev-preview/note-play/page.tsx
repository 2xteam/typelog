import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { DevNotePlay } from "./DevNotePlay";

/**
 * 개발용 미리보기 — 러닝 노트 **선택 화면**을 DB 없이(로컬에서만, 운영은 404).
 * 답은 브라우저 안에서 채점하고, 끝나면 색 원판 → /dev-preview/note 로 간다.
 */
export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/quizzes/runner-16type.json"), "utf8"));
  return <DevNotePlay quiz={json} />;
}
