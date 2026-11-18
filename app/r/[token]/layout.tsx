import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { connectDB } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { getAttemptModel } from "@/models/Attempt";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";

/**
 * 공유 링크 미리보기 · 검색 설정(2026-11-18 점검).
 *
 * - 링크마다 제목 · 설명을 따로 — 전엔 모든 공유 링크가 사이트 기본값(「TypeLog」)이라 카톡 미리보기에
 *   어떤 결과인지 안 나왔다. 제목은 「유형 이름 · 질문지 제목」, 결과 문장은 넣지 않는다(눌러 볼 이유)
 * - og:url · canonical 은 이 링크 자신, og:locale ko_KR
 * - 검색 색인은 막는다(noindex, follow) — 사람마다의 결과 페이지라 검색에 나올 이유가 없다.
 *   카톡 · 페이스북 같은 미리보기 수집은 meta robots 와 무관하게 그대로 된다
 * - 미리보기 그림은 같은 폴더의 opengraph-image
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const url = `${SITE_URL}/r/${token}`;
  let title = "TypeLog — 나의 타입 찾기";
  let description = "질문에 답하면 나의 타입이 나와요. 지금 해볼 수 있어요.";
  try {
    await connectDB();
    const attempt = await getAttemptModel()
      .findOne({ "share.token": token, "share.isPublic": true, status: "completed" })
      .select({ quizId: 1, result: 1 })
      .lean();
    if (attempt) {
      const quiz = await getQuizModel().findById(attempt.quizId).select({ title: 1, tagline: 1 }).lean();
      const type = attempt.result?.code
        ? await getResultTypeModel().findOne({ quizId: attempt.quizId, code: attempt.result.code }).select({ name: 1, emoji: 1 }).lean()
        : null;
      if (quiz?.title) {
        title = type?.name ? `${type.emoji ? `${type.emoji} ` : ""}${type.name} · ${quiz.title}` : quiz.title;
        // 한 줄 소개에 빈칸 표시(「****」)가 있으면 미리보기 설명에 넣지 않는다
        const tagline = quiz.tagline && !quiz.tagline.includes("*") ? quiz.tagline : null;
        description = `${tagline ?? `${quiz.title} —`} 나의 결과도 지금 바로 확인해 보세요.`;
      }
    }
  } catch {
    /* 못 읽어도 기본 값으로 */
  }
  return {
    title: `${title} | TypeLog`,
    description,
    alternates: { canonical: url },
    robots: { index: false, follow: true },
    openGraph: { type: "website", siteName: "TypeLog", locale: "ko_KR", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * 공유 링크 껍데기 — **상단 메뉴가 없다.**
 *
 * 링크를 받은 사람은 아직 우리 서비스를 모른다. Home·Types·Records 를 먼저
 * 보여 주면 무엇을 눌러야 하는지 고민하게 된다. 할 일은 하나여야 한다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */
export default function SharedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.75rem 1rem 2rem" }}>
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
