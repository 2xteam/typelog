import { SiteFooter } from "@/components/SiteFooter";

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
