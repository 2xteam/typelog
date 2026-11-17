import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { resolveRecord } from "@/lib/record";
import type { Cutoffs } from "@/lib/quizTypes";
import { RunResult, type RunPayload } from "@/components/run/RunResult";

/**
 * 개발용 미리보기 — 러닝 결과 화면을 **DB 없이** 그린다(로컬에서만, 운영은 404).
 *   /dev-preview/run?g=m&d=10k&t=4500     성별 · 거리 · 기록(초)
 * 질문지 JSON 의 기준표로 등급 · 현상수배를 계산해 RunResult 에 넣는다.
 */
export const dynamic = "force-dynamic";

const KM: Record<string, number> = { "5k": 5, "10k": 10, half: 21.0975, full: 42.195 };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const q = await searchParams;
  const g = q.g ?? "m";
  const d = q.d ?? "10k";
  const t = Number(q.t ?? 3000);
  const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/quizzes/running-record.json"), "utf8"));
  const cut = json.resolver.cutoffs as Cutoffs;
  const r = resolveRecord(cut, { gender: g, distance: d, km: KM[d], seconds: t });
  if (!r) return <p>계산할 수 없어요.</p>;
  const type = json.resultTypes.find((x: { code: string }) => x.code === r.code);
  const data = {
    attemptId: `devprev${g}${d}${t}`.padEnd(24, "0").slice(0, 24),
    attemptNo: 1,
    isOwner: false,
    ownerName: q.name ?? "미리보기",
    quiz: { slug: "running-record", title: json.quiz.title, disclaimer: null },
    answers: [{ linkId: "race", value: q.race ?? null }],
    custom: null,
    result: { code: r.code, detail: r.detail, completedAt: new Date().toISOString(), type },
  } as unknown as RunPayload;
  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: 16 }}>
      <p style={{ fontFamily: "monospace", fontSize: 12 }}>
        {g} {d} {t}s → {r.code} {r.detail.wanted ? `wanted:${r.detail.wanted}` : ""}
      </p>
      <RunResult data={data} bare />
    </main>
  );
}
