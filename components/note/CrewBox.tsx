"use client";

import { useCallback, useEffect, useState } from "react";
import { getGuestKey } from "@/lib/guestKey";
import { copyText, ensureShareUrl } from "./crew";

/**
 * 결과 화면 무대 안 「내 러닝 크루」 칸(사용자 2026-11-21) — 본인에게만.
 * 내 링크로 들어와 끝낸 사람 수 · 크루 보기 · 초대 링크 복사. 링크를 잃어버리지 않게 링크도 여기 늘 보여 준다.
 */
export function CrewBox({ attemptId, brandKo }: { attemptId: string; brandKo: string }) {
  const [state, setState] = useState<{ n: number; url: string | null } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/crew?guestKey=${encodeURIComponent(getGuestKey())}`);
        const json = await res.json();
        if (res.ok && json.ok) setState({ n: json.crew.length, url: json.shareUrl });
      } catch {
        /* 칸 없이 */
      }
    })();
  }, [attemptId]);

  const invite = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const url = state?.url ?? (await ensureShareUrl(attemptId));
      setState((s) => ({ n: s?.n ?? 0, url }));
      const ok = await copyText(url);
      setMsg(ok ? "✅ 초대 링크를 복사했어요. 크루 단톡방에 붙여 넣어 보세요!" : "링크를 길게 눌러 복사해 주세요.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [attemptId, state]);

  if (!state) return null;
  return (
    <section className="ncr-box" aria-label="내 러닝 크루">
      <div className="ncr-top">
        <p className="ncr-eyebrow">My Crew</p>
        <p className="ncr-count">
          {state.n ? (
            <>
              내 링크로 <b>{state.n}명</b>이 노트를 내렸어요
            </>
          ) : (
            <>링크를 공유하면, 들어온 크루의 카드가 여기 모여요</>
          )}
        </p>
      </div>
      <div className="ncr-btns">
        <a className="nt-btn nt-btn--ghost ncr-see" href={`/crew/${attemptId}`}>
          👥 내 크루 보기{state.n ? ` · ${state.n}` : ""}
        </a>
        <button type="button" className="nt-btn nt-btn--main ncr-invite" onClick={() => void invite()} disabled={busy}>
          🔗 크루 초대 링크 복사
        </button>
      </div>
      {state.url ? (
        <p className="ncr-url">
          내 초대 링크 · <span>{state.url.replace(/^https?:\/\//, "")}</span>
        </p>
      ) : null}
      {msg ? <p className="nt-msg">{msg}</p> : null}
      <p className="ncr-fine">초대 링크로 {brandKo}를 내린 사람의 카드만 모여요. 이 화면은 나만 볼 수 있어요.</p>
    </section>
  );
}
