"use client";

import type { CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { loadSession, saveSession, type SessionUser } from "@/lib/session";
import { loginUrl, usesPortal } from "@/lib/portal";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";
  /** 세션이 있어도 로그인 화면을 보여 달라는 표시 → lib/portal.ts */
  const relogin = params.get("relogin") === "1";
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!relogin && loadSession()) {
      window.location.replace(next);
      return;
    }
    // 운영 도메인에서는 통합 로그인(www.myjane.co.kr)이 맡는다.
    // 로컬 개발에서는 쿠키 도메인이 적용되지 않으므로 이 화면을 그대로 쓴다.
    if (usesPortal()) window.location.replace(loginUrl(next, { relogin }));
  }, [next, relogin]);

  const login = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        user?: SessionUser;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.user) {
        setMsg(json.error ?? "로그인에 실패했습니다.");
        return;
      }
      saveSession(json.user);
      window.location.replace(next);
    } catch {
      setMsg("네트워크 오류입니다.");
    } finally {
      setBusy(false);
    }
  }, [phone, pin, next]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl)",
          padding: "2rem",
          boxShadow: "0 24px 65px rgba(37, 13, 62, 0.09)",
        }}
      >
        <h1
          style={{
            margin: "0 0 0.25rem",
            fontSize: "1.75rem",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AppIcon size={36} priority className="app-brand-icon" />
          <span style={{ fontWeight: 900, letterSpacing: "-0.02em", color: "var(--accent)" }}>TypeLog</span>
        </h1>
        <p style={{ margin: "0 0 1.5rem", color: "var(--text-secondary)", fontSize: 14 }}>
          전화번호와 PIN으로 로그인하세요.
        </p>
        <label style={lab}>
          전화번호
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01012345678"
            style={inp}
          />
        </label>
        <label style={{ ...lab, marginBottom: "1.25rem" }}>
          PIN
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4자 이상"
            style={inp}
          />
        </label>
        <button
          type="button"
          onClick={login}
          disabled={busy}
          style={{
            width: "100%",
            padding: "0.85rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            background: busy ? "var(--text-muted)" : "var(--accent)",
            /* 진한 보라 위에서 검정은 거의 보이지 않는다. 팔레트가 바뀌어도
               따라가도록 --on-accent 를 쓴다.
               → my-obsidian-vault / 20-Design/앱 공통 UI와 아이콘.md */
            color: "var(--on-accent)",
            fontWeight: 700,
            cursor: busy ? "default" : "pointer",
            marginBottom: "0.75rem",
            fontSize: 15,
          }}
        >
          {busy ? "확인 중…" : "로그인"}
        </button>
        {/*
          가입·복구는 포털이 담당한다. 이 앱에는 /register · /find-phone ·
          /forgot-pin 화면이 없다 — 만들면 통합 로그인과 두 갈래가 된다.
          → my-obsidian-vault / 30-Patterns/인증과 세션 공유.md
        */}
        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontSize: 13,
            lineHeight: 1.8,
            color: "var(--text-secondary)",
          }}
        >
          계정이 없거나 PIN 을 잊으셨나요?
          <br />
          <a
            href="https://www.myjane.co.kr/login?from=typelog&next=%2Fhome"
            style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
          >
            myjane 에서 가입·찾기 →
          </a>
        </p>
        {msg ? (
          <p style={{ margin: "1rem 0 0", color: "var(--danger)", fontSize: 13 }}>{msg}</p>
        ) : null}
      </div>
    </main>
  );
}

const lab: CSSProperties = {
  display: "grid",
  gap: 6,
  marginBottom: "1rem",
  fontSize: 13,
  color: "var(--text-secondary)",
};

const inp: CSSProperties = {
  padding: "0.65rem 0.85rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 16,
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
