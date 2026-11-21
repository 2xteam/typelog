"use client";

import { useEffect, useState } from "react";
import { copyText } from "./crew";

/**
 * 모은 카드 화면 아래 「내 크루 · 공유 링크」(사용자 2026-11-21) — 회원이 링크를 잊지 않게.
 * 공유 링크를 만든 회차마다 링크 · 들어온 크루 수 · 내 크루 보기.
 */
type Link = { attemptId: string; attemptNo: number; code: string; shareUrl: string; views: number; crew: number };

export function MyLinks({ slug }: { slug: string }) {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/crew?slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (res.ok && json.ok) setLinks(json.links);
      } catch {
        /* 칸 없이 */
      }
    })();
  }, [slug]);
  if (!links) return null;
  const total = links.reduce((a, l) => a + l.crew, 0);
  return (
    <section className="nt-panel ncr-links">
      <p className="nt-panel-eyebrow">My Crew · 내 공유 링크</p>
      <h2 className="nt-panel-title">{total ? `내 링크로 모인 크루 ${total}명` : "크루를 모아 볼까요?"}</h2>
      {links.length ? (
        <ul>
          {links.map((l) => (
            <li key={l.attemptId}>
              <div>
                <b>
                  No.{String(l.attemptNo).padStart(2, "0")} · {l.code}
                </b>
                <span>{l.shareUrl.replace(/^https?:\/\//, "")}</span>
              </div>
              <div className="ncr-links-btns">
                <button
                  type="button"
                  className="nt-chip"
                  onClick={async () => {
                    if (await copyText(l.shareUrl)) {
                      setCopied(l.attemptId);
                      setTimeout(() => setCopied(null), 2000);
                    }
                  }}
                >
                  {copied === l.attemptId ? "복사됨 ✓" : "링크 복사"}
                </button>
                <a className="nt-chip nt-chip--main" href={`/crew/${l.attemptId}`}>
                  👥 크루 {l.crew}
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="nt-panel-lead">아직 공유한 링크가 없어요. 결과 화면의 「크루 초대 링크 복사」로 링크를 만들면, 들어온 사람의 카드가 내 크루에 모여요.</p>
      )}
    </section>
  );
}
