import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** sitemap.xml — 검색에 둘 공개 페이지만(소개). 질문지 목록은 로그인 화면이라, 개인 결과 · 공유 링크는 개인 것이라 넣지 않는다 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
  ];
}
