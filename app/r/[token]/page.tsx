"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { Sheet } from "@/components/Sheet";
import { getGuestKey } from "@/lib/guestKey";
import { loginUrl, signupUrl } from "@/lib/portal";
import { SharedLicense } from "@/components/run/SharedLicense";
import { SharedNote, type SharedNoteData } from "@/components/note/SharedNote";
import type { RecordDetail } from "@/lib/record";

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
  /** 비회원 한 번을 이미 썼나 — 그러면 처음부터 가입 안내 */
  guestUsed?: boolean;
  /** 이 브라우저(비회원) · 계정(회원)으로 이 질문지에 참여한 기록 */
  past?: { kind: "guest" | "member"; attemptId: string; claimToken: string | null; count: number } | null;
  notice: string | null;
  friend: { name: string; subtitle: string | null; emoji: string } | null;
  /** 러닝 기록 — 자격증으로 보여 준다 */
  /** 러닝 노트 — 무대 위 카드로 보여 준다 */
  note?: SharedNoteData | null;
  run?: { attemptId: string; attemptNo: number; code: string; detail: RecordDetail; completedAt: string | null; name: string; issuer?: string | null; photoUrl?: string | null; holo?: string | null } | null;
};

/**
 * 참여하려고 할 때만 가입을 권한다(사용자 2026-11-19).
 *   가입하기  비회원 지난 기록이 있으면 가입 뒤 그 결과로 돌아와 계정으로 옮긴다(이관 표)
 *   기록 보기 비회원은 이 링크 안의 지난 결과, 회원은 기록 화면
 */
function PastActions({ token, past, slug, btn, ghost }: { token: string; past: Shared["past"]; slug: string; btn: string; ghost: string }) {
  const next = past?.kind === "guest" && past.claimToken ? `/results/${past.attemptId}?claim=${past.claimToken}` : `/r/${token}`;
  const recordHref = past ? (past.kind === "guest" ? `/r/${token}/result/${past.attemptId}` : `/records/${slug}`) : null;
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
      <a className={btn} href={signupUrl(next)}>
        가입하고 더 하기 →
      </a>
      {recordHref ? (
        <a className={ghost} href={recordHref}>
          📜 지난 기록 보기
        </a>
      ) : null}
      <a className={ghost} href={loginUrl(next)}>
        이미 회원이면 로그인
      </a>
    </div>
  );
}

