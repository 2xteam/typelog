import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { connectDB } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { getQuizModel } from "@/models/Quiz";

/**
 * 홍보 시작 화면 껍데기(사용자 2026-11-21) — 인스타 프로필 링크 등으로 들어와 인트로 → 바로 설문.
 * 공유 링크처럼 **상단 메뉴가 없다** — 할 일은 「시작」 하나. 사람마다의 결과가 아니라 질문지 소개라 검색에도 연다.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const url = `${SITE_URL}/start/${slug}`;
  let title = "TypeLog — 나의 타입 찾기";
  let description = "질문에 답하면 나의 타입이 나와요. 가입 없이 지금 해볼 수 있어요.";
  try {
    await connectDB();
    const quiz = await getQuizModel().findOne({ slug }).select({ title: 1, tagline: 1 }).lean();
    if (quiz?.title) {
      title = quiz.title;
      if (quiz.tagline && !quiz.tagline.includes("*")) description = `${quiz.tagline} 가입 없이 지금 바로 해볼 수 있어요.`;
    }
  } catch {
    /* 못 읽어도 기본 값으로 */
  }
  return {
    title: `${title} | TypeLog`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "TypeLog", locale: "ko_KR", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function StartLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem 1rem 2rem" }}>
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
