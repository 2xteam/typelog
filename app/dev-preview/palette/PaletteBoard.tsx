"use client";

import { useMemo } from "react";
import { NoteDeck } from "@/components/note/NoteDeck";
import { buildCard } from "@/components/note/view";
import { noteFontVars } from "@/components/note/fonts";
import "@/components/note/note.css";
import "./palette.css";

type Q = {
  outcomes: { id: string; label: string; left: { code: string; label: string }; right: { code: string; label: string } }[];
  resultTypes: { code: string; name: string; subtitle: string; content: { strengths: string[]; goodWith?: string[] } }[];
};

type Swatch = { name: string; hex: string; role: string; dark?: boolean };
type Direction = { key: string; title: string; mood: string; swatches: Swatch[] };

/**
 * 디자이너 리뷰(2026-11-18):
 *  - 보라는 그라데이션 · 잉크 플루이드처럼 섞으면 어울리기 어렵다 → 단색으로 강하게 누르고 포인트
 *  - 심야 러너라면 미드나잇 블루 · 딥 네이비, 포인트는 네온(활동성)
 *  - 글꼴은 고딕, Noto Sans
 *  - 페이지 배경은 보라를 톤 다운해 핑크와 섞어 차분하되 경쾌하게
 */
const DIRECTIONS: Direction[] = [
  {
    key: "a",
    title: "A · Midnight Volt",
    mood: "딥 네이비 단색 + 볼트 라임 한 가지 포인트. 가장 깔끔하게 떨어지는 안",
    swatches: [
      { name: "MIDNIGHT", hex: "#0B1430", role: "무대 · 판 바탕", dark: true },
      { name: "DEEP NAVY", hex: "#16224A", role: "바닥 · 보조 면", dark: true },
      { name: "VOLT LIME", hex: "#D0FF41", role: "포인트 · 주 버튼" },
      { name: "CLOUD DANCER", hex: "#F0EEE9", role: "글자" },
      { name: "SILVER CLOUD", hex: "#C6D0DD", role: "흐린 글자 · 선" },
    ],
  },
  {
    key: "b",
    title: "B · Night Pace",
    mood: "미드나잇 블루 단색 + 페이스 파이어 오렌지 포인트. 더 뜨겁고 경쾌한 안",
    swatches: [
      { name: "MIDNIGHT BLUE", hex: "#0E1A3D", role: "무대 · 판 바탕", dark: true },
      { name: "ELITE BLUE", hex: "#0250B0", role: "바닥 빛 · 보조", dark: true },
      { name: "PACE FIRE", hex: "#FF5C34", role: "포인트 · 주 버튼" },
      { name: "START LINE", hex: "#FFF0EB", role: "글자" },
      { name: "SILVER CLOUD", hex: "#C6D0DD", role: "흐린 글자 · 선" },
    ],
  },
  {
    key: "c",
    title: "C · Night Track",
    mood: "딥 네이비 단색 + 네온 두 가지(라임 주 · 오렌지 보조). 활동성을 가장 크게",
    swatches: [
      { name: "DARKEST HOUR", hex: "#0A1024", role: "무대 · 판 바탕", dark: true },
      { name: "DEEP NAVY", hex: "#16224A", role: "바닥 · 보조 면", dark: true },
      { name: "SUN GLARE", hex: "#E4FF1A", role: "포인트 1 · 주 버튼" },
      { name: "EXUBERANT ORANGE", hex: "#FF5C34", role: "포인트 2 · 강조" },
      { name: "CLOUD DANCER", hex: "#F0EEE9", role: "글자" },
    ],
  },
];

/** 페이지 배경 — 보라를 톤 다운해 핑크와 섞은 차분하고 경쾌한 바탕(셋 공통 제안) */
const PAGE: Swatch[] = [
  { name: "MAUVE MIST", hex: "#E7DFEC", role: "페이지 바탕" },
  { name: "DUSTY ROSE", hex: "#EFD9E2", role: "바탕 섞임(핑크)" },
  { name: "PLUM ASH", hex: "#8E7C99", role: "바탕 위 보조 글자", dark: true },
];

export function PaletteBoard({ quiz }: { quiz: Q }) {
  const card = useMemo(() => {
    const t = quiz.resultTypes.find((r) => r.code === "PSAF") ?? quiz.resultTypes[0];
    const pomp = Object.fromEntries(quiz.outcomes.map((o, i) => [o.id, t.code[i] === o.left.code ? 0 : 100]));
    return buildCard({
      attemptId: "palette-preview-01",
      attemptNo: 5,
      code: t.code,
      typeName: t.name,
      completedAt: new Date().toISOString(),
      runner: "미리보기",
      axes: quiz.outcomes,
      pomp,
      strengths: t.content.strengths,
      goodWith: t.content.goodWith,
    });
  }, [quiz]);

  return (
    <main className={`pp ${noteFontVars}`}>
      <header className="pp-head">
        <p>RUNNING NOTE · COLOR REVIEW</p>
        <h1>러닝 노트 색상 방향</h1>
        <p className="pp-lead">
          디자이너 리뷰 반영 — 보라 그라데이션 무대를 걷고 <b>단색 딥 네이비 · 미드나잇 블루</b>에 <b>네온 포인트</b>, 글꼴은
          <b> Noto Sans</b>. 페이지 바탕은 톤 다운한 보라 + 핑크. (로컬 미리보기 · 배포 안 함)
        </p>
      </header>

      <section className="pp-page">
        <p className="pp-label">PAGE BACKGROUND · 페이지 바탕(공통)</p>
        <div className="pp-chips">
          {PAGE.map((s) => (
            <Chip key={s.hex} s={s} />
          ))}
        </div>
      </section>

      <div className="pp-grid">
        {DIRECTIONS.map((d) => (
          <section key={d.key} className={`pp-dir pp-${d.key}`}>
            <h2>{d.title}</h2>
            <p className="pp-mood">{d.mood}</p>
            <div className="pp-chips pp-chips--col">
              {d.swatches.map((s) => (
                <Chip key={s.hex + s.name} s={s} />
              ))}
            </div>
            {/* 실제 결과 화면 모양 — 무대 · 카드 · 버튼 */}
            <div className="nt pp-nt">
              <div className="nt-shell">
                <p className="nt-eyebrow">
                  <span>Running Note</span>
                  <span>No. 05</span>
                </p>
                <h1 className="nt-head">
                  <span>{card.code}</span> {card.typeName}
                </h1>
                <NoteDeck cards={[card]} allowList={false} />
                <div className="nt-actions">
                  <button type="button" className="nt-btn nt-btn--main">
                    공유하기
                  </button>
                  <button type="button" className="nt-btn nt-btn--ghost">
                    이미지 저장
                  </button>
                </div>
              </div>
              <div className="nt-panel">
                <p className="nt-panel-eyebrow">Tasting · 맛평가</p>
                <h2 className="nt-panel-title">가볍게 매일 나가는 산책러</h2>
                <p className="nt-panel-text">짧게, 매일, 혼자 나가요. 힘들게 안 해서 오히려 하루도 안 빼먹어요.</p>
                <div className="pp-tags">
                  <span className="pp-tag pp-tag--on">강점</span>
                  <span className="pp-tag">조심</span>
                  <span className="pp-tag">한 잔 더</span>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Chip({ s }: { s: Swatch }) {
  return (
    <div className="pp-chip">
      <i style={{ background: s.hex }} />
      <div>
        <b>{s.name}</b>
        <code>{s.hex}</code>
        <span>{s.role}</span>
      </div>
    </div>
  );
}
