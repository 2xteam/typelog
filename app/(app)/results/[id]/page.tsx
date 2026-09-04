"use client";

import { use } from "react";
import { ResultView } from "@/components/ResultView";

/** 앱 안에서 보는 껍데기. 화면은 components/ResultView.tsx 하나뿐이다 */
export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResultView attemptId={id} />;
}
