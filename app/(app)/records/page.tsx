"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";

/**
 * 기록 — **그래프를 쓰지 않는다.**
 *
 * 성향에는 "늘었다·줄었다"로 읽을 수치가 없고, 숫자로 증명하지 않는 것이
 * 이 앱의 톤이다. 지난 기록을 다시 볼 수 있으면 된다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

type Record = {
  slug: string;
  title: string;
  emoji: string | null;
  attemptCount: number;
  latest: { attemptId: string; attemptNo: number; code: string | null; name: string | null; emoji: string | null } | null;
  collection: { code: string; name: string; emoji: string; found: boolean; attemptId?: string | null }[];
  foundCount: number;
  totalCount: number;
};

export default function RecordsPage() {
  const [records, setRecords] = useState<Record[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/records");
        const data = (await res.json()) as { records?: Record[] };
        setRecords(data.records ?? []);
      } catch {
        setRecords([]);
      }
    })();
  }, []);

  if (records === null) return null;

  if (records.length === 0) {
    return (
      <Sheet eyebrow="RECORDS" headline="아직 기록이 없어요">
        <p className="lead">
          테스트를 마치면 회차별로 여기 쌓여요.
          <br />
          다시 해보면 지난번과 무엇이 달라졌는지 함께 보여드려요.
        </p>
        <div style={{ marginTop: 20 }}>
          <Link className="btn btn--primary" href="/types">
            타입 찾아보기 →
          </Link>
        </div>
      </Sheet>
    );
  }

  return (
    <>
      {records.map((r) => (
        <Sheet
          key={r.slug}
          eyebrow="MY COLLECTION"
          headline={`${r.emoji ?? ""} ${r.title}`.trim()}
        >
          <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
            <span className="pill">{r.attemptCount}번 해봤어요</span>
            <span className="pill pill--gold">
              도감 {r.foundCount} / {r.totalCount}
            </span>
            {r.latest?.name ? (
              <Link className="pill pill--link" href={`/results/${r.latest.attemptId}`}>
                지난번 {r.latest.emoji} {r.latest.name} →
              </Link>
            ) : null}
          </div>

          <div className="dex">
            {/* 나온 타입은 누르면 그 타입이 나온 가장 최근 회차의 결과로 */}
            {r.collection.map((c) =>
              c.found && c.attemptId ? (
                <Link
                  key={c.code}
                  href={`/results/${c.attemptId}`}
                  className="dex-cell dex-cell--link"
                  data-found="true"
                  title={`${c.name} — 가장 최근 결과 보기`}
                >
                  <span className="dex-emoji" aria-hidden="true">
                    {c.emoji}
                  </span>
                  <span className="dex-name">{c.name}</span>
                </Link>
              ) : (
                <div key={c.code} className="dex-cell" data-found={c.found} title={c.found ? c.name : "아직 안 나왔어요"}>
                  <span className="dex-emoji" aria-hidden="true">
                    {c.found ? c.emoji : "?"}
                  </span>
                  <span className="dex-name">{c.found ? c.name : "???"}</span>
                </div>
              ),
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            <Link className="btn btn--ghost btn--sm" href={`/records/${r.slug}`}>
              회차 보기 →
            </Link>
            <Link className="btn btn--ghost btn--sm" href="/types">
              다시 해보기
            </Link>
          </div>
        </Sheet>
      ))}
    </>
  );
}
