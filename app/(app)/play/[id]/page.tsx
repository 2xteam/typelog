"use client";

import { use } from "react";
import { PlayFlow } from "@/components/PlayFlow";

/** 앱 안에서 푸는 껍데기. 흐름 자체는 components/PlayFlow.tsx 하나뿐이다 */
export default function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PlayFlow attemptId={id} resultPath={`/results/${id}`} />;
}
