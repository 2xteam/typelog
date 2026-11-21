"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { NoteDeck } from "@/components/note/NoteDeck";
import { buildCard, shellStyle } from "@/components/note/view";
import { kitOfAxes, type AxisDecl } from "@/components/note/palette";
import { noteFontVars } from "@/components/note/fonts";
import { copyText, ensureShareUrl, type CrewCard } from "@/components/note/crew";
import { getGuestKey } from "@/lib/guestKey";
import { crewBlend, evalCrew } from "@/components/note/crewEval";
import { lookOf } from "@/components/note/view";
import { GRAIN } from "@/components/note/NoteCard";
import "@/components/note/note.css";

/**
 * 내 크루(사용자 2026-11-21) — 내 결과의 공유 링크로 들어와 노트를 내린 사람들의 카드를 모아 본다.
 * 맨 앞이 내 카드, 그 뒤로 들어온 순서. 크루 유형 구성(코드별 몇 명)과 초대 링크를 함께 둔다. 본인만(회원 세션 · 비회원 guestKey).
 */
type Data = { quiz: { slug: string; title: string }; axes: AxisDecl[]; me: CrewCard; shareUrl: string | null; views: number; crew: CrewCard[]; allTypes: { code: string; name: string; emoji: string | null; strengths: string[]; goodWith: string[] }[]; crewName: string | null };

