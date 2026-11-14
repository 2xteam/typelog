"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getGuestKey } from "@/lib/guestKey";
import { loadPhoto, savePhoto } from "@/lib/runPhoto";
import type { RecordDetail } from "@/lib/record";
import { runFontVars } from "./fonts";
import { License } from "./License";
import { NewsFront, NewsLocal } from "./News";
import { Ticket } from "./Ticket";
import { PhotoStep } from "./PhotoStep";
import { distLabel, pctText, type RunView } from "./view";
import "./result.css";
import "./run.css";

/**
 * 러닝 기록 결과 — 과속딱지 · 신문 · 자격증.
 *
 * - 사진은 **이 기기**의 IndexedDB 에서 읽는다. 다른 기기 · 공유 링크로 보면 실루엣이다
 * - 등장 효과는 화면마다 다르고, 처음 한 번만 돈다(「다시 보기」로 또 볼 수 있다)
 * - 신문은 **공유하기 전에 대회 이름을 바꿀 수 있다**
 * - 이미지 저장 · 공유는 브라우저에서 그린다(사진이 서버에 없으므로)
 *
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md
 */

export type RunPayload = {
  attemptId: string;
  attemptNo: number;
  ownerName?: string | null;
  quiz: { slug: string; title: string; disclaimer: string | null };
  answers: { linkId: string; value: unknown }[];
  result: {
    code: string | null;
    detail: RecordDetail | null;
    completedAt: string | null;
    type: {
      name: string;
      subtitle: string | null;
      emoji: string;
      content: { summary: string; strengths: string[]; cautions?: string[] | null; funFact?: string | null };
    } | null;
  };
};

type Kind = "cert" | "news-front" | "news-local" | "ticket" | "ticket-suspend";

function kindOf(code: string): Kind {
  if (code.startsWith("cert")) return "cert";
  return code as Kind;
}

