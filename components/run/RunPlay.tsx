"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getGuestKey } from "@/lib/guestKey";
import { savePhoto } from "@/lib/runPhoto";
import { formatClock } from "@/lib/record";
import { PhotoStep } from "@/components/run/PhotoStep";
import { Generating } from "@/components/run/Generating";
import "./run.css";

/**
 * 러닝 기록 응시 — **선택은 간단하게, 보는 건 화려하게.**
 *
 * 한 화면에 하나, 큼지막하게. 고르면 다음 화면으로 넘어간다.
 *   ① 성별 → ② 거리 → ③ 기록 → (신문이면) 대회 이름 → ④ 키·몸무게 → ⑤ 사진 → 생성 연출
 *
 * - 답은 매 화면 저장한다(일반 질문지와 같다). 단 **키·몸무게는 저장하지 않는다** —
 *   들고 있다가 끝낼 때 채점에만 보낸다(`transient`)
 * - 사진은 서버로 보내지 않는다 → lib/runPhoto.ts
 * - 대회 이름은 **신문이 나온 사람에게만** 묻는다. 서버가 돌려준 `preview` 로 정한다
 *
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md
 */

export type RunItem = {
  linkId: string;
  type: string;
  text: string | null;
  emoji: string | null;
  required: boolean;
  note?: string | null;
  enableWhen?: { linkId?: string; resultIn?: string[] } | null;
  distanceFrom?: string | null;
  fields?: { key: string; label: string; unit?: string | null; min: number; max: number }[] | null;
  transient?: boolean;
  maxLength?: number | null;
  afterFinishOnly?: boolean;
  options: { oid: string; text: string; emoji: string | null; value?: number | null }[];
};
type Answer = { linkId: string; oids: string[]; value: unknown };

/** 대회 이름 예시 — 누르면 채워진다. 실제 대회 이름은 사용자가 넣는 값이다 */
const RACE_CHIPS = ["춘천마라톤", "서울마라톤", "JTBC 서울마라톤", "대구마라톤", "경주국제마라톤", "동네 공원"];

