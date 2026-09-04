"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/Sheet";
import { getGuestKey } from "@/lib/guestKey";

/**
 * 질문지 목록 — 탭 두 개로 나눈다.
 *
 * 아직 열리지 않은 질문지를 잠긴 카드로 섞어 두지 않는다. 섞어 두면 목록을
 * 훑다 잠긴 카드를 계속 만나 김이 샌다. `오픈 예정` 이 비어 있으면 **탭 자체를
 * 감춘다** — 빈 탭을 눌러 보게 하지 않는다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

type Quiz = {
  slug: string;
  title: string;
  tagline: string;
  emoji: string | null;
  itemCount: number;
  estimatedMinutes: number | null;
  comingSoon: boolean;
  startAt: string | null;
  openingNoticeText: string | null;
};

const openDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시`;
};

export default function TypesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [tab, setTab] = useState<"open" | "soon">("open");
  const [starting, setStarting] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/quizzes");
        const data = (await res.json()) as { quizzes?: Quiz[] };
        setQuizzes(data.quizzes ?? []);
      } catch {
        setQuizzes([]);
        setMsg("목록을 불러오지 못했어요.");
      }
    })();
  }, []);

  const start = useCallback(
    async (slug: string) => {
      setStarting(slug);
      setMsg(null);
      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, guestKey: getGuestKey() }),
        });
        const data = (await res.json()) as { ok?: boolean; attemptId?: string; error?: string };
        if (!res.ok || !data.ok || !data.attemptId) {
          setMsg(data.error ?? "시작할 수 없어요.");
          return;
        }
        router.push(`/play/${data.attemptId}`);
      } catch {
        setMsg("네트워크가 불안정해요.");
      } finally {
        setStarting(null);
      }
    },
    [router],
  );

  const open = (quizzes ?? []).filter((q) => !q.comingSoon);
  const soon = (quizzes ?? []).filter((q) => q.comingSoon);
  const showTabs = soon.length > 0;
  const shown = tab === "open" ? open : soon;

  return (
    <Sheet
      eyebrow={tab === "open" ? "ALL TYPES" : "COMING SOON"}
      headline="어떤 타입이 나와 가장 가까울까요?"
    >
      {showTabs ? (
        <div className="tabs" role="tablist" style={{ marginTop: 18 }}>
          <button type="button" role="tab" className="tab" aria-selected={tab === "open"} onClick={() => setTab("open")}>
            지금 해보기
          </button>
          <button type="button" role="tab" className="tab" aria-selected={tab === "soon"} onClick={() => setTab("soon")}>
            오픈 예정
          </button>
        </div>
      ) : null}

      {quizzes === null ? null : shown.length === 0 ? (
        <p className="lead">
          {tab === "open" ? "아직 열린 질문지가 없어요." : "예정된 질문지가 없어요."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          {shown.map((q) => (
            <div key={q.slug} className="quiz-card">
              <span className="quiz-card-emoji" aria-hidden="true">
                {q.emoji ?? "🧩"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="quiz-card-title">{q.title}</p>
                <p className="quiz-card-sub">{q.tagline}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <span className="pill">질문 {q.itemCount}개</span>
                  {q.estimatedMinutes ? <span className="pill">약 {q.estimatedMinutes}분</span> : null}
                  {q.comingSoon ? (
                    <span className="pill pill--gold">{openDate(q.startAt)} 오픈</span>
                  ) : null}
                </div>
                {q.comingSoon ? (
                  <p className="quiz-card-notice">
                    {q.openingNoticeText ?? "곧 만나요. 조금만 기다려 주세요 ✨"}
                  </p>
                ) : null}
              </div>
              {q.comingSoon ? null : (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void start(q.slug)}
                  disabled={starting !== null}
                >
                  {starting === q.slug ? "여는 중…" : "해보기"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {msg ? <p className="quiz-msg">{msg}</p> : null}
    </Sheet>
  );
}