/** 고정 크기 시안을 화면 폭에 맞춰 줄인다 */
function Fit({ width, children }: { width: number; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, h: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const w = outer.current?.parentElement?.clientWidth ?? width;
      const scale = Math.min(1, w / width);
      const h = (inner.current?.offsetHeight ?? 0) * scale;
      setBox({ scale, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current?.parentElement) ro.observe(outer.current.parentElement);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={outer} className="rr-fit" style={{ width: width * box.scale, height: box.h }}>
      <div ref={inner} className="rr-fit-inner" style={{ width, transform: `scale(${box.scale})` }}>
        {children}
      </div>
    </div>
  );
}

function Artwork({ kind, v }: { kind: Kind; v: RunView }) {
  if (kind === "cert") return <License v={v} />;
  if (kind === "news-front") return <NewsFront v={v} />;
  if (kind === "news-local") return <NewsLocal v={v} />;
  return <Ticket v={v} />;
}

const WIDTH: Record<Kind, number> = { cert: 1000, "news-front": 900, "news-local": 900, ticket: 900, "ticket-suspend": 900 };


export function RunResult({ data, bare = false }: { data: RunPayload; bare?: boolean }) {
  const code = data.result.code ?? "";
  const detail = data.result.detail;
  const kind = kindOf(code);
  const [photo, setPhoto] = useState<string | null>(null);
  const [race, setRace] = useState<string | null>(
    (data.answers.find((a) => a.linkId === "race")?.value as string | null) ?? null,
  );
  const [raceDraft, setRaceDraft] = useState(race ?? "");
  /** 결과에 들어갈 이름 — 회원이면 닉네임에서 시작하고, 대회 이름처럼 공유 전에 바꾼다 */
  const [runner, setRunner] = useState<string | null>(
    (data.answers.find((a) => a.linkId === "runner")?.value as string | null) ?? null,
  );
  const [runnerDraft, setRunnerDraft] = useState(runner ?? data.ownerName ?? "");
  /** 신문 이상이면 선수자격증도 준다 */
  const athlete = kind !== "cert";
  const [fx, setFx] = useState<Kind | null>(null);
  const [fxKey, setFxKey] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editPhoto, setEditPhoto] = useState(false);
  /** 공유 이미지를 만드는 중 — 0~100. null 이면 덮개를 그리지 않는다 */
  const [progress, setProgress] = useState<number | null>(null);
  /** 저장 · 공유 이미지 모양 — 책상 위에 놓인 장면 / 화면 그대로 */
  const [chosenStyle, setStyle] = useState<"desk" | "flat">("desk");
  /** 자격증은 반듯한 판만 받는다 — 책상 위(기울인) 판이 없다 (사용자 결정 2026-11-14) */
  const style = kind === "cert" ? "flat" : chosenStyle;
  const exportRef = useRef<HTMLDivElement>(null);

  // 사진 — 이 기기에만 있다
  useEffect(() => {
    /*
      사진은 data: 주소로 들고 있는다 — blob: 주소면 이미지를 그릴 때 다시 불러와야 하고,
      아이폰 사파리는 첫 번째로 그릴 때 그걸 놓쳐 사진 없이 저장됐다(2026-11-14).
    */
    let alive = true;
    void loadPhoto(data.attemptId).then(async (blob) => {
      if (!blob || !alive) return;
      setPhoto(await blobToDataUrl(blob));
    });
    return () => {
      alive = false;
    };
  }, [data.attemptId]);

  // 등장 효과 — 처음 한 번
  useEffect(() => {
    const key = `run-revealed:${data.attemptId}`;
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
      localStorage.setItem(key, "1");
    } catch {
      /* 저장소를 못 쓰면 매번 돈다 */
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!seen && !reduce) setFx(kind);
  }, [data.attemptId, kind]);

  const v: RunView | null = useMemo(
    () =>
      detail
        ? {
            attemptId: data.attemptId,
            attemptNo: data.attemptNo,
            code,
            detail,
            name: runner?.trim() || data.ownerName?.trim() || "러너",
            race,
            completedAt: data.result.completedAt ? new Date(data.result.completedAt) : new Date(),
            photo,
          }
        : null,
    [data, code, detail, race, runner, photo],
  );

  /** 결과에 들어가는 글자 하나 고치기 — 러너 이름 · 대회 이름 (editableAfterFinish 문항) */
  const saveField = useCallback(
    async (linkId: "race" | "runner", value: string) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/attempts/${data.attemptId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ guestKey: getGuestKey(), answer: { linkId, value } }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "바꾸지 못했어요.");
        if (linkId === "race") setRace(json.value ?? null);
        else setRunner(json.value ?? null);
        setMsg(linkId === "race" ? "대회 이름을 바꿨어요. 지면이 새로 조판됐어요." : "이름을 바꿨어요.");
      } catch (e) {
        setMsg((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [data.attemptId],
  );

  /**
   * 저장 · 공유 이미지 — 화면 밖에 그려 둔 것을 찍는다. 문구 띠는 붙이지 않는다(사용자 결정 2026-11-14).
   *   desk  책상 위에 놓인 장면 1080×1080
   *   flat  화면 그대로 — 시안 크기 그대로 2배 해상도
   */
  const render = useCallback(
    async (target: "main" | "athlete" = "main") => {
      const sel = target === "athlete" ? ".rr-flat--athlete" : style === "desk" ? ".rr-scene" : ".rr-flat--main";
      const node = exportRef.current?.querySelector<HTMLElement>(sel);
      if (!node) throw new Error("이미지를 그릴 수 없어요.");
      const { toBlob } = await import("html-to-image");
      await document.fonts?.ready;
      // 글꼴은 직접 골라 넣는다 — 라이브러리에 맡기면 다른 도메인 CSS 를 읽다 SecurityError 가 난다
      // 진행률 — 글꼴 받기 0~70 · 그리기 70~100 (사파리는 두 번 그린다)
      setProgress(3);
      const fontEmbedCSS = await embedFontCSS(node, (k) => setProgress(3 + Math.round(k * 67)));
      setProgress(72);
      const opts =
        target === "main" && style === "desk"
          ? { width: 1080, height: 1080, pixelRatio: 1, fontEmbedCSS }
          : { pixelRatio: 2, fontEmbedCSS };
      /*
        사파리(아이폰)는 첫 번째로 그릴 때 글꼴 · 사진을 덜 불러온 채 그린다(html-to-image 의 알려진 문제).
        한 번 미리 그려 불러 두고, 두 번째 것을 쓴다 (사용자 2026-11-14 「이상하게 저장」).
      */
      const ua = navigator.userAgent;
      if (/Safari/.test(ua) && !/Chrome|CriOS|Android/.test(ua)) {
        await toBlob(node, opts);
        setProgress(86);
      }
      const blob = await toBlob(node, opts);
      setProgress(100);
      if (!blob) throw new Error("이미지를 만들지 못했어요.");
      return blob;
    },
    [style],
  );

  const shareImage = useCallback(async (target: "main" | "athlete" = "main") => {
    setBusy(true);
    setMsg(null);
    setProgress(0);
    try {
      const blob = await render(target);
      const file = new File([blob], target === "athlete" ? "myjane-athlete-license.png" : `myjane-running-${code}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        setMsg(null);
      } else {
        setMsg("이 브라우저는 바로 공유가 안 돼요. 휴대폰 브라우저에서 열어 공유해 주세요.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg((e as Error).message);
      else setMsg(null);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [render, code]);

  const copyLink = useCallback(async () => {
    setMsg(null);
    try {
      const res = await fetch(`/api/attempts/${data.attemptId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guestKey: getGuestKey() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "링크를 만들지 못했어요.");
      const url = `${window.location.origin}${json.path}`;
      try {
        await navigator.clipboard.writeText(url);
        setMsg("링크를 복사했어요. 링크로 보면 사진 없이 보여요.");
      } catch {
        setMsg(url);
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [data.attemptId]);

  if (!v || !data.result.type) {
    return <p className="rr-msg">결과를 그릴 수 없어요.</p>;
  }
  const t = data.result.type;
  const pct = pctText(v.detail);

  return (
    <div className={`rr ${runFontVars}`}>
      <div className="rr-stagewrap rr-reveal" data-fx={fx ?? undefined} key={fxKey}>
        <div className="rr-dim" aria-hidden="true" />
        <div className="rr-flash" aria-hidden="true" />
        <Fit width={WIDTH[kind]}>
          <Artwork kind={kind} v={v} />
        </Fit>
      </div>

      <div className="rr-after">
        <p className="rr-name">
          {t.emoji} {t.name.toUpperCase()}
        </p>
        <p className="rr-summary">{t.content.summary}</p>
        {pct ? (
          <span className="rr-pct">
            {v.detail.percentileLabel} {pct}
          </span>
        ) : null}
        {v.detail.modifier === "+" ? (
          <p className="rr-mod">체급 보정 + · 더 무거운 몸을 같은 거리만큼 옮겼어요. 급수에 +를 붙여 드려요.</p>
        ) : v.detail.modifier === "-" ? (
          <p className="rr-mod">
            체급 보정 − · 가벼운 몸으로 낸 기록이라 보정에서 조금 내려갔어요. 체중을 늘리란 뜻이 아니라, 같은 기록이면 더 무거운
            쪽이 더 힘든 일을 했다는 계산이에요.
          </p>
        ) : null}
        <ul className="rr-lines">
          {t.content.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {t.content.funFact ? <p className="rr-fun">{t.content.funFact}</p> : null}
        <p className="rr-care">
          <span aria-hidden="true">❤️</span>
          {t.content.cautions?.[0] ?? "빨리 달린 것도 좋지만, 심장도 신호를 지켜요."}
        </p>

        {!bare ? (
          <div className="rr-fields">
            <p className="rr-fields-h">공유하기 전에 바꿀 수 있어요</p>
            <label className="rr-race">
              <span>이름</span>
              <input
                value={runnerDraft}
                maxLength={12}
                placeholder="러너"
                onChange={(e) => setRunnerDraft(e.target.value)}
              />
              <button
                type="button"
                className="rr-btn"
                disabled={busy || runnerDraft === (runner ?? data.ownerName ?? "")}
                onClick={() => void saveField("runner", runnerDraft)}
              >
                바꾸기
              </button>
            </label>
            {kind.startsWith("news") ? (
              <label className="rr-race">
                <span>대회</span>
                <input
                  value={raceDraft}
                  maxLength={20}
                  placeholder="예: 춘천마라톤"
                  onChange={(e) => setRaceDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="rr-btn"
                  disabled={busy || raceDraft === (race ?? "")}
                  onClick={() => void saveField("race", raceDraft)}
                >
                  바꾸기
                </button>
              </label>
            ) : null}
          </div>
        ) : null}

        {kind !== "cert" ? (
        <div className="rr-style" role="radiogroup" aria-label="이미지 모양">
          <span>이미지 모양</span>
          <button type="button" role="radio" aria-checked={style === "desk"} onClick={() => setStyle("desk")}>
            책상 위에 놓인 모습
          </button>
          <button type="button" role="radio" aria-checked={style === "flat"} onClick={() => setStyle("flat")}>
            화면 그대로
          </button>
        </div>
        ) : null}

        <div className="rr-actions">
          <button type="button" className="rr-btn rr-btn--main" disabled={busy} onClick={() => void shareImage()}>
            공유하기
          </button>
          <button type="button" className="rr-btn" onClick={() => void copyLink()}>
            링크 복사
          </button>
          {!bare ? (
            <button type="button" className="rr-btn" onClick={() => setEditPhoto(true)}>
              {photo ? "사진 바꾸기" : "사진 넣기"}
            </button>
          ) : null}
          <button
            type="button"
            className="rr-btn"
            onClick={() => {
              setFx(kind);
              setFxKey((k) => k + 1);
            }}
          >
            다시 보기
          </button>
        </div>
        {msg ? <p className="rr-msg">{msg}</p> : null}
      </div>

      {athlete ? (
        <section className="rr-bonus">
          <p className="rr-bonus-eyebrow">BONUS · 함께 발급</p>
          <h2 className="rr-bonus-h">선수자격증도 나왔어요</h2>
          <p className="rr-bonus-sub">신문에 실릴 만한 기록부터 선수자격증을 함께 드려요.</p>
          <Fit width={1000}>
            <License v={v} athlete />
          </Fit>
          <div className="rr-actions">
            <button type="button" className="rr-btn rr-btn--main" disabled={busy} onClick={() => void shareImage("athlete")}>
              선수자격증 공유하기
            </button>
          </div>
        </section>
      ) : null}

      {/* 맨 아래 — 선수자격증이 함께 나와도 그 아래에 둔다(사용자 2026-11-14) */}
      <div className="rr-after">
        {!bare ? (
          <div className="rr-actions">
            <Link className="rr-btn" href="/types" style={{ gridColumn: "1 / -1" }}>
              다른 것도 해보기 →
            </Link>
          </div>
        ) : null}
        <p className="rr-disclaimer">
          {data.quiz.disclaimer ? `${data.quiz.disclaimer} · ` : ""}
          {distLabel(v.detail)} 기준표 {v.detail.version}
        </p>
      </div>

      {progress !== null ? (
        <div className="rr-making" role="status" aria-live="polite">
          <div className="rr-making-card">
            <p className="rr-making-t">이미지를 만드는 중이에요</p>
            <div className="rr-making-bar" aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
            </div>
            <p className="rr-making-n">
              {progress}% · {progress < 70 ? "글꼴을 담는 중" : progress < 100 ? "그리는 중" : "거의 다 됐어요"}
            </p>
            <p className="rr-making-sub">보통 2~5초 걸려요. 휴대폰에서는 조금 더 걸릴 수 있어요.</p>
          </div>
        </div>
      ) : null}

      {editPhoto ? (
        <div className="run-play" style={{ position: "fixed", inset: 0, margin: 0, maxWidth: "none", borderRadius: 0, zIndex: 60, overflow: "auto" }}>
          <div className="run-stage">
            <h1 className="run-q">사진을 넣어 주세요</h1>
            <PhotoStep
              onDone={async (blob) => {
                await savePhoto(data.attemptId, blob);
                setPhoto(await blobToDataUrl(blob));
                setEditPhoto(false);
              }}
              onSkip={() => setEditPhoto(false)}
            />
          </div>
        </div>
      ) : null}

      {/* 저장 · 공유 이미지용 — 화면 밖. 문구 띠 없이 */}
      <div className="rr-export" ref={exportRef} aria-hidden="true">
        {kind !== "cert" ? (
          <div className={`rr-scene rr-scene--desk rr-scene--${kind.startsWith("news") ? "news" : "ticket"}`}>
            <div className="rr-scene-in">
              <Artwork kind={kind} v={v} />
            </div>
          </div>
        ) : null}
        <div className={`rr-flat rr-flat--main rr-flat--${kind === "cert" ? "cert" : "paper"}`}>
          <Artwork kind={kind} v={v} />
        </div>
        {athlete ? (
          <div className="rr-flat rr-flat--athlete">
            <License v={v} athlete />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 이미지에 넣을 글꼴 CSS — **같은 출처**(next/font 가 내려 주는) 글꼴만, 그 이미지에 실제로
 * 쓰인 글자가 들어 있는 조각(unicode-range)만 골라 data: 로 넣는다.
 *
 * html-to-image 에 맡기면 페이지의 모든 스타일시트를 읽는데, 다른 도메인(Pretendard CDN ·
 * 구글 폰트)의 cssRules 는 브라우저가 막아 SecurityError 가 난다(2026-11-14). 한글 글꼴은
 * 조각이 백 개 가까이라 다 넣으면 수 MB 가 되므로 쓰인 글자로 거른다.
 */
async function embedFontCSS(node: HTMLElement, onProgress?: (k: number) => void): Promise<string> {
  const chars = new Set([...(node.textContent ?? ""), ..."0123456789:′″.,%+−-/ABCDEFGHIJKLMNOPQRSTUVWXYZ"]);
  const codes = [...chars].map((c) => c.codePointAt(0) ?? 0);
  const covers = (range: string) =>
    !range ||
    range.split(",").some((part) => {
      const m = /U\+([0-9a-f?]+)(?:-([0-9a-f]+))?/i.exec(part.trim());
      if (!m) return true;
      const lo = parseInt(m[1].replace(/\?/g, "0"), 16);
      const hi = m[2] ? parseInt(m[2], 16) : m[1].includes("?") ? parseInt(m[1].replace(/\?/g, "f"), 16) : lo;
      return codes.some((c) => c >= lo && c <= hi);
    });

  // 결과 화면이 쓰는 글꼴 이름 — next/font 가 .rr 에 붙인 변수에서 읽는다.
  // 개발 서버에서는 'Noto Serif KR', 배포에서는 '__Noto_Serif_KR_1a2b3c' 처럼 이름이 다르다
  const cs = getComputedStyle(node);
  const families = new Set(
    ["--rf-sans", "--rf-serif", "--rf-old", "--rf-blackletter", "--rf-mono", "--rf-blackhan", "--rf-pen", "--rf-seal"]
      .map((v) => cs.getPropertyValue(v).split(",")[0]?.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean),
  );

  // 실제로 쓰인 (글꼴, 굵기) — 한글 글꼴은 굵기마다 조각이 백 개 가까이라, 안 쓰는 굵기를 빼면 몇 배 가벼워진다
  const used = new Set<string>();
  for (const el of [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))]) {
    const st = getComputedStyle(el);
    const fam = st.fontFamily.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "");
    if (fam) used.add(`${fam}|${st.fontWeight}`);
  }
  const weightUsed = (family: string, weight: string) => {
    // @font-face 의 굵기는 "400" 또는 "100 900" 처럼 범위일 수 있다
    const [lo, hi] = weight.split(/\s+/).map((w) => (w === "normal" ? 400 : w === "bold" ? 700 : Number(w)));
    return [...used].some((u) => {
      const [f, w] = u.split("|");
      const n = Number(w);
      return f === family && n >= lo && n <= (hi ?? lo);
    });
  };

  // 먼저 받을 조각을 모으고, 받으면서 진행률을 알린다
  const jobs: { rule: CSSFontFaceRule; src: string; url: URL }[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.href && new URL(sheet.href, location.href).origin !== location.origin) continue;
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue("font-family").replace(/^['"]|['"]$/g, "");
      if (!families.has(family)) continue;
      if (!weightUsed(family, rule.style.getPropertyValue("font-weight") || "400")) continue;
      if (!covers(rule.style.getPropertyValue("unicode-range"))) continue;
      const src = rule.style.getPropertyValue("src");
      const url = /url\(["']?([^"')]+)["']?\)/.exec(src)?.[1];
      if (!url) continue;
      jobs.push({ rule, src, url: new URL(url, sheet.href ?? location.href) });
    }
  }
  const out: string[] = [];
  let done = 0;
  // 몇 개씩 나란히 받는다 — 하나씩 받으면 휴대폰에서 느리다
  const queue = [...jobs];
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        const blob = await (await fetch(job.url)).blob();
        const data = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(blob);
        });
        out.push(job.rule.cssText.replace(job.src, `url(${data})`));
      } catch {
        /* 그 조각 하나 없이 그린다 */
      }
      done += 1;
      onProgress?.(jobs.length ? done / jobs.length : 1);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  onProgress?.(1);
  return out.join("\n");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}
