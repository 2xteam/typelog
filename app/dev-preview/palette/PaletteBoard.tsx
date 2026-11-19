"use client";

import { useMemo, useState } from "react";
import { NoteDeck } from "@/components/note/NoteDeck";
import { buildCard, lookOf, shellStyle } from "@/components/note/view";
import { GRAIN } from "@/components/note/NoteCard";
import { noteFontVars } from "@/components/note/fonts";
import { POLES, glowOn, lightestOf, stageOf } from "@/components/note/palette";
import "@/components/note/note.css";
import "./palette.css";

type Q = {
  outcomes: { id: string; label: string; left: { code: string; label: string }; right: { code: string; label: string } }[];
  resultTypes: { code: string; name: string; subtitle: string; content: { strengths: string[]; goodWith?: string[] } }[];
};

/**
 * 디자인 리뷰 — 확정한 색 체계와 카드 뷰어(사용자 2026-11-19).
 *   선택한 디자인  미드나잇 네이비 단색 + 볼트 라임 포인트, 페이지 바탕, 32색 색표
 *   카드 뷰어      유형 16개 · 축마다 진하게/은은하게를 골라 본다
 *   랜덤 키        같은 카드라도 섞임은 기록 번호(키)로 정해진다 — 키를 바꿔 다른 섞임을 본다
 *   전부 랜덤      유형 · 세기 · 키를 모두 무작위로
 */
const CHOSEN = [
  { name: "MIDNIGHT", hex: "#0B1430", role: "무대 · 판 바탕" },
  { name: "DEEP NAVY", hex: "#16224A", role: "바닥 · 보조 면" },
  { name: "VOLT LIME", hex: "#D0FF41", role: "포인트 · 주 버튼" },
  { name: "CLOUD DANCER", hex: "#F0EEE9", role: "글자" },
  { name: "SILVER CLOUD", hex: "#C6D0DD", role: "흐린 글자 · 선" },
  { name: "MAUVE MIST", hex: "#E7DFEC", role: "페이지 바탕" },
  { name: "DUSTY ROSE", hex: "#EFD9E2", role: "페이지 바탕 섞임" },
];

const rand = () => Math.random().toString(36).slice(2, 10);

