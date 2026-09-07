import type { CSSProperties } from "react";
import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import { LandingHeaderAuth } from "@/components/LandingAuth";
import { Sheet } from "@/components/Sheet";

/**
 * 루트는 **로그인 없이 볼 수 있는 소개 페이지**다.
 * 루트가 곧 로그인 화면이면 이 앱이 무엇을 하는 곳인지 알 방법이 없다.
 * 로그인은 /login, 앱 화면은 /home 부터다.
 * → my-obsidian-vault / 20-Design/앱 공통 UI와 아이콘.md
 */

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <header style={headerStyle}>
        <div className="page" style={{ ...headerInner, paddingTop: 14, paddingBottom: 14 }}>
          <span className="row" style={{ gap: 9 }}>
            <AppIcon size={30} priority />
            <span style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>TypeLog</span>
          </span>
          <LandingHeaderAuth />
        </div>
      </header>

      <main className="page">
      <Sheet
        tone="dark"
        eyebrow="TYPE PLAY"
        headline={
          <>
            어떤 타입이
            <br />
            나와 가장 가까울까요?
          </>
        }
        lead={
          <>
            짧은 질문에 답하면 나의 타입이 나와요.
            <br />
            다시 할 때마다 그 변화가 기록으로 쌓여요.
          </>
        }
      >
        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <Link className="btn btn--primary" href="/types">
            타입 찾아보기 →
          </Link>
          <Link className="btn btn--ghost" href="/login">
            로그인
          </Link>
        </div>
      </Sheet>

      <Sheet
        tone="tint"
        eyebrow="HOW IT WORKS"
        headline="세 걸음이면 끝나요"
      >
        <ol
          style={{
            margin: "18px 0 0",
            paddingLeft: 0,
            listStyle: "none",
            display: "grid",
            gap: 14,
          }}
        >
          {[
            ["01", "질문에 답해요", "한 번에 한 질문씩 나와요. 마음이 바뀌면 되돌아가도 괜찮아요."],
            ["02", "나의 타입을 봐요", "어울리는 순간과 잘 맞는 타입까지 함께 알려드려요."],
            ["03", "기록으로 모아요", "다시 해볼 수 있어요. 나온 타입은 도감에 모여요."],
          ].map(([no, title, desc]) => (
            <li key={no} style={{ display: "flex", gap: 14 }}>
              <span className="pill pill--gold" style={{ height: 24 }}>
                {no}
              </span>
              <span>
                <strong style={{ display: "block", fontSize: 15 }}>{title}</strong>
                <span
                  style={{
                    fontSize: 13,
                    lineHeight: 1.75,
                    color: "var(--text-secondary)",
                    wordBreak: "keep-all",
                  }}
                >
                  {desc}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Sheet>

      <Sheet eyebrow="ONE ACCOUNT" tone="gold" headline="계정만 함께 써요">
        <p className="lead">
          기록과 데이터는 서비스마다 따로 쌓여요.
          <br />
          하나만 써도 충분하고, 쓰지 않는 서비스는 열지 않아도 돼요.
        </p>
      </Sheet>

      <Sheet center eyebrow="START" headline="지금 해볼까요?">
        <div style={{ marginTop: 20 }}>
          <Link className="btn btn--primary" href="/types">
            타입 찾아보기 →
          </Link>
        </div>
      </Sheet>
      </main>

      <footer style={footerStyle}>
        <div className="page" style={{ textAlign: "center", paddingBottom: 28 }}>
          <p style={{ margin: "0 0 14px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            TypeLog
          </p>
          <p style={{ margin: 0 }}>
            <a
              href="https://www.myjane.co.kr"
              className="myjane-mark"
              style={{ color: "var(--on-dark)" }}
            >
              my<span>jane</span>
            </a>
          </p>
          <p style={footerLineStyle}>@2026 myjane All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

const headerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  background: "var(--bg-primary)",
  borderBottom: "1px solid var(--border-subtle)",
};

const headerInner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const footerStyle: CSSProperties = {
  marginTop: 40,
  paddingTop: 30,
  background: "var(--footer-bg)",
  color: "var(--on-dark)",
};

const footerLineStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "0.78rem",
  lineHeight: 1.8,
  color: "var(--on-dark-faint)",
  wordBreak: "keep-all",
};
