import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";

/** 내 크루 껍데기(사용자 2026-11-21) — 상단 메뉴 없이. 본인만 보는 화면이라 검색에 안 나오게 */
export const metadata: Metadata = { title: "내 러닝 크루 | TypeLog", robots: { index: false, follow: false } };

export default function CrewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem 1rem 2rem" }}>
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
