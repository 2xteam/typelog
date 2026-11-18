"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getGuestKey } from "@/lib/guestKey";
import { useSession } from "@/lib/useSession";
import { NoteDeck } from "./NoteDeck";
import { NoteExport } from "./NoteExport";
import { Wheel } from "./Wheel";
import { buildCard, splitOutcomes, type NoteCardData } from "./view";
import { noteFontVars } from "./fonts";
import type { AxisDecl } from "./palette";
import "./note.css";

/**
 * 러닝 노트 결과 — 무대 위 카드 한 장 + 아이덴티티 컬러 + 맛평가(긴 문장).
 *
 * - 카드: 이번 카드 한 장(→ NoteDeck.tsx, 목록 없음). 왼쪽으로 밀거나 누르면 뒤집힌다. 처음 한 번 등장 연출
 * - 이름 바꾸기는 카드 바로 아래, 지난 카드는 「모은 카드 보기」(기록 화면의 덱 목록)
 * - 아이덴티티 컬러: 원판에서 내 색 자리를 비추기만 한다(바꿀 수 없다)
 * - 바꿀 수 있는 건 카드에 적힐 **이름**뿐이다. 성향 · 색은 그대로
 * → my-obsidian-vault / 50-Plans/K 러닝 노트.md
 */

type Outcome = { id: string; label: string; pomp: number; left: AxisDecl["left"]; right: AxisDecl["right"] };

export type NotePayload = {
  attemptId: string;
  attemptNo: number;
  isOwner?: boolean;
  ownerName?: string | null;
  custom?: { name?: string | null } | null;
  quiz: { slug: string; title: string; disclaimer: string | null };
  result: {
    code: string | null;
    completedAt: string | null;
    type: {
      name: string;
      subtitle: string | null;
      emoji: string;
      content: { summary: string; strengths: string[]; cautions?: string[] | null; tips?: string[] | null; funFact?: string | null };
    } | null;
    goodWith: { code: string; name: string; emoji: string }[];
    outcomes: Outcome[];
  };
};

