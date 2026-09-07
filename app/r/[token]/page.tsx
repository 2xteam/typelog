"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { Sheet } from "@/components/Sheet";
import { getGuestKey } from "@/lib/guestKey";

/**
 * 공유 링크 첫 화면 — 친구가 받은 링크를 열면 여기다.
 *
 * 헤더가 없고 버튼도 하나다. 친구의 타입은 **이름과 한 줄만** 보여 준다
 * (전문은 /api/shared/[token] 에서도 내려보내지 않는다).
 *
 * 게스트는 질문지당 1회다. 이미 해봤으면 409 가 오는데, 그때는 못 한다고
 * 말하지 않고 **가입하면 다시 할 수 있다**고 말한다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

type Shared = {
  quiz: {
    slug: string;
    title: string;
    tagline: string;
    emoji: string | null;
    itemCount: number | null;
    estimatedMinutes: number | null;
    ageLabel: string | null;
    disclaimer: string | null;
  };
  open: boolean;
  notice: string | null;
  friend: { name: string; subtitle: string | null; emoji: string } | null;
};

export default function SharedLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Shared | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/shared/${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setMsg(json.error ?? "없는 링크예요.");
          return;
        }
        setData(json);
      } catch {
        setMsg("네트워크가 불안정해요.");
      }
    })();
  }, [token]);

  const start = useCallback(async () => {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: data.quiz.slug, guestKey: getGuestKey() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok || !json.attemptId) {
        setMsg(json.error ?? "시작할 수 없어요.");
        return;
      }
      router.push(`/r/${token}/play/${json.attemptId}`);
    } catch {
      setMsg("네트워크가 불안정해요.");
    } finally {
      setBusy(false);
    }
  }, [data, router, token]);

  if (msg && !data) {
    return (
      <Sheet center eyebrow="TYPELOG" headline="링크를 열 수 없어요">
        <p className="lead">{msg}</p>
      </Sheet>
    );
  }
  if (!data) return null;

  return (
    <>
      <div className="shared-brand">
        <AppIcon size={36} />
        <span>TypeLog</span>
      </div>

      <Sheet
        tone="dark"
        center
        eyebrow="A FRIEND SHARED"
        /**
         * 타입 이름을 문장에 끼우지 않고 **헤드라인으로 세운다.**
         *
         * "친구는 {이름}이 나왔어요" 처럼 쓰면 조사가 걸린다. 한글 이름은
         * 받침으로 이/가를 고를 수 있지만 로마자 이름은 한글 표기에 따라
         * 갈린다 — Ryan(라이언)은 "이", Chloe(클로이)는 "가" 다. 표기를
         * 코드가 추측할 수 없으니 조사가 필요 없는 문장으로 쓴다.
         */
        headline={
          data.friend ? (
            <>
              <span
                style={{ fontSize: "1.6em", display: "block", marginBottom: 8 }}
                aria-hidden="true"
              >
                {data.friend.emoji}
              </span>
              {data.friend.name}
            </>
          ) : (
            "친구가 타입을 나눠 줬어요"
          )
        }
        lead={data.friend ? (data.friend.subtitle ?? "친구가 나눈 타입이에요") : null}
      >
        <p className="result-summary" style={{ textAlign: "center" }}>
          나는 어떤 타입일까요? 지금 해볼 수 있어요.
        </p>
      </Sheet>

      <Sheet center eyebrow="TRY IT" headline={data.quiz.title}>
        <p className="lead">{data.quiz.tagline}</p>
        <div
          style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}
        >
          {data.quiz.ageLabel ? (
            <span className="pill pill--age">{data.quiz.ageLabel} 추천</span>
          ) : null}
          {data.quiz.itemCount ? <span className="pill">질문 {data.quiz.itemCount}개</span> : null}
          {data.quiz.estimatedMinutes ? (
            <span className="pill">약 {data.quiz.estimatedMinutes}분</span>
          ) : null}
          <span className="pill">가입 없이 한 번</span>
        </div>

        {data.open ? (
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void start()}
              disabled={busy}
            >
              {busy ? "여는 중…" : "나도 해보기 →"}
            </button>
          </div>
        ) : (
          <p className="quiz-card-notice" style={{ marginTop: 16 }}>
            {data.notice ?? "지금은 할 수 없어요."}
          </p>
        )}

        {msg ? <p className="quiz-msg">{msg}</p> : null}
        {data.quiz.disclaimer ? (
          <p className="result-fineprint">{data.quiz.disclaimer}</p>
        ) : null}
      </Sheet>
    </>
  );
}
