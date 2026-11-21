"use client";

import { use } from "react";
import { ResultView } from "@/components/ResultView";

/** 홍보 시작 화면 안에서 보는 결과 껍데기 — 공유 링크 결과와 같다 */
export default function StartResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResultView attemptId={id} bare />;
}
