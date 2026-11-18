/**
 * 질문지의 화면 방식(running · note · null).
 *
 * 로컬 개발에서만 환경 변수로 덮어쓸 수 있다 — **로컬 DB 가 운영과 같아서** DB 의 `experience` 를 바꾸면
 * 운영 화면이 바로 바뀐다. 새 화면을 실제 흐름(목록 → 응시 → 결과 → 기록 → admin 상세)으로 먼저 보려면:
 *
 *   DEV_EXPERIENCE=runner-16type=note npm run dev      (여럿이면 쉼표: a=note,b=running)
 *
 * 운영(NODE_ENV=production)에서는 읽지 않는다. 운영 반영은 content 모드 `quizMeta.experience`.
 * → my-obsidian-vault / 50-Plans/K 러닝 노트.md
 */
export type Experience = "running" | "note" | null;

function devOverrides(): Record<string, Experience> {
  if (process.env.NODE_ENV !== "development") return {};
  const raw = process.env.DEV_EXPERIENCE ?? "";
  return Object.fromEntries(
    raw
      .split(",")
      .map((pair) => pair.split("=").map((s) => s.trim()))
      .filter(([slug, v]) => slug && (v === "running" || v === "note" || v === "null"))
      .map(([slug, v]) => [slug, v === "null" ? null : (v as Experience)]),
  );
}

export function experienceOf(quiz: { slug?: unknown; experience?: unknown }): Experience {
  const o = devOverrides();
  const slug = typeof quiz.slug === "string" ? quiz.slug : "";
  if (slug in o) return o[slug];
  return quiz.experience === "running" || quiz.experience === "note" ? quiz.experience : null;
}
