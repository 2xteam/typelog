"use client";

import { use } from "react";
import { PlayFlow } from "@/components/PlayFlow";

/** 홍보 시작 화면 안에서 푸는 껍데기 — 끝나면 같은 껍데기의 결과로 간다(회원 · 비회원 모두) */
export default function StartPlayPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  return <PlayFlow attemptId={id} resultPath={`/start/${slug}/result/${id}`} />;
}
