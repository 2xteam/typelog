"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";

/**
 * 질문지 목록 — 탭 두 개로 나눈다.
 *
 * 아직 열리지 않은 질문지를 잠긴 카드로 섞어 두지 않는다. 섞어 두면 목록을
 * 훑다 잠긴 카드를 계속 만나 김이 샌다. `Coming Soon` 이 비어 있으면 탭 자체를
 * 감춘다 — 빈 탭을 눌러 보게 하지 않는다.
 *
 * 데이터는 아직 없다. 모델(`quizzes`)과 목록 API 가 붙으면 여기서 읽는다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */
type Tab = "open" | "soon";

export default function TypesPage() {
  const [tab, setTab] = useState<Tab>("open");

  /** 오픈 예정이 하나도 없으면 탭을 감춘다 */
  const comingSoon: unknown[] = [];
  const showTabs = comingSoon.length > 0;

  return (
    <>
      <Sheet eyebrow={tab === "open" ? "ALL TYPES" : "COMING SOON"} headline="어떤 타입이 나와 가장 가까울까요?">
        {showTabs ? (
          <div className="tabs" role="tablist" style={{ marginTop: 18 }}>
            <button
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === "open"}
              onClick={() => setTab("open")}
            >
              지금 해보기
            </button>
            <button
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === "soon"}
              onClick={() => setTab("soon")}
            >
              오픈 예정
            </button>
          </div>
        ) : null}

        <p className="lead">
          아직 등록된 질문지가 없어요.
          <br />
          관리자 화면에서 질문지를 올리면 여기 나와요.
        </p>
      </Sheet>
    </>
  );
}