export function PaletteBoard({ quiz }: { quiz: Q }) {
  const [code, setCode] = useState("PLIR");
  const [strong, setStrong] = useState([true, false, true, false]);
  const [key, setKey] = useState("review01");

  const type = quiz.resultTypes.find((t) => t.code === code) ?? quiz.resultTypes[0];

  const card = useMemo(() => {
    const pomp = Object.fromEntries(
      quiz.outcomes.map((o, i) => {
        const left = type.code[i] === o.left.code;
        return [o.id, left ? (strong[i] ? 0 : 33.3) : strong[i] ? 100 : 66.7];
      }),
    );
    return buildCard({
      attemptId: `preview-${key}`,
      attemptNo: 5,
      code: type.code,
      typeName: type.name,
      completedAt: new Date().toISOString(),
      runner: "미리보기",
      axes: quiz.outcomes,
      pomp,
      strengths: type.content.strengths,
      goodWith: type.content.goodWith,
    });
  }, [quiz, type, strong, key]);
  const theme = lookOf(card).theme;

  const allRandom = () => {
    setCode(quiz.resultTypes[Math.floor(Math.random() * quiz.resultTypes.length)].code);
    setStrong([0, 1, 2, 3].map(() => Math.random() < 0.5));
    setKey(rand());
  };

  return (
    <main className={`pp ${noteFontVars}`}>
      <header className="pp-head">
        <p>RUNNING NOTE · DESIGN REVIEW</p>
        <h1>러닝 노트 디자인</h1>
        <p className="pp-lead">확정한 색 체계와 카드 뷰어예요. 유형 · 세기를 골라 보고, 랜덤 키로 섞임이 어떻게 달라지는지 확인해요.</p>
      </header>

      <section className="pp-sec">
        <p className="pp-label">SELECTED · 선택한 디자인 — Midnight Volt</p>
        <div className="pp-chips">
          {CHOSEN.map((s) => (
            <Chip key={s.hex} name={s.name} hex={s.hex} role={s.role} />
          ))}
        </div>
      </section>

      <div className="pp-viewer">
        <section className="pp-controls">
          <p className="pp-label">TYPE · 유형</p>
          <div className="pp-types">
            {quiz.resultTypes.map((t) => (
              <button key={t.code} type="button" data-on={t.code === code} onClick={() => setCode(t.code)} title={t.name}>
                {t.code}
              </button>
            ))}
          </div>

          <p className="pp-label">STRENGTH · 축마다 세기</p>
          <div className="pp-axes">
            {quiz.outcomes.map((o, i) => {
              const side = type.code[i] === o.left.code ? o.left : o.right;
              return (
                <div key={o.id} className="pp-axis">
                  <span>{side.label}</span>
                  <div>
                    <button type="button" data-on={strong[i]} onClick={() => setStrong((s) => s.map((v, k) => (k === i ? true : v)))}>
                      진하게
                    </button>
                    <button type="button" data-on={!strong[i]} onClick={() => setStrong((s) => s.map((v, k) => (k === i ? false : v)))}>
                      은은하게
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="pp-label">KEY · 섞임 키</p>
          <div className="pp-key">
            <code>{key}</code>
            <button type="button" className="pp-btn" onClick={() => setKey(rand())}>
              🎲 랜덤 키
            </button>
            <button type="button" className="pp-btn pp-btn--ghost" onClick={allRandom}>
              전부 랜덤
            </button>
          </div>

          <p className="pp-label">STAGE · 무대 · 뒷면에 쓰는 색(첫 색 계열에서)</p>
          <div className="pp-chips pp-chips--col">
            <Chip name="강조 · 버튼" hex={glowOn(lightestOf(card.picks[0]) ?? "#D0FF41")} role="첫 색 계열의 가장 옅은 색" />
            <Chip name="카드 뒷면 · 아래 판" hex={theme.back} role={`글자 ${theme.backInk}`} />
            {card.picks[0] ? <Chip name="무대 바탕" hex={stageOf(card.picks[0].color.hex).base} role="고른 첫 색을 아주 어둡게" /> : null}
          </div>

          <p className="pp-label">IDENTITY COLOR · 이 카드의 색</p>
          <div className="pp-chips pp-chips--col">
            {card.picks.map((p) => (
              <Chip key={p.id} name={p.color.en.toUpperCase()} hex={p.color.hex} role={`${p.pole} · ${p.strong ? "진하게" : "은은하게"}`} />
            ))}
          </div>
        </section>

        <section className="nt pp-nt">
          {/* 결과 화면과 같은 무대 색 · 버튼 · 아래 판(사용자 2026-11-19 — 팔레트에서도 같게) */}
          <div className="nt-shell" style={shellStyle(card.picks[0])}>
            <p className="nt-eyebrow">
              <span>Running Note</span>
              <span>No. 05</span>
            </p>
            <h1 className="nt-head">
              <span>{card.code}</span> {card.typeName}
            </h1>
            <p className="nt-sub">{type.subtitle}</p>
            <NoteDeck key={card.attemptId + card.code + strong.join("")} cards={[card]} allowList={false} />
            <div className="nt-namebox">
              <p className="nt-panel-eyebrow">Runner · 카드에 적힐 이름</p>
              <div className="nt-name">
                <input defaultValue="미리보기" aria-label="카드에 적힐 이름(보기용)" />
                <button type="button" className="nt-chip nt-chip--main">바꾸기</button>
              </div>
            </div>
            <div className="nt-actions">
              <button type="button" className="nt-btn nt-btn--main">공유하기</button>
              <button type="button" className="nt-btn nt-btn--ghost">이미지 저장</button>
            </div>
          </div>
          <section className="nt-panel nt-panel--back" style={{ "--pb": theme.back, "--pi": theme.backInk, backgroundImage: GRAIN } as React.CSSProperties}>
            <p className="nt-panel-eyebrow">Identity Color · 아이덴티티 컬러</p>
            <h2 className="nt-panel-title">성향이 내린 나만의 네 가지 색</h2>
            <ul className="nt-swatches">
              {card.picks.map((p) => (
                <li key={p.id}>
                  <i style={{ background: p.color.hex }} aria-hidden="true" />
                  <div>
                    <b>{p.color.ko}</b>
                    <span>
                      {p.pole} · {p.strong ? "진하게" : "은은하게"} · {p.color.hex.toUpperCase()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </section>
      </div>

      <section className="pp-sec">
        <p className="pp-label">PALETTE · 32색 색표 (성향마다 진하게 둘 · 은은하게 둘)</p>
        <div className="pp-poles">
          {POLES.map((pole) => (
            <div key={pole.code} className="pp-pole">
              <b>
                {pole.code} · {pole.ko}
              </b>
              <div>
                {pole.colors.map((c) => (
                  <span key={c.hex} style={{ background: c.hex }} title={`${c.en} ${c.hex}`}>
                    <i>{c.en}</i>
                    <em>{c.hex}</em>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Chip({ name, hex, role }: { name: string; hex: string; role: string }) {
  return (
    <div className="pp-chip">
      <i style={{ background: hex }} />
      <div>
        <b>{name}</b>
        <code>{hex}</code>
        <span>{role}</span>
      </div>
    </div>
  );
}
