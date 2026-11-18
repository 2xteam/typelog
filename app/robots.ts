import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt(2026-11-18 공유 SEO 점검).
 * 소개 · 질문지 목록만 검색에 둔다. 응시 · 결과 · 관리 · 개발용 미리보기 · API 는 제외.
 * 공유 링크(/r/…)는 여기서 막지 않는다 — 막으면 미리보기 수집기가 페이지를 못 읽어
 * 카톡 미리보기가 사라질 수 있다. 대신 페이지가 noindex 를 단다(app/r/[token]/layout.tsx).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/play/", "/results/", "/records", "/my", "/admin", "/dev-preview/", "/login"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
