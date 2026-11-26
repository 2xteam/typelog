"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { Sheet } from "@/components/Sheet";
import { NoteCard } from "@/components/note/NoteCard";
import { buildCard, shellStyle } from "@/components/note/view";
import { kitOfSlug, type AxisDecl } from "@/components/note/palette";
import { noteFontVars } from "@/components/note/fonts";
import { StartLicense } from "@/components/StartLicense";
import { getGuestKey } from "@/lib/guestKey";
import { loginUrl, signupUrl } from "@/lib/portal";
import "@/components/note/note.css";

/**
 * 홍보 시작 화면(사용자 2026-11-21) — 아주 짧은 인트로 → 「시작」 → 바로 설문.
 * 인스타 프로필 링크용. 누구의 결과도 보여 주지 않고, 노트 화면 질문지면 예시 카드 세 장을 펼친다.
 * 비회원은 질문지당 한 번(POST /api/attempts 규칙). 이미 했으면 지난 기록 · 가입하고 더 하기 · 로그인.
 * 끝나면 /start/[slug]/result/[id] — 공유 링크 결과와 같은 화면.
 */
type Past = { kind: "guest" | "member"; attemptId: string; claimToken: string | null; count: number } | null;
type Data = {
  quiz: {
    slug: string;
    title: string;
    tagline: string;
    emoji: string | null;
    itemCount: number;
    estimatedMinutes: number | null;
    ageLabel: string | null;
    disclaimer: string | null;
    experience: string | null;
    typeCount: number | null;
  };
  open: boolean;
  notice: string | null;
  guestUsed: boolean;
  past: Past;
  note: { axes: AxisDecl[]; types: { code: string; name: string }[] } | null;
};

/** 인트로 한 줄 — 노트별 */
const HOOK: Record<string, [string, string]> = {
  run: ["당신의 러닝,", "무슨 맛이에요?"],
  kids: ["당신의 성향,", "무슨 맛이에요?"],
};