export function NoteResult({
  data,
  bare = false,
  extraCards,
}: {
  data: NotePayload;
  bare?: boolean;
  /** 개발용 미리보기 — DB 없이 모은 카드를 채운다 */
  extraCards?: NoteCardData[];
}) {
  const session = useSession();
  const t = data.result.type;
  const [name, setName] = useState(data.custom?.name?.trim() || data.ownerName?.trim() || "러너");
  const { axes, pomp } = useMemo(() => splitOutcomes(data.result.outcomes), [data.result.outcomes]);

  const card: NoteCardData = useMemo(
    () =>
      buildCard({
        attemptId: data.attemptId,
        attemptNo: data.attemptNo,
        code: data.result.code ?? "",
        typeName: t?.name ?? data.result.code ?? "",
        completedAt: data.result.completedAt,
        runner: name,
        axes,
        pomp,
        strengths: t?.content.strengths,
        goodWith: data.result.goodWith.map((g) => g.code),
      }),
    [data, t, name, axes, pomp],
  );

  // 등장 연출 — 이 카드를 처음 볼 때 한 번
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const key = `note-revealed:${data.attemptId}`;
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
      localStorage.setItem(key, "1");
    } catch {
      /* 저장소를 못 쓰면 매번 돈다 */
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!seen && !reduce) setReveal(true);
  }, [data.attemptId]);

  /**
   * 결과 화면은 **이번 카드 한 장**(사용자 2026-11-18) — 목록 없이 뒤집기만. 지난 카드는 「모은 카드 보기」(기록 화면).
   * 개발용 미리보기는 extraCards 를 넘기지만 여기서는 쓰지 않는다.
   */
  void extraCards;
  const [face, setFace] = useState<"front" | "back">("front");
  const onDeck = useCallback((s: { face: "front" | "back" }) => setFace(s.face), []);
  const signedIn = session.status === "signed-in";

  const [nameDraft, setNameDraft] = useState(name);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const saveName = async () => {
    setNameMsg(null);
    try {
      const res = await fetch(`/api/attempts/${data.attemptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guestKey: getGuestKey(), custom: { name: nameDraft } }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setNameMsg(json.error ?? "바꾸지 못했어요.");
        return;
      }
      setName(json.custom?.name || data.ownerName?.trim() || "러너");
      setNameMsg("✅ 카드에 새 이름이 적혔어요.");
    } catch {
      setNameMsg("네트워크가 불안정해요.");
    }
  };

  return (
    <div className={`nt ${noteFontVars}`}>
      <div className="nt-shell">
        <p className="nt-eyebrow">
          <span>Running Note</span>
          <span>No. {String(data.attemptNo).padStart(2, "0")}</span>
        </p>
        <h1 className="nt-head">
          <span>{card.code}</span> {card.typeName}
        </h1>
        {t?.subtitle ? <p className="nt-sub">{t.subtitle}</p> : null}
        <NoteDeck cards={[card]} reveal={reveal} allowList={false} onChange={onDeck} />
        {signedIn && !bare ? (
          <div className="nt-ctrl">
            <Link className="nt-chip" href={`/records/${data.quiz.slug}`}>
              ▤ 모은 카드 보기
            </Link>
          </div>
        ) : null}

        {/* 카드에 적힐 이름 — 카드 바로 아래(사용자 2026-11-18) */}
        {data.isOwner ? (
          <div className="nt-namebox">
            <p className="nt-panel-eyebrow">Runner · 카드에 적힐 이름</p>
            <div className="nt-name">
              <input value={nameDraft} maxLength={10} onChange={(e) => setNameDraft(e.target.value)} placeholder="러너" aria-label="카드에 적힐 이름" />
              <button type="button" className="nt-chip nt-chip--main" onClick={() => void saveName()} disabled={nameDraft.trim() === name}>
                바꾸기
              </button>
            </div>
            <p className="nt-fine">이름만 바꿀 수 있어요. 성향과 색은 그대로예요.{nameMsg ? ` ${nameMsg}` : ""}</p>
          </div>
        ) : null}

        <NoteExport card={card} face={face} />
      </div>

      <section className="nt-panel">
        <p className="nt-panel-eyebrow">Identity Color · 아이덴티티 컬러</p>
        <h2 className="nt-panel-title">성향이 내린 나만의 네 가지 색</h2>
        <p className="nt-panel-lead">
          고른 색이 아니라 답에서 나온 색이에요. 성향처럼 바꿀 수 없어요 — 원판에서 내 색이 있는 자리만 비춰 봐요.
        </p>
        <div className="nt-wheel">
          <Wheel picks={card.picks} mode="identity" />
        </div>
        <ul className="nt-swatches">
          {card.picks.map((p) => (
            <li key={p.id}>
              <i style={{ background: p.color.hex }} aria-hidden="true" />
              <div>
                <b>{p.color.ko}</b>
                <em>{p.color.en}</em>
                <span>
                  {p.pole} · {p.strong ? "진하게" : "은은하게"} · {p.color.hex.toUpperCase()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {t ? (
        <section className="nt-panel">
          <p className="nt-panel-eyebrow">Tasting · 맛평가</p>
          <h2 className="nt-panel-title">
            {t.emoji} {t.name}
          </h2>
          {/* 제목에 유형 이모지가 있으니 요약 첫머리의 같은 이모지는 뺀다 */}
          <p className="nt-panel-text">{t.content.summary.startsWith(t.emoji) ? t.content.summary.slice(t.emoji.length).trim() : t.content.summary}</p>
          <dl className="nt-notes">
            <div>
              <dt>강점</dt>
              <dd>
                {t.content.strengths.map((s) => (
                  <p key={s}># {s}</p>
                ))}
              </dd>
            </div>
            {t.content.cautions?.length ? (
              <div>
                <dt>조심</dt>
                <dd>
                  {t.content.cautions.map((s) => (
                    <p key={s}>{s}</p>
                  ))}
                </dd>
              </div>
            ) : null}
            {t.content.tips?.length ? (
              <div>
                <dt>한 잔 더</dt>
                <dd>
                  {t.content.tips.map((s) => (
                    <p key={s}>{s}</p>
                  ))}
                </dd>
              </div>
            ) : null}
            {data.result.goodWith.length ? (
              <div>
                <dt>잘 맞는 블렌드</dt>
                <dd>
                  {data.result.goodWith.map((g) => (
                    <p key={g.code}>
                      {g.emoji} {g.code} {g.name}
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          {t.content.funFact ? <p className="nt-fun">{t.content.funFact}</p> : null}
          <p className="nt-heart">🫀 달리다 가슴이 아프거나 두근거리고 어지러우면 바로 멈추고 쉬어요. 기록보다 몸이 먼저예요.</p>
          {data.quiz.disclaimer ? <p className="nt-fine">{data.quiz.disclaimer}</p> : null}
        </section>
      ) : null}

    </div>
  );
}
