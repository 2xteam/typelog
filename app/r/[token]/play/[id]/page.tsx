"use client";

import { use } from "react";
import { PlayFlow } from "@/components/PlayFlow";

/** 공유 링크 안에서 푸는 껍데기 — 끝나면 같은 껍데기의 결과로 간다 */
export default function SharedPlayPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = use(params);
  return <PlayFlow attemptId={id} resultPath={`/r/${token}/result/${id}`} />;
}