export default function StartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/start/${encodeURIComponent(slug)}?guestKey=${encodeURIComponent(getGuestKey())}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setMsg(json.error ?? "열 수 없는 질문지예요.");
          return;
        }
        setData(json);
        setBlocked(!!json.guestUsed);
      } catch {
        setMsg("네트워크가 불안정해요.");
      }
    })();
  }, [slug]);

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
        setBlocked(res.status === 409);
        return;
      }
      router.push(`/start/${data.quiz.slug}/play/${json.attemptId}`);
    } catch {
      setMsg("네트워크가 불안정해요.");
    } finally {
      setBusy(false);
    }
  }, [data, router]);

  // 예시 카드 세 장 — 유형 셋을 골라 그 코드대로 축을 기울인다(같은 예시는 늘 같은 색 · 무늬)
  const samples = useMemo(() => {
    const n = data?.note;
    if (!n || n.types.length < 3) return [];
    const pick = [n.types[0], n.types[Math.floor(n.types.length / 2)], n.types[n.types.length - 1]];
    const kit = kitOfSlug(slug);
    return pick.map((t, i) =>
      buildCard({
        attemptId: `start-${slug}-${t.code}-${i}`,
        attemptNo: i + 1,
        code: t.code,
        typeName: t.name,
        completedAt: null,
        runner: kit.personKo,
        axes: n.axes,
        pomp: Object.fromEntries(n.axes.map((a, k) => [a.id, t.code[k] === a.left?.code ? (i % 2 ? 0 : 33) : i % 2 ? 100 : 67])),
      }),
    );
  }, [data, slug]);

  if (msg && !data) {
    return (
      <Sheet center eyebrow="TYPELOG" headline="열 수 없어요">
        <p className="lead">{msg}</p>
      </Sheet>
    );
  }
  if (!data) return null;

  const kit = kitOfSlug(slug);
  const next = data.past?.kind === "guest" && data.past.claimToken ? `/results/${data.past.attemptId}?claim=${data.past.claimToken}` : `/start/${slug}`;
  const pills = (
    <div className="nt-pills">
      {data.quiz.typeCount ? <span>{data.quiz.typeCount}가지 타입</span> : null}
      {data.quiz.itemCount ? <span>질문 {data.quiz.itemCount}개</span> : null}
      {data.quiz.estimatedMinutes ? <span>약 {data.quiz.estimatedMinutes}분</span> : null}
      {data.quiz.ageLabel ? <span>{data.quiz.ageLabel} 추천</span> : null}
      <span>가입 없이 한 번</span>
    </div>
  );
  const actions = blocked ? (
    <>
      <p className="nt-fine st-blocked">이미 한 번 참여했어요. 가입하면 더 할 수 있어요 — 지난 기록도 계정으로 옮겨져요.</p>
      <div className="st-actions">
        <a className="nt-btn" href={signupUrl(next)}>
          가입하고 더 하기 →
        </a>
        {data.past?.kind === "guest" ? (
          <a className="nt-btn nt-btn--ghost" href={`/start/${slug}/result/${data.past.attemptId}`}>
            📜 지난 기록 보기
          </a>
        ) : null}
        <a className="nt-btn nt-btn--ghost" href={loginUrl(next)}>
          이미 회원이면 로그인
        </a>
      </div>
    </>
  ) : data.open ? (
    <div className="st-actions">
      <button type="button" className="nt-btn st-go" onClick={() => void start()} disabled={busy}>
        {busy ? "여는 중…" : data.quiz.experience === "note" ? `나의 ${kit.brandKo} 내리기 →` : "시작하기 →"}
      </button>
      {data.past?.kind === "member" ? (
        <a className="nt-link st-past" href={`/records/${slug}`}>
          📜 지난 기록 보기 · {data.past.count}번 참여
        </a>
      ) : null}
    </div>
  ) : (
    <p className="nt-fine">{data.notice ?? "지금은 할 수 없어요."}</p>
  );

  // 노트 화면 질문지 — 무대 위에 예시 카드 세 장
  if (data.quiz.experience === "note" && samples.length) {
    const [h1, h2] = HOOK[kit.id] ?? HOOK.run;
    return (
      <div className={`nt ${noteFontVars}`}>
        <div className="nt-shell st-shell" style={shellStyle(samples[1].picks[0])}>
          <p className="nt-eyebrow">
            <span>{kit.brand}</span>
            <span>{data.quiz.typeCount ? `${data.quiz.typeCount} Types` : "TypeLog"}</span>
          </p>
          <h1 className="st-hook">
            {h1}
            <br />
            <em>{h2}</em> ☕
          </h1>
          <p className="st-sub">{data.quiz.tagline}</p>
          <div className="st-fan" aria-hidden="true">
            {samples.map((c, i) => (
              <div key={c.attemptId} className={`st-card st-card--${i}`}>
                <NoteCard card={c} back={false} />
              </div>
            ))}
          </div>
          <p className="st-note">🎲 같은 타입이어도 똑같은 노트는 안 나와요</p>
          {pills}
          {actions}
          {msg ? <p className="nt-fine">{msg}</p> : null}
          {data.quiz.disclaimer ? <p className="nt-fine">{data.quiz.disclaimer}</p> : null}
        </div>
      </div>
    );
  }

  if (data.quiz.experience === "running") {
    return (
      <StartLicense>
        {pills}
        {actions}
        {msg ? <p className="nt-fine">{msg}</p> : null}
        {data.quiz.disclaimer ? <p className="nt-fine">{data.quiz.disclaimer}</p> : null}
      </StartLicense>
    );
  }

  // 그 밖의 질문지 — 간단한 시트 하나
  return (
    <Sheet center eyebrow="TYPELOG" headline={`${data.quiz.emoji ?? ""} ${data.quiz.title}`.trim()}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <AppIcon size={36} />
      </div>
      <p className="lead">{data.quiz.tagline}</p>
      {pills}
      <div style={{ marginTop: 18 }}>{actions}</div>
      {msg ? <p className="lead">{msg}</p> : null}
    </Sheet>
  );
}