export default function SharedLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Shared | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  /** 비회원 한 번을 이미 썼다(409) — 가입 · 로그인 버튼을 함께 보여 준다(사용자 2026-11-14) */
  const [needSignup, setNeedSignup] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/shared/${encodeURIComponent(token)}?guestKey=${encodeURIComponent(getGuestKey())}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setMsg(json.error ?? "없는 링크예요.");
          return;
        }
        setData(json);
        // 비회원 한 번을 이미 썼으면 처음부터 안내 + 가입 · 기록 보기 버튼
        if (json.guestUsed) {
          setMsg("이미 참여한 기록이 있어요. 가입하면 더 할 수 있어요 — 지난 기록도 계정으로 옮겨져요.");
          setNeedSignup(true);
        }
      } catch {
        setMsg("네트워크가 불안정해요.");
      }
    })();
  }, [token]);

  const start = useCallback(async () => {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    setNeedSignup(false);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: data.quiz.slug, guestKey: getGuestKey(), viaToken: token }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok || !json.attemptId) {
        setMsg(json.error ?? "시작할 수 없어요.");
        setNeedSignup(res.status === 409);
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

  /** 러닝 노트 — 같은 틀(카드 → 나도 해보기), 옷은 이번 컨셉(어두운 무대 · 금빛 버튼) */
  if (data.note) {
    return (
      <SharedNote note={data.note}>
        <p className="nt-panel-eyebrow">Try it · 나도 내려 보기</p>
        <h2 className="nt-panel-title">{data.quiz.title}</h2>
        <p className="nt-panel-lead">{data.quiz.tagline}</p>
        <div className="nt-pills">
          {data.quiz.ageLabel ? <span>{data.quiz.ageLabel} 추천</span> : null}
          {data.quiz.itemCount ? <span>질문 {data.quiz.itemCount}개</span> : null}
          {data.quiz.estimatedMinutes ? <span>약 {data.quiz.estimatedMinutes}분</span> : null}
          <span>가입 없이 한 번</span>
        </div>
        {data.past?.kind === "member" ? (
          <p className="nt-panel-lead">
            📜 이 질문지에 {data.past.count}번 참여했어요 ·{" "}
            <a className="nt-link" href={`/records/${data.quiz.slug}`}>
              지난 기록 보기
            </a>
          </p>
        ) : null}
        {data.open && !needSignup ? (
          <div style={{ marginTop: 20 }}>
            <button type="button" className="nt-btn" onClick={() => void start()} disabled={busy}>
              {busy ? "여는 중…" : "나의 러닝 노트 내리기 →"}
            </button>
          </div>
        ) : needSignup ? null : (
          <p className="nt-fine">{data.notice ?? "지금은 할 수 없어요."}</p>
        )}
        {msg ? <p className="nt-fine">{msg}</p> : null}
        {needSignup ? <PastActions token={token} past={data.past ?? null} slug={data.quiz.slug} btn="nt-btn" ghost="nt-btn nt-btn--ghost" /> : null}
        {data.quiz.disclaimer ? <p className="nt-fine">{data.quiz.disclaimer}</p> : null}
      </SharedNote>
    );
  }

  return (
    <>
      <div className="shared-brand">
        <AppIcon size={36} />
        {/* 하단 myjane 워드마크와 같은 모양 — 앞은 짙게, 뒤는 그라디언트 */}
        <span className="myjane-mark shared-wordmark">
          type<span>log</span>
        </span>
      </div>

      {data.run ? (
        <>
          <SharedLicense run={data.run} />
          <Sheet
            center
            eyebrow="SHARED"
            headline={`🏅 ${data.run.name} 님의 러닝 자격증이에요`}
            lead="🤔 나의 러닝 자격증은 몇급일까요? 기록만 넣으면 바로 발급돼요 ⏱️"
          />
        </>
      ) : (
        <Sheet
          tone="dark"
          center
          eyebrow="SHARED"
          /**
           * 타입 이름을 문장에 끼우지 않고 **헤드라인으로 세운다.**
           *
           * "{누구}는 {이름}이 나왔어요" 처럼 쓰면 조사가 걸린다. 한글 이름은
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
              "공유된 타입이에요"
            )
          }
          lead={data.friend ? (data.friend.subtitle ?? null) : null}
        >
          <p className="result-summary" style={{ textAlign: "center" }}>
            나는 어떤 타입일까요? 지금 해볼 수 있어요.
          </p>
        </Sheet>
      )}

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

        {data.past?.kind === "member" ? (
          <p className="lead" style={{ marginTop: 12 }}>
            📜 이 질문지에 {data.past.count}번 참여했어요 ·{" "}
            <a href={`/records/${data.quiz.slug}`}>지난 기록 보기</a>
          </p>
        ) : null}
        {data.open && !needSignup ? (
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
        ) : needSignup ? null : (
          <p className="quiz-card-notice" style={{ marginTop: 16 }}>
            {data.notice ?? "지금은 할 수 없어요."}
          </p>
        )}

        {msg ? <p className="quiz-msg">{msg}</p> : null}
        {needSignup ? <PastActions token={token} past={data.past ?? null} slug={data.quiz.slug} btn="btn btn--primary" ghost="btn btn--ghost" /> : null}
        {data.quiz.disclaimer ? (
          <p className="result-fineprint">{data.quiz.disclaimer}</p>
        ) : null}
      </Sheet>
    </>
  );
}
