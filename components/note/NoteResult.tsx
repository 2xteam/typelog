"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getGuestKey } from "@/lib/guestKey";
import { useSession } from "@/lib/useSession";
import { NoteDeck } from "./NoteDeck";
import { Wheel } from "./Wheel";
import { buildCard, splitOutcomes, type NoteCardData } from "./view";
import { noteFontVars } from "./fonts";
import type { AxisDecl } from "./palette";
import "./note.css";

/**
 * 러닝 노트 결과 — 무대 위 카드 한 장 + 아이덴티티 컬러 + 맛평가(긴 문장).
 *
 * - 카드 덱(→ NoteDeck.tsx): 목록과 상세가 한 무대. 오른쪽으로 밀면 뒷면, 왼쪽으로 밀면 줄 안으로(목록).
 *   회원은 지금까지의 카드가 좌우 줄로 놓이고, 누르면 그 카드를 꺼낸다. 처음 한 번 등장 연출
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

type Row = { attemptId: string; attemptNo: number; completedAt: string | null; code: string | null; name: string | null; pomp?: Record<string, number> | null; runner?: string | null };

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

  /** 덱이 지금 보여 주는 것 — 머리글을 맞춘다 */
  const [deck, setDeck] = useState<{ mode: "list" | "detail"; id: string }>({ mode: "detail", id: data.attemptId });
  const onDeck = useCallback((s: { mode: "list" | "detail"; id: string }) => setDeck(s), []);

  // 모은 카드 — 회원만 서버에 쌓인다. 비회원은 이 한 장
  const [rows, setRows] = useState<Row[] | null>(null);
  const [axesAll, setAxesAll] = useState<AxisDecl[] | null>(null);
  useEffect(() => {
    if (session.status !== "signed-in" || bare) return;
    void (async () => {
      try {
        const res = await fetch(`/api/records/${data.quiz.slug}?limit=60`);
        const json = await res.json();
        if (res.ok && json.ok) {
          setRows(json.attempts ?? []);
          setAxesAll(json.quiz?.axes ?? null);
        }
      } catch {
        /* 목록이 없어도 이 카드는 보인다 */
      }
    })();
  }, [session.status, bare, data.quiz.slug]);

  const cards: NoteCardData[] = useMemo(() => {
    const others =
      rows && axesAll
        ? rows
            .filter((r) => r.attemptId !== data.attemptId && r.code && r.pomp)
            .map((r) =>
              buildCard({
                attemptId: r.attemptId,
                attemptNo: r.attemptNo,
                code: r.code!,
                typeName: r.name ?? r.code!,
                completedAt: r.completedAt,
                runner: r.runner ?? name,
                axes: axesAll,
                pomp: r.pomp!,
              }),
            )
        : [];
    return [...(extraCards ?? []), ...others, card];
  }, [rows, axesAll, card, data.attemptId, name, extraCards]);

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
        <DeckHead deck={deck} cards={cards} pageId={data.attemptId} subtitle={t?.subtitle ?? null} signedIn={session.status === "signed-in"} />
        <NoteDeck cards={cards} initialId={data.attemptId} reveal={reveal} onChange={onDeck} />
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
          <p className="nt-panel-text">{t.content.summary}</p>
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
          {t.content.funFact ? <p className="nt-fun">☕ {t.content.funFact}</p> : null}
          <p className="nt-heart">🫀 달리다 가슴이 아프거나 두근거리고 어지러우면 바로 멈추고 쉬어요. 기록보다 몸이 먼저예요.</p>
          {data.quiz.disclaimer ? <p className="nt-fine">{data.quiz.disclaimer}</p> : null}
        </section>
      ) : null}

      {data.isOwner ? (
        <section className="nt-panel nt-panel--slim">
          <p className="nt-panel-eyebrow">Runner · 카드에 적힐 이름</p>
          <div className="nt-name">
            <input value={nameDraft} maxLength={10} onChange={(e) => setNameDraft(e.target.value)} placeholder="러너" aria-label="카드에 적힐 이름" />
            <button type="button" className="nt-chip nt-chip--gold" onClick={() => void saveName()} disabled={nameDraft.trim() === name}>
              바꾸기
            </button>
          </div>
          <p className="nt-fine">이름만 바꿀 수 있어요. 성향과 색은 그대로예요.{nameMsg ? ` ${nameMsg}` : ""}</p>
        </section>
      ) : null}
    </div>
  );
}

/** 덱 위 머리글 — 상세면 그 카드의 코드 · 이름, 목록이면 모은 카드. 다른 회차를 꺼냈으면 그 결과로 가는 길 */
function DeckHead({
  deck,
  cards,
  pageId,
  subtitle,
  signedIn,
}: {
  deck: { mode: "list" | "detail"; id: string };
  cards: NoteCardData[];
  pageId: string;
  subtitle: string | null;
  signedIn: boolean;
}) {
  const c = cards.find((x) => x.attemptId === deck.id) ?? cards[cards.length - 1];
  if (deck.mode === "list") {
    return (
      <>
        <p className="nt-eyebrow">
          <span>Running Note</span>
          <span>{cards.length} cards</span>
        </p>
        <h1 className="nt-head">내가 모은 러닝 노트</h1>
        <p className="nt-sub">{signedIn ? "회차마다 한 장씩 쌓여요. 눌러서 꺼내 봐요." : "가입하면 회차마다 카드가 쌓여요."}</p>
      </>
    );
  }
  return (
    <>
      <p className="nt-eyebrow">
        <span>Running Note</span>
        <span>No. {String(c?.attemptNo ?? 1).padStart(2, "0")}</span>
      </p>
      <h1 className="nt-head">
        <span>{c?.code}</span> {c?.typeName}
      </h1>
      {c && c.attemptId !== pageId ? (
        <p className="nt-sub">
          <Link href={`/results/${c.attemptId}`} className="nt-link">
            이 회차 자세히 보기 →
          </Link>
        </p>
      ) : subtitle ? (
        <p className="nt-sub">{subtitle}</p>
      ) : null}
    </>
  );
}