export default function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/attempts/${id}/crew?guestKey=${encodeURIComponent(getGuestKey())}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setErr(json.error ?? "열 수 없어요.");
          return;
        }
        setData(json);
        setUrl(json.shareUrl);
      } catch {
        setErr("네트워크가 불안정해요.");
      }
    })();
  }, [id]);

  const cards = useMemo(
    () =>
      data
        ? [data.me, ...data.crew].map((c) =>
            buildCard({ attemptId: c.attemptId, attemptNo: c.attemptNo, code: c.code, typeName: c.typeName, completedAt: c.completedAt, runner: c.runner, axes: data.axes, pomp: c.pomp, strengths: c.strengths, goodWith: c.goodWith }),
          )
        : [],
    [data],
  );
  /** 크루 이름 — 대표 카드에 적힌다 */
  const [crewName, setCrewName] = useState("");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  useEffect(() => setCrewName(data?.crewName ?? ""), [data]);

  /** 크루 대표 카드 — 쌓인 크루원 결과 전부를 합산(평균)한 블렌드. 크루 수가 씨앗이라 한 명 늘 때마다 다시 블렌딩 */
  const crewCard = useMemo(() => {
    if (!data) return null;
    const all = [data.me, ...data.crew];
    const { code, pomp } = crewBlend(all, data.axes);
    const t = data.allTypes.find((x) => x.code === code);
    return buildCard({
      attemptId: `crew-${id}-${all.length}`,
      attemptNo: all.length,
      code,
      typeName: t?.name ?? code,
      completedAt: new Date().toISOString(),
      runner: data.crewName || "우리 크루",
      axes: data.axes,
      pomp,
      strengths: t?.strengths,
      goodWith: t?.goodWith,
    });
  }, [data, id]);
  const saveCrewName = useCallback(async () => {
    setNameMsg(null);
    const res = await fetch(`/api/attempts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guestKey: getGuestKey(), custom: { crewName } }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) return setNameMsg(json.error ?? "저장하지 못했어요.");
    setData((d) => (d ? { ...d, crewName: json.custom?.crewName ?? null } : d));
    setNameMsg("✅ 크루 이름을 바꿨어요.");
  }, [id, crewName]);

  /** 크루 구성 — 코드별 몇 명(나 포함) */
  const lineup = useMemo(() => {
    if (!data) return [];
    const m = new Map<string, { code: string; name: string; emoji: string | null; n: number }>();
    for (const c of [data.me, ...data.crew]) {
      const x = m.get(c.code) ?? { code: c.code, name: c.typeName, emoji: c.emoji, n: 0 };
      x.n += 1;
      m.set(c.code, x);
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [data]);

  /** 크루 평가 · 아직 없는 타입(사용자 2026-11-21) */
  const verdict = useMemo(() => (data ? evalCrew([data.me, ...data.crew].map((c) => c.code), data.axes) : null), [data]);
  const missing = useMemo(() => (data ? data.allTypes.filter((t) => !lineup.some((x) => x.code === t.code)) : []), [data, lineup]);

  const invite = useCallback(async () => {
    setMsg(null);
    try {
      const u = url ?? (await ensureShareUrl(id));
      setUrl(u);
      setMsg((await copyText(u)) ? "✅ 초대 링크를 복사했어요. 크루 단톡방에 붙여 넣어 보세요!" : "링크를 길게 눌러 복사해 주세요.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [id, url]);

  if (err) {
    return (
      <Sheet center eyebrow="MY CREW" headline="크루를 볼 수 없어요">
        <p className="lead">{err}</p>
        <p className="lead">링크를 공유한 그 브라우저(또는 그 계정)로 열어 주세요.</p>
      </Sheet>
    );
  }
  if (!data || !crewCard) return null;
  const kit = kitOfAxes(data.axes);
  const n = data.crew.length;
  // 아래 판 색 = 대표 카드 뒷면 색(쌓일 때마다 바뀐다)
  const back = lookOf(crewCard).theme;
  const panel = { "--pb": back.back, "--pi": back.backInk, backgroundImage: GRAIN } as React.CSSProperties;

  return (
    <div className={`nt ${noteFontVars}`}>
      {/* 크루 대표 카드 — 무대 색도 이 카드에서(크루가 늘면 같이 바뀐다) */}
      <div className="nt-shell" style={shellStyle(crewCard.picks[0])}>
        <p className="nt-eyebrow">
          <span>Crew Card</span>
          <span>{n + 1} Runners</span>
        </p>
        <h1 className="ncr-head">{data.crewName || `${data.me.runner === "나" ? "나의" : `${data.me.runner}의`} ${kit.brandKo.replace(" 노트", "")} 크루`}</h1>
        <p className="nt-sub">크루 {n + 1}명의 결과를 모두 합쳐 블렌딩한 대표 카드예요 · 한 명 늘 때마다 다시 블렌딩돼요</p>
        <NoteDeck key={crewCard.attemptId} cards={[crewCard]} allowList={false} />
        <div className="nt-namebox">
          <p className="nt-panel-eyebrow">Crew · 크루 이름</p>
          <div className="nt-name">
            <input value={crewName} maxLength={12} onChange={(e) => setCrewName(e.target.value)} placeholder="우리 크루" aria-label="크루 이름" />
            <button type="button" className="nt-chip nt-chip--main" onClick={() => void saveCrewName()} disabled={crewName.trim() === (data.crewName ?? "")}>
              바꾸기
            </button>
          </div>
          <p className="nt-fine">대표 카드에 적혀요.{nameMsg ? ` ${nameMsg}` : ""}</p>
        </div>
      </div>

      <div className="nt-shell ncr-members" style={{ marginTop: 14, ...shellStyle(crewCard.picks[0]) }}>
        <p className="nt-eyebrow">
          <span>My Crew</span>
          <span>{n + 1} Cards</span>
        </p>
        <p className="nt-sub">{n ? `내 링크로 ${n}명이 들어와 노트를 내렸어요 · 링크 열람 ${data.views}회` : "아직 크루가 없어요. 초대 링크를 공유해 보세요!"}</p>
        <NoteDeck cards={cards} start={n ? "list" : undefined} allowList={n > 0} />
        <div className="ncr-btns" style={{ marginTop: 16 }}>
          <button type="button" className="nt-btn nt-btn--main ncr-invite" onClick={() => void invite()}>
            🔗 크루 초대 링크 복사
          </button>
          <button type="button" className="nt-btn nt-btn--ghost ncr-see" onClick={() => history.back()}>
            ← 돌아가기
          </button>
        </div>
        {url ? (
          <p className="ncr-url">
            내 초대 링크 · <span>{url.replace(/^https?:\/\//, "")}</span>
          </p>
        ) : null}
        {msg ? <p className="nt-msg">{msg}</p> : null}
      </div>

      <section className="nt-panel nt-panel--back ncr-lineup" style={panel}>
        <p className="nt-panel-eyebrow">Line-up · 크루 라인업</p>
        <h2 className="nt-panel-title">우리 크루 블렌드</h2>
        <ul>
          {lineup.map((x) => (
            <li key={x.code}>
              <b>{x.code}</b>
              <span>
                {x.emoji} {x.name}
              </span>
              <em>{x.n}명</em>
            </li>
          ))}
        </ul>
        <p className="nt-fine">크루의 이름은 각자 카드에 직접 적은 이름만 보여요. 안 적었으면 「크루 N」으로 보여요.</p>
      </section>

      {verdict ? (
        <section className="nt-panel nt-panel--back ncr-eval" style={panel}>
          <p className="nt-panel-eyebrow">Crew Review · 크루 평가</p>
          <h2 className="nt-panel-title">{verdict.title}</h2>
          <ul>
            {verdict.per.map((e) => (
              <li key={e.id}>
                <p className="ncr-eval-axis">{e.label}</p>
                <div className="ncr-bar" aria-label={`${e.left.label} ${e.left.n}명, ${e.right.label} ${e.right.n}명`}>
                  <span style={{ width: `${e.leftPct}%` }}>
                    {e.left.code} {e.left.n}
                  </span>
                  <span style={{ width: `${100 - e.leftPct}%` }}>
                    {e.right.n} {e.right.code}
                  </span>
                </div>
                <p className="ncr-eval-line">{e.line}</p>
              </li>
            ))}
          </ul>
          <p className="nt-fine">재미로 보는 크루 블렌드예요. 크루가 모일수록 평가가 바뀌어요.</p>
        </section>
      ) : null}

      {missing.length ? (
        <section className="nt-panel nt-panel--back ncr-missing" style={panel}>
          <p className="nt-panel-eyebrow">Wanted · 아직 없는 타입</p>
          <h2 className="nt-panel-title">
            {missing.length === data.allTypes.length - 1 ? "이 타입들을 데려와 봐요" : `${missing.length}가지 타입이 더 필요해요`}
          </h2>
          <p className="nt-panel-lead">
            {data.allTypes.length}가지 중 {data.allTypes.length - missing.length}가지가 모였어요. 이 타입의 크루를 초대하면 블렌드가 완성돼요 ☕
          </p>
          <ul>
            {missing.map((t) => (
              <li key={t.code}>
                <b>{t.code}</b>
                <span>
                  {t.emoji} {t.name}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="nt-btn nt-btn--main ncr-invite ncr-wanted" onClick={() => void invite()}>
            🔗 초대 링크 복사하고 데려오기
          </button>
        </section>
      ) : (
        <section className="nt-panel nt-panel--back ncr-missing" style={panel}>
          <p className="nt-panel-eyebrow">Complete · 블렌드 완성</p>
          <h2 className="nt-panel-title">16가지 타입이 모두 모였어요 🎉</h2>
        </section>
      )}
    </div>
  );
}
