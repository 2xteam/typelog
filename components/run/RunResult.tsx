"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getGuestKey } from "@/lib/guestKey";
import { loadPhoto, savePhoto } from "@/lib/runPhoto";
import type { RecordDetail } from "@/lib/record";
import { runFontVars } from "./fonts";
import { License } from "./License";
import { NewsFront, NewsLocal } from "./News";
import { Ticket } from "./Ticket";
import { Prescription } from "./Prescription";
import { Wanted, WANTED_SUMMARY } from "./Wanted";
import "./extra.css";
import { PhotoStep } from "./PhotoStep";
import { distLabel, pctText, type RunView } from "./view";
import { DEFAULT_HOLO, HOLO_IDS, HOLO_LABEL, isHolo, type HoloId } from "./holo";
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
  /** 결과 링크가 이미 있나 — 있으면 사진을 바꿀 때 다시 올린다 */
  shared?: boolean;
  custom?: { issuer?: string | null; photoUrl?: string | null; holo?: string | null } | null;
  /** 본인 기록인가 — 게스트도 본인이면 true */
  isOwner?: boolean;
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
/**
 * 맨 위 그림 — 등급과 따로 정한다(사용자 2026-11-17).
 *   러닝자격증(1~5급) → 복약 지도 처방전 · 선수자격증 → 신문 · 딱지 · 말도 안 되는 기록 → 현상수배
 * 자격증은 모두 아래 「나의 러닝 자격증」 칸에서 받는다.
 */
type Top = "rx" | "news-front" | "news-local" | "ticket" | "ticket-suspend" | "wanted-fast" | "wanted-slow";

function topOf(code: string, d: RecordDetail | null): Top {
  if (d?.wanted) return `wanted-${d.wanted}`;
  if (code.startsWith("cert")) return "rx";
  return code as Top;
}

/**
 * 정체성은 **러닝 자격증**이다(사용자 2026-11-14). 신문 · 딱지는 선수자격증과 함께 나오는 것 —
 * 그래도 보는 재미가 커서 화면 맨 위에 크게 둔다. 그 위에 작은 표를 붙인다.
 * ⚠️ 「덤」 이라는 말은 쓰지 않는다(사용자 2026-11-14).
 */
const BONUS_TAG: Record<Top, string> = {
  rx: "💊 복약 지도 처방전도 받았어요",
  "wanted-fast": "🚨 말도 안 되게 빨라서 현상수배도 됐어요",
  "wanted-slow": "🚨 말도 안 되게 느려서 현상수배도 됐어요",
  "ticket-suspend": "🚨 러닝 면허 정지도 받았어요",
  ticket: "📸 과속 딱지도 끊겼어요",
  "news-front": "📰 신문 1면에도 실렸어요",
  "news-local": "🗞️ 신문 사회면에도 실렸어요",
};

/** 선수자격증 발급처 추천어 — 누르면 바로 바뀐다 */
const ISSUER_CHIPS = ["마이재인", "동네마실"];

function kindOf(code: string): Kind {
  if (code.startsWith("cert")) return "cert";
  return code as Kind;
}