export function RunPlay({
  attemptId,
  resultPath,
  quiz,
  items,
  initialAnswers,
  initialPreview,
}: {
  attemptId: string;
  resultPath: string;
  quiz: { title: string; emoji: string | null };
  items: RunItem[];
  initialAnswers: Answer[];
  initialPreview: string | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(initialAnswers.map((a) => [a.linkId, a])),
  );
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [transient, setTransient] = useState<Record<string, Record<string, number>>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  /** 지금 보여 줄 문항들 — 미리 낸 결과로 걸러진다 */
  const visible = useMemo(
    () =>
      items.filter(
        (it) =>
          !it.afterFinishOnly &&
          (!it.enableWhen?.resultIn || (preview !== null && it.enableWhen.resultIn.includes(preview))),
      ),
    [items, preview],
  );
  const steps = useMemo(() => [...visible.map((it) => it.linkId), "@photo", "@generate"], [visible]);

  const [at, setAt] = useState(() => {
    const first = visible.findIndex((it) => !it.transient && !answers[it.linkId]);
    return first === -1 ? Math.max(0, visible.length - 1) : first;
  });
  const step = steps[Math.min(at, steps.length - 1)];
  const item = visible.find((it) => it.linkId === step) ?? null;
  const inputSteps = visible.length + 1; // 사진까지

  const go = useCallback((d: number) => {
    setMsg(null);
    setAt((i) => Math.max(0, i + d));
  }, []);

  const save = useCallback(
    async (answer: Answer) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/attempts/${attemptId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ guestKey: getGuestKey(), answer }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setMsg(data.error ?? "저장하지 못했어요.");
          return false;
        }
        setAnswers((prev) => ({ ...prev, [answer.linkId]: answer }));
        if ("preview" in data) setPreview(data.preview ?? null);
        return true;
      } catch {
        setMsg("네트워크가 불안정해요.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [attemptId],
  );

  /** 끝내기 — 생성 연출이 이걸 부르고, 응답(상위 %)을 받아 숫자를 그린다 */
  const finish = useCallback(async () => {
    const res = await fetch(`/api/attempts/${attemptId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guestKey: getGuestKey(), finish: true, transient }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error ?? "결과를 만들지 못했어요.");
    return data as { code: string; detail: { percentile: number | null; seconds: number } | null };
  }, [attemptId, transient]);

  // 거리 km — ③ 기록 화면에서 페이스를 환산하는 데 쓴다
  const durItem = items.find((it) => it.type === "duration");
  const distItem = items.find((it) => it.linkId === durItem?.distanceFrom);
  const distOid = distItem ? answers[distItem.linkId]?.oids?.[0] : null;
  const distOpt = distItem?.options.find((o) => o.oid === distOid) ?? null;
  const km = distOpt?.value ?? null;

  const seconds = durItem ? Number(answers[durItem.linkId]?.value) || null : null;

  return (
    <div className="run-play">
      <div className="run-top">
        <button type="button" className="run-back" onClick={() => go(-1)} disabled={at === 0 || busy || step === "@generate"} aria-label="뒤로">
          ←
        </button>
        <div className="run-dots" aria-hidden="true">
          {Array.from({ length: inputSteps }, (_, i) => (
            <i key={i} data-on={i <= at} />
          ))}
        </div>
        <span className="run-title">{quiz.emoji} {quiz.title}</span>
      </div>

      <div className="run-stage" key={step}>
        {item?.type === "choice" ? (
          <ChoiceStep
            item={item}
            chosen={answers[item.linkId]?.oids?.[0] ?? null}
            busy={busy}
            onPick={async (oid) => {
              if (await save({ linkId: item.linkId, oids: [oid], value: null })) go(1);
            }}
          />
        ) : null}

        {item?.type === "duration" ? (
          <DurationStep
            item={item}
            km={km}
            distLabel={distOpt?.text ?? null}
            initial={seconds}
            busy={busy}
            onNext={async (sec) => {
              if (await save({ linkId: item.linkId, oids: [], value: sec })) go(1);
            }}
          />
        ) : null}

        {item?.type === "string" ? (
          <RaceStep
            item={item}
            initial={(answers[item.linkId]?.value as string | null) ?? ""}
            busy={busy}
            onNext={async (text) => {
              if (!text.trim()) return go(1);
              if (await save({ linkId: item.linkId, oids: [], value: text })) go(1);
            }}
          />
        ) : null}

        {item?.type === "measure" ? (
          <MeasureStep
            item={item}
            initial={transient[item.linkId] ?? {}}
            onNext={(vals) => {
              setTransient((t) => ({ ...t, [item.linkId]: vals }));
              go(1);
            }}
          />
        ) : null}

        {step === "@photo" ? (
          <>
            <h1 className="run-q">사진을 넣어 주세요</h1>
            <PhotoStep
              onDone={async (blob, wide) => {
                await savePhoto(attemptId, blob, wide);
                go(1);
              }}
              onSkip={() => go(1)}
            />
          </>
        ) : null}

        {step === "@generate" ? (
          <Generating
            seconds={seconds ?? 0}
            finish={finish}
            onDone={() => router.replace(resultPath)}
            onError={(m) => {
              setMsg(m);
              setAt(steps.length - 2);
            }}
          />
        ) : null}

        {msg ? <p className="run-msg">{msg}</p> : null}
      </div>
    </div>
  );
}

function ChoiceStep({
  item,
  chosen,
  busy,
  onPick,
}: {
  item: RunItem;
  chosen: string | null;
  busy: boolean;
  onPick: (oid: string) => void;
}) {
  const two = item.options.length === 2;
  return (
    <>
      <h1 className="run-q">{item.text}</h1>
      <div className={two ? "run-tiles run-tiles--two" : "run-tiles"}>
        {item.options.map((o) => (
          <button
            key={o.oid}
            type="button"
            className="run-tile"
            data-chosen={chosen === o.oid}
            disabled={busy}
            onClick={() => onPick(o.oid)}
          >
            {o.emoji ? <span className="run-tile-emoji" aria-hidden="true">{o.emoji}</span> : null}
            <span className="run-tile-text">{o.text}</span>
            {typeof o.value === "number" && !o.text.includes("km") ? (
              <span className="run-tile-sub">{Number.isInteger(o.value * 1000) ? o.value : o.value.toFixed(1)}km</span>
            ) : null}
          </button>
        ))}
      </div>
    </>
  );
}

/** 숫자 칸 — 두 자리씩. 다 차면 다음 칸으로 */
function NumBox({
  value,
  onChange,
  label,
  max,
  innerRef,
  onFull,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  max: number;
  innerRef?: React.Ref<HTMLInputElement>;
  onFull?: () => void;
}) {
  return (
    <label className="run-num">
      <input
        ref={innerRef}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        placeholder="00"
        maxLength={2}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          if (v && Number(v) > max) return;
          onChange(v);
          if (v.length === 2) onFull?.();
        }}
        /* 누를 때만 전체 선택 — 자동으로 다음 칸에 넘어왔을 때 선택하면 빠른 입력이 덮어쓴다 */
        onPointerUp={(e) => e.currentTarget.select()}
      />
      <span>{label}</span>
    </label>
  );
}

function DurationStep({
  item,
  km,
  distLabel,
  initial,
  busy,
  onNext,
}: {
  item: RunItem;
  km: number | null;
  distLabel: string | null;
  initial: number | null;
  busy: boolean;
  onNext: (sec: number) => void;
}) {
  const [mode, setMode] = useState<"total" | "pace">("total");
  const split = (s: number | null) =>
    s ? [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")) : ["", "", ""];
  const [h, setH] = useState(split(initial)[0]);
  const [m, setM] = useState(split(initial)[1]);
  const [s, setS] = useState(split(initial)[2]);
  const [pm, setPm] = useState("");
  const [ps, setPs] = useState("");
  const mRef = useRef<HTMLInputElement>(null);
  const sRef = useRef<HTMLInputElement>(null);
  const psRef = useRef<HTMLInputElement>(null);

  const total =
    mode === "total"
      ? (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)
      : km
        ? Math.round(((Number(pm) || 0) * 60 + (Number(ps) || 0)) * km)
        : 0;
  const pace = km && total ? Math.round(total / km) : 0;
  const kmh = km && total ? Math.round((km / (total / 3600)) * 10) / 10 : 0;

  return (
    <>
      <h1 className="run-q">{item.text}</h1>
      <p className="run-sub">{distLabel ? `${distLabel} 기록이에요. ` : ""}둘 중 아는 것 하나만 넣으면 돼요.</p>
      <div className="run-toggle" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "total"} onClick={() => setMode("total")}>
          총 시간
        </button>
        <button type="button" role="tab" aria-selected={mode === "pace"} onClick={() => setMode("pace")}>
          1km 페이스
        </button>
      </div>

      {mode === "total" ? (
        <div className="run-clock">
          <NumBox value={h} onChange={setH} label="시간" max={23} onFull={() => mRef.current?.focus()} />
          <b>:</b>
          <NumBox value={m} onChange={setM} label="분" max={59} innerRef={mRef} onFull={() => sRef.current?.focus()} />
          <b>:</b>
          <NumBox value={s} onChange={setS} label="초" max={59} innerRef={sRef} />
        </div>
      ) : (
        <div className="run-clock run-clock--pace">
          <NumBox value={pm} onChange={setPm} label="분" max={59} onFull={() => psRef.current?.focus()} />
          <b>′</b>
          <NumBox value={ps} onChange={setPs} label="초" max={59} innerRef={psRef} />
          <b>″</b>
        </div>
      )}

      <p className="run-calc" aria-live="polite">
        {total
          ? mode === "total"
            ? `1km당 ${Math.floor(pace / 60)}′${String(pace % 60).padStart(2, "0")}″ · 시속 ${kmh}km`
            : `총 ${formatClock(total)} · 시속 ${kmh}km`
          : " "}
      </p>

      <div className="run-actions">
        <button type="button" className="run-btn run-btn--main" disabled={!total || busy} onClick={() => onNext(total)}>
          다음
        </button>
      </div>
    </>
  );
}

function RaceStep({
  item,
  initial,
  busy,
  onNext,
}: {
  item: RunItem;
  initial: string;
  busy: boolean;
  onNext: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const max = item.maxLength ?? 20;
  return (
    <>
      <h1 className="run-q">{item.text}</h1>
      <p className="run-sub">결과에 대회 이름이 들어가요. 나중에 공유하기 전에도 바꿀 수 있어요.</p>
      <input
        className="run-text"
        value={text}
        maxLength={max}
        placeholder="예: 춘천마라톤"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="run-chips">
        {RACE_CHIPS.map((c) => (
          <button key={c} type="button" className="run-chip" onClick={() => setText(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="run-actions">
        <button type="button" className="run-btn run-btn--main" disabled={busy} onClick={() => onNext(text)}>
          {text.trim() ? "다음" : "건너뛰기"}
        </button>
      </div>
    </>
  );
}

function MeasureStep({
  item,
  initial,
  onNext,
}: {
  item: RunItem;
  initial: Record<string, number>;
  onNext: (vals: Record<string, number>) => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])),
  );
  const fields = item.fields ?? [];
  const parsed = Object.fromEntries(
    fields.flatMap((f) => {
      const n = Number(vals[f.key]);
      return Number.isFinite(n) && n >= f.min && n <= f.max ? [[f.key, n]] : [];
    }),
  ) as Record<string, number>;
  const complete = fields.every((f) => f.key in parsed);
  return (
    <>
      <h1 className="run-q">{item.text}</h1>
      <p className="run-sub">{item.note ?? "선택이에요."}</p>
      <div className="run-measure">
        {fields.map((f) => (
          <label key={f.key} className="run-field">
            <span>{f.label}</span>
            <input
              inputMode="decimal"
              value={vals[f.key] ?? ""}
              placeholder="—"
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value.replace(/[^\d.]/g, "") }))}
            />
            <em>{f.unit}</em>
          </label>
        ))}
      </div>
      {/*
        건너뛰기가 위, 저장이 아래(사용자 2026-11-14). 휴대폰에서 키보드가 떠 있을 때 버튼을 누르면
        입력칸이 포커스를 잃어 키보드가 내려가고 화면이 움직여 첫 탭이 빗나갔다 —
        누르는 순간(pointerdown) 포커스를 빼앗지 않게 막는다.
      */}
      <div className="run-actions">
        <button type="button" className="run-btn" onPointerDown={(e) => e.preventDefault()} onClick={() => onNext({})}>
          건너뛰기
        </button>
        <button
          type="button"
          className="run-btn run-btn--main"
          disabled={!complete}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onNext(parsed)}
        >
          저장
        </button>
      </div>
    </>
  );
}
