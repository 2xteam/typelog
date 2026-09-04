"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { getGuestKey } from "@/lib/guestKey";
import { useSession } from "@/lib/useSession";

/**
 * 결과 화면.
 *
 * 문장은 **지금 읽은 최신 것**이다. 코드·점수만 스냅샷하고 문장은 최신을 쓰므로,
 * 오타를 고치면 과거 결과에도 반영된다.
 *
 * 축 점수는 **그래프로 그리지 않는다.** 성향에는 "늘었다·줄었다"로 읽을 수치가
 * 없고, 숫자로 증명하지 않는 것이 결쩜사 톤이다 — 어느 쪽에 가까운지만 말한다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

type OutcomeView = {
  id: string;
  label: string;
  pomp: number;
  left: { code: string; label?: string | null } | null;
  right: { code: string; label?: string | null } | null;
};
type Result = {
  code: string | null;
  type: {
    code: string;
    name: string;
    subtitle: string | null;
    emoji: string;
    color: string | null;
    content: {
      summary: string;
      strengths: string[];
      cautions?: string[] | null;
      tips?: string[] | null;
      funFact?: string | null;
    };
  } | null;
  runnerUp: { code: string; name: string; emoji: string } | null;
  goodWith: { code: string; name: string; emoji: string }[];
  outcomes: OutcomeView[];
};

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = useSession();
  const [data, setData] = useState<{
    quiz: { slug: string; title: string; emoji: string | null };
    attemptNo: number;
    result: Result;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/attempts/${id}?guestKey=${encodeURIComponent(getGuestKey())}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(json.error ?? "불러올 수 없어요.");
        return;
      }
      if (json.status !== "completed") {
        setMsg("아직 끝나지 않은 기록이에요.");
        return;
      }
      setData(json);
    })();
  }, [id]);

  if (msg) {
    return (
      <Sheet eyebrow="YOUR TYPE" headline="결과를 볼 수 없어요">
        <p className="lead">{msg}</p>
        <div style={{ marginTop: 18 }}>
          <Link className="btn btn--primary" href="/types">
            타입 찾아보기 →
          </Link>
        </div>
      </Sheet>
    );
  }
  if (!data) return null;

  const { result, quiz, attemptNo } = data;
  const t = result.type;
  const isGuest = session.status !== "signed-in";

  return (
    <>
      {isGuest ? (
        <Sheet tone="gold" eyebrow="SAVE" headline="가입하여 나의 타입을 기록해요">
          <p className="lead">가입하지 않으면 기록은 다시볼 수 없어요.</p>
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn--primary" href={`/login?next=${encodeURIComponent(`/results/${id}`)}`}>
              가입하고 기록하기 →
            </Link>
          </div>
        </Sheet>
      ) : null}

      <Sheet
        tone="dark"
        ornament
        eyebrow="YOUR TYPE"
        headline={
          <>
            <span style={{ fontSize: "1.6em", display: "block", marginBottom: 8 }} aria-hidden="true">
              {t?.emoji}
            </span>
            {t?.name ?? result.code}
          </>
        }
        lead={t?.subtitle ?? null}
      >
        <p className="result-summary">{t?.content.summary}</p>
        <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
          <span className="pill">{quiz.title}</span>
          <span className="pill">{attemptNo}회차</span>
          {result.code ? <span className="pill pill--gold">{result.code}</span> : null}
        </div>
      </Sheet>

      {t ? (
        <Sheet eyebrow="ABOUT YOU" headline="이런 게 잘 맞아요">
          <ul className="result-list">
            {t.content.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {t.content.cautions?.length ? (
            <>
              <p className="result-sub-label">이럴 땐 조금 힘들 수 있어요</p>
              <ul className="result-list result-list--muted">
                {t.content.cautions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          ) : null}
          {t.content.tips?.length ? (
            <p className="note-block">
              <strong>오늘 해볼 것</strong>
              {t.content.tips[0]}
            </p>
          ) : null}
        </Sheet>
      ) : null}

      {result.outcomes.length ? (
        <Sheet tone="tint" eyebrow="WHERE YOU LEAN" headline="어느 쪽에 가까운가요?">
          <div className="lean-list">
            {result.outcomes.map((o) => {
              const toRight = o.pomp >= 50;
              const side = toRight ? o.right : o.left;
              const other = toRight ? o.left : o.right;
              return (
                <div key={o.id} className="lean-row">
                  <span className="lean-label">{o.label}</span>
                  <span className="lean-value">{side?.label ?? side?.code ?? ""}</span>
                  <span className="lean-other">{other?.label ?? other?.code ?? ""}보다</span>
                </div>
              );
            })}
          </div>
        </Sheet>
      ) : null}

      {result.goodWith.length || result.runnerUp ? (
        <Sheet eyebrow="AND ALSO" headline="함께 보면 재미있어요">
          {result.runnerUp ? (
            <p className="lead">
              아슬아슬하게 다음이었던 건 <strong>{result.runnerUp.emoji} {result.runnerUp.name}</strong> 이에요.
            </p>
          ) : null}
          {result.goodWith.length ? (
            <>
              <p className="result-sub-label">잘 맞는 타입</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.goodWith.map((g) => (
                  <span key={g.code} className="pill">
                    {g.emoji} {g.name}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {t?.content.funFact ? <p className="result-fact">{t.content.funFact}</p> : null}
        </Sheet>
      ) : null}

      <Sheet center eyebrow="AGAIN" headline="다시 해볼까요?">
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn--primary" href="/types">
            다른 것도 해보기 →
          </Link>
          {!isGuest ? (
            <Link className="btn btn--ghost" href="/records">
              내 기록 보기
            </Link>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
