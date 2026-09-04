"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
 *
 * 앱 안과 공유 링크(헤더 없음)에서 같은 화면을 쓴다 → components/PlayFlow.tsx
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
type Payload = {
  quiz: { slug: string; title: string; emoji: string | null; disclaimer: string | null };
  attemptNo: number;
  result: Result;
  /** 게스트 본인이 볼 때만 온다 → lib/claimToken.ts */
  claimToken?: string | null;
};

export function ResultView({
  attemptId,
  bare = false,
}: {
  attemptId: string;
  /** 공유 링크 안에서는 앱 안으로 데려가는 링크를 줄인다 */
  bare?: boolean;
}) {
  const session = useSession();
  const [data, setData] = useState<Payload | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/attempts/${attemptId}?guestKey=${encodeURIComponent(getGuestKey())}`,
    );
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
  }, [attemptId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * 게스트로 한 기록을 계정으로 옮긴다.
   *
   * **결과 화면에서 가입·로그인으로 바로 이어진 그 흐름에서만** 옮긴다.
   * 로그인할 때마다 그 브라우저의 게스트 기록을 다 끌어오면, 누가 썼는지 알 수
   * 없는 기록까지 계정에 붙는다(가족 공용 PC). 그래서 URL 에 실려 온
   * `claim` 표 1장이 가리키는 1건만 옮긴다.
   */
  useEffect(() => {
    if (session.status !== "signed-in") return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get("claim");
    if (!token) return;
    void (async () => {
      await fetch("/api/attempts/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claimToken: token }),
      });
      // 표는 1회용이다. 주소에 남겨 두면 새로고침마다 다시 쓴다
      url.searchParams.delete("claim");
      window.history.replaceState(null, "", url.pathname + url.search);
      await load();
    })();
  }, [session.status, load]);

  const share = useCallback(async () => {
    setShareMsg(null);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guestKey: getGuestKey() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setShareMsg(json.error ?? "링크를 만들지 못했어요.");
        return;
      }
      const url = `${window.location.origin}${json.path}`;
      try {
        await navigator.clipboard.writeText(url);
        setShareMsg("링크를 복사했어요. 친구에게 보내 보세요.");
      } catch {
        // 클립보드를 못 쓰는 브라우저가 있다. 주소를 보여 주면 손으로 옮길 수 있다
        setShareMsg(url);
      }
    } catch {
      setShareMsg("네트워크가 불안정해요.");
    }
  }, [attemptId]);

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
  /**
   * 가입 후 이 결과로 돌아와야 이관 표를 쓸 수 있다. 그래서 `next` 에 표를 실어
   * 둔다 — 운영 도메인에서는 포털로 갔다 돌아오므로 주소 말고는 실을 곳이 없다.
   */
  const signupHref = data.claimToken
    ? `/login?next=${encodeURIComponent(`/results/${attemptId}?claim=${data.claimToken}`)}`
    : `/login?next=${encodeURIComponent(`/results/${attemptId}`)}`;

  return (
    <>
      {isGuest ? (
        <Sheet tone="gold" eyebrow="SAVE" headline="가입하여 나의 타입을 기록해요">
          <p className="lead">가입하지 않으면 기록은 다시볼 수 없어요.</p>
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn--primary" href={signupHref}>
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
            /* 이름 뒤에 조사를 붙이지 않는다 — 이유는 app/r/[token]/page.tsx */
            <p className="lead">
              아슬아슬하게 다음이었던 타입 —{" "}
              <strong>
                {result.runnerUp.emoji} {result.runnerUp.name}
              </strong>
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

      <Sheet center eyebrow="AGAIN" headline={bare ? "다른 타입도 궁금하죠?" : "다시 해볼까요?"}>
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn--primary" href="/types">
            {bare ? "타입로그 둘러보기 →" : "다른 것도 해보기 →"}
          </Link>
          {!isGuest ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => void share()}>
                결과 링크 만들기
              </button>
              {!bare ? (
                <Link className="btn btn--ghost" href="/records">
                  내 기록 보기
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
        {shareMsg ? <p className="quiz-msg">{shareMsg}</p> : null}
        {/* 그 브랜드가 만들었거나 관련된 것처럼 읽히면 안 된다 */}
        {quiz.disclaimer ? <p className="result-fineprint">{quiz.disclaimer}</p> : null}
      </Sheet>
    </>
  );
}
