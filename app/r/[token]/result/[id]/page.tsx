"use client";

import { use } from "react";
import { ResultView } from "@/components/ResultView";

/** 공유 링크 안에서 보는 결과 껍데기 */
export default function SharedResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResultView attemptId={id} bare />;
}