/** 고정 크기 시안을 화면 폭에 맞춰 줄인다 */
export function Fit({ width, children }: { width: number; children: React.ReactNode }) {
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

function Artwork({ top, v }: { top: Top; v: RunView }) {
  if (top === "rx") return <Prescription v={v} />;
  if (top === "wanted-fast") return <Wanted v={v} mode="fast" />;
  if (top === "wanted-slow") return <Wanted v={v} mode="slow" />;
  if (top === "news-front") return <NewsFront v={v} />;
  if (top === "news-local") return <NewsLocal v={v} />;
  return <Ticket v={v} />;
}

const WIDTH: Record<Top, number> = {
  rx: 1100,
  "wanted-fast": 760,
  "wanted-slow": 760,
  "news-front": 900,
  "news-local": 900,
  ticket: 900,
  "ticket-suspend": 900,
};

/** 책상 위 장면의 놓는 모양 */
function sceneOf(top: Top) {
  if (top.startsWith("news")) return "news";
  if (top.startsWith("ticket")) return "ticket";
  if (top.startsWith("wanted")) return "wanted";
  return "rx";
}


export function RunResult({
  data,
  bare = false,
  registerBeforeShare,
}: {
  data: RunPayload;
  bare?: boolean;
  /** 「결과 링크 만들기」 직전에 부를 일 — 자격증 사진을 올린다 */
  registerBeforeShare?: (fn: (() => Promise<string | void>) | null) => void;
}) {
  const code = data.result.code ?? "";
  const detail = data.result.detail;
  const kind = kindOf(code);
  const top = topOf(code, detail);
  /** 고칠 수 있나 — 본인이면(로그인하지 않은 게스트도). 서버가 모르면 예전처럼 공유 화면이 아닐 때 */
  const canEdit = data.isOwner ?? !bare;
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoWide, setPhotoWide] = useState<string | null>(null);
  const [race, setRace] = useState<string | null>(
    (data.answers.find((a) => a.linkId === "race")?.value as string | null) ?? null,
  );
  const [raceDraft, setRaceDraft] = useState(race ?? "");
  /** 결과에 들어갈 이름 — 회원이면 닉네임에서 시작하고, 대회 이름처럼 공유 전에 바꾼다 */
  const [runner, setRunner] = useState<string | null>(
    (data.answers.find((a) => a.linkId === "runner")?.value as string | null) ?? null,
  );
  const [runnerDraft, setRunnerDraft] = useState(runner ?? data.ownerName ?? "");
  /** 선수자격증 발급처 — 기본 「마이재인」 */
  const [issuer, setIssuer] = useState<string | null>(data.custom?.issuer ?? null);
  const [issuerDraft, setIssuerDraft] = useState(data.custom?.issuer ?? "");
  /** 자격증 홀로그램 무늬 */
  const [holoKind, setHoloKind] = useState<HoloId>(isHolo(data.custom?.holo) ? data.custom.holo : DEFAULT_HOLO);
  /** 신문 이상이면 선수자격증도 준다 */
  const athlete = kind !== "cert";
  const [fx, setFx] = useState<Top | null>(null);
  const [fxKey, setFxKey] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editPhoto, setEditPhoto] = useState(false);
  /** 공유 이미지를 만드는 중 — 0~100. null 이면 덮개를 그리지 않는다 */
  const [progress, setProgress] = useState<number | null>(null);
  /** 저장 · 공유 이미지 모양 — 책상 위에 놓인 장면 / 화면 그대로 */
  const [chosenStyle, setStyle] = useState<"desk" | "flat">("desk");
  /** 맨 위 그림은 모두 종이라 두 모양을 다 받는다. 자격증은 아래 칸에서 반듯한 판만 */
  const style = chosenStyle;
  const exportRef = useRef<HTMLDivElement>(null);

  /** 자격증 사진(얼굴 크롭 JPEG)을 올린다 — 결과 링크의 자격증에 보이게 */
  const uploadPhoto = useCallback(
    async (blob?: Blob | null) => {
      const b = blob ?? (await loadPhoto(data.attemptId));
      if (!b) return;
      const res = await fetch(`/api/attempts/${data.attemptId}/photo?guestKey=${encodeURIComponent(getGuestKey())}`, {
        method: "POST",
        headers: { "content-type": "image/jpeg" },
        body: b,
      });
      if (!res.ok) throw new Error("자격증 사진을 올리지 못했어요. 링크에는 사진 없이 보여요.");
    },
    [data.attemptId],
  );
  /** 이번 화면에서 이미 올렸나 — 같은 사진을 두 번 올리지 않는다 */
  const photoUploaded = useRef(!!data.custom?.photoUrl);
  const runnerInput = useRef<HTMLInputElement>(null);

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
    void loadPhoto(data.attemptId, "wide").then(async (blob) => {
      if (!blob || !alive) return;
      setPhotoWide(await blobToDataUrl(blob));
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
    if (!seen && !reduce) setFx(top);
  }, [data.attemptId, top]);

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
            photoWide,
            issuer,
            holo: holoKind,
          }
        : null,
    [data, code, detail, race, runner, photo, photoWide, issuer, holoKind],
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
        setMsg(linkId === "race" ? "🗞️ 대회 이름을 바꿨어요. 지면이 새로 조판됐어요." : "✅ 이름을 바꿨어요.");
      } catch (e) {
        setMsg((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [data.attemptId],
  );

  /**
   * 「결과 링크 만들기」 직전 — 링크로 보는 사람에게 보일 것을 챙긴다(사용자 2026-11-14).
   *   1 이름: 적어 두고 「바꾸기」를 안 눌렀으면 저장한다. 아무 이름도 없으면 멈추고 이름 칸으로 보낸다
   *     (비회원이 이름 없이 링크를 만들면 「러너 님」 으로 나갔다)
   *   2 사진: 자격증 사진을 올린다(이미 올렸으면 건너뛴다)
   */
  useEffect(() => {
    if (!registerBeforeShare) return;
    registerBeforeShare(async () => {
      const draft = runnerDraft.trim();
      if (draft && draft !== (runner ?? data.ownerName ?? "").trim()) {
        await saveField("runner", draft);
      } else if (!draft && !runner?.trim() && !data.ownerName?.trim()) {
        runnerInput.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        runnerInput.current?.focus({ preventScroll: true });
        return "✏️ 결과 링크에 보일 이름을 먼저 적어 주세요.";
      }
      if (photoUploaded.current) return;
      await uploadPhoto()
        .then(() => (photoUploaded.current = true))
        .catch(() => {});
    });
    return () => registerBeforeShare(null);
  }, [registerBeforeShare, uploadPhoto, saveField, runnerDraft, runner, data.ownerName]);

  /** 홀로그램 무늬 바꾸기 — 화면은 바로 바뀌고 저장은 뒤에서 */
  const saveHolo = useCallback(
    async (id: HoloId) => {
      const prev = holoKind;
      setHoloKind(id);
      try {
        const res = await fetch(`/api/attempts/${data.attemptId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ guestKey: getGuestKey(), custom: { holo: id } }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "홀로그램을 저장하지 못했어요.");
      } catch (e) {
        setHoloKind(prev);
        setMsg((e as Error).message);
      }
    },
    [data.attemptId, holoKind],
  );
  const holoPicker = canEdit ? (
    <div className="rr-holo-pick" role="radiogroup" aria-label="홀로그램 무늬">
      <span className="rr-chips-h">✨ 홀로그램 무늬를 골라 보세요</span>
      {HOLO_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={holoKind === id}
          className="rr-chip"
          data-on={holoKind === id}
          onClick={() => void saveHolo(id)}
        >
          {HOLO_LABEL[id]}
        </button>
      ))}
    </div>
  ) : null;

  /** 선수자격증 발급처 바꾸기 */
  const saveIssuer = useCallback(
    async (value: string) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/attempts/${data.attemptId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ guestKey: getGuestKey(), custom: { issuer: value } }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "바꾸지 못했어요.");
        setIssuer(json.custom?.issuer ?? null);
        setIssuerDraft(json.custom?.issuer ?? "");
        setMsg("🏷️ 자격증 발급처를 바꿨어요.");
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

  const saveImage = useCallback(async (target: "main" | "athlete" = "main") => {
    setBusy(true);
    setMsg(null);
    setProgress(0);
    try {
      const blob = await render(target);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = target === "athlete" ? `myjane-${athlete ? "athlete" : "running"}-license.png` : `myjane-running-${top}-${style}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setMsg("✅ 이미지를 저장했어요. 인스타그램에 올려 보세요 📲");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [render, top, style, athlete]);

  const shareImage = useCallback(async (target: "main" | "athlete" = "main") => {
    setBusy(true);
    setMsg(null);
    setProgress(0);
    try {
      const blob = await render(target);
      const file = new File([blob], target === "athlete" ? `myjane-${athlete ? "athlete" : "running"}-license.png` : `myjane-running-${top}.png`, { type: "image/png" });
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
  }, [render, top, athlete]);


  if (!v || !data.result.type) {
    return <p className="rr-msg">결과를 그릴 수 없어요.</p>;
  }
  const t = data.result.type;
  const pct = pctText(v.detail);

  return (
    <div className={`rr ${runFontVars}`}>
      <p className="rr-bonus-tag">{BONUS_TAG[top]}</p>
      <div className="rr-stagewrap rr-reveal" data-fx={fx ?? undefined} key={fxKey}>
        <div className="rr-dim" aria-hidden="true" />
        <div className="rr-flash" aria-hidden="true" />
        <Fit width={WIDTH[top]}>
          <Artwork top={top} v={v} />
        </Fit>
      </div>

      <div className="rr-after">
        <p className="rr-name">
          {t.emoji} {t.name.toUpperCase()}
        </p>
        <p className="rr-summary">{v.detail.wanted ? WANTED_SUMMARY[v.detail.wanted] : t.content.summary}</p>
        {pct ? (
          <span className="rr-pct">
            {v.detail.percentileLabel} {pct}
          </span>
        ) : null}
        {v.detail.modifier === "+" ? (
          <p className="rr-mod">⚖️ 체급 보정 + · 더 무거운 몸을 같은 거리만큼 옮겼어요. 급수에 +를 붙여 드려요 💪</p>
        ) : v.detail.modifier === "-" ? (
          <p className="rr-mod">
            ⚖️ 체급 보정 − · 가벼운 몸으로 낸 기록이라 보정에서 조금 내려갔어요. 체중을 늘리란 뜻이 아니라, 같은 기록이면 더 무거운
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
          {t.content.cautions?.[0] ?? "🫀 빨리 달린 것도 좋지만, 심장도 신호를 지켜요."}
        </p>

        {canEdit ? (
          <div className="rr-fields">
            <p className="rr-fields-h">✏️ 공유하기 전에 바꿀 수 있어요</p>
            <label className="rr-race">
              <span>이름</span>
              <input
                ref={runnerInput}
                value={runnerDraft}
                maxLength={12}
                placeholder="러너"
                onChange={(e) => setRunnerDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (!busy) void saveField("runner", runnerDraft);
                  }
                }}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (!busy) void saveField("race", raceDraft);
                  }
                }}
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
            <label className="rr-race">
              <span>발급처</span>
              <input
                value={issuerDraft}
                maxLength={9}
                placeholder="마이재인"
                onChange={(e) => setIssuerDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (!busy) void saveIssuer(issuerDraft);
                  }
                }}
              />
              <button
                type="button"
                className="rr-btn"
                disabled={busy || issuerDraft.trim() === (issuer ?? "")}
                onClick={() => void saveIssuer(issuerDraft)}
              >
                바꾸기
              </button>
            </label>
            <div className="rr-chips">
              <span className="rr-chips-h">🏷️ 자격증 발급처 추천</span>
              {ISSUER_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="rr-chip"
                  data-on={(issuer ?? "마이재인") === c}
                  disabled={busy}
                  onClick={() => {
                    setIssuerDraft(c === "마이재인" ? "" : c);
                    void saveIssuer(c === "마이재인" ? "" : c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

          </div>
        ) : null}

        <div className="rr-style" role="radiogroup" aria-label="이미지 모양">
          <span>이미지 모양</span>
          <button type="button" role="radio" aria-checked={style === "desk"} onClick={() => setStyle("desk")}>
            책상 위에 놓인 모습
          </button>
          <button type="button" role="radio" aria-checked={style === "flat"} onClick={() => setStyle("flat")}>
            화면 그대로
          </button>
        </div>

        <div className="rr-actions">
          <button type="button" className="rr-btn rr-btn--main" disabled={busy} onClick={() => void shareImage()}>
            공유하기
          </button>
          <button type="button" className="rr-btn" disabled={busy} onClick={() => void saveImage()}>
            이미지 저장
          </button>
          {canEdit ? (
            <button type="button" className="rr-btn" onClick={() => setEditPhoto(true)}>
              {photo ? "사진 바꾸기" : "사진 넣기"}
            </button>
          ) : null}
        </div>
        {msg ? <p className="rr-msg">{msg}</p> : null}
      </div>

      {/* 자격증 — 모든 결과가 받는다. 맨 위 그림(처방전 · 신문 · 딱지 · 수배)과 따로 */}
      <section className="rr-bonus">
        <p className="rr-bonus-eyebrow">🏅 MY LICENSE · 나의 러닝 자격증</p>
        <h2 className="rr-bonus-h">🎉 {t.name}이 나왔어요</h2>
        <p className="rr-bonus-sub">
          {athlete ? "📰 신문에 실릴 만한 기록이면 선수자격증을 드려요 🏅" : "🏃 끝까지 달린 기록으로 러닝자격증을 드려요 🏅"}
        </p>

        <Fit width={1000}>
          <License v={v} athlete={athlete} />
        </Fit>
        {holoPicker}
        <div className="rr-actions">
          <button type="button" className="rr-btn rr-btn--main" disabled={busy} onClick={() => void shareImage("athlete")}>
            {athlete ? "선수자격증" : "러닝자격증"} 공유하기
          </button>
          <button type="button" className="rr-btn" disabled={busy} style={{ gridColumn: "1 / -1" }} onClick={() => void saveImage("athlete")}>
            {athlete ? "선수자격증" : "러닝자격증"} 이미지 저장
          </button>
        </div>
      </section>

      <div className="rr-after">
        <p className="rr-disclaimer">
          {data.quiz.disclaimer ? `${data.quiz.disclaimer} · ` : ""}
          {distLabel(v.detail)} 기준표 {v.detail.version}
        </p>
      </div>

      {progress !== null ? (
        <div className="rr-making" role="status" aria-live="polite">
          <div className="rr-making-card">
            <p className="rr-making-t">🎨 이미지를 만드는 중이에요</p>
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
              onDone={async (blob, wide) => {
                await savePhoto(data.attemptId, blob, wide);
                // 결과 링크가 이미 있으면 링크의 자격증 사진도 바꾼다
                if (data.shared || photoUploaded.current)
                  void uploadPhoto(blob)
                    .then(() => (photoUploaded.current = true))
                    .catch(() => {});
                setPhoto(await blobToDataUrl(blob));
                setPhotoWide(wide ? await blobToDataUrl(wide) : null);
                setEditPhoto(false);
              }}
              onSkip={() => setEditPhoto(false)}
            />
          </div>
        </div>
      ) : null}

      {/* 저장 · 공유 이미지용 — 화면 밖. 문구 띠 없이 */}
      <div className="rr-export" ref={exportRef} aria-hidden="true">
        <div className={`rr-scene rr-scene--desk rr-scene--${sceneOf(top)}`}>
          <div className="rr-scene-in">
            <Artwork top={top} v={v} />
          </div>
        </div>
        <div className="rr-flat rr-flat--main rr-flat--paper">
          <Artwork top={top} v={v} />
        </div>
        <div className="rr-flat rr-flat--athlete">
          <License v={v} athlete={athlete} />
        </div>
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
    ["--rf-sans", "--rf-serif", "--rf-old", "--rf-blackletter", "--rf-mono", "--rf-blackhan", "--rf-pen", "--rf-seal", "--rf-western"]
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
