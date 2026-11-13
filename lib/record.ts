import type { Cutoffs } from "@/lib/quizTypes";

/**
 * 기록 결과 — threshold 전략.
 *
 * 성별 · 거리 · 시간(초)을 (성별, 거리) 경계표에 대어 결과 코드를 정한다.
 * 「상위 N%」 와 체급 보정(+ −)은 **등급을 바꾸지 않는다** — 보여주기만 한다.
 *
 * 경계표 · 백분율 표 · 세계기록은 전부 질문지 JSON 에 있다(데이터). 여기는 계산만.
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md
 */

export type RecordDetail = {
  version: string;
  gender: string;
  distance: string;
  km: number;
  seconds: number;
  /** 1km 당 초 */
  paceSec: number;
  kmh: number;
  /** 상위 몇 % — 표 범위를 벗어나면 null */
  percentile: number | null;
  /** 「춘천마라톤 완주자 중」 · 「10km 로 환산하면」 */
  percentileLabel: string | null;
  /** 체급 보정 — 자격증에만 */
  modifier: "+" | "-" | null;
};

export type RecordInput = {
  gender: string | null;
  distance: string | null;
  km: number | null;
  seconds: number | null;
  /** 키·몸무게 — 저장하지 않는다. 계산에만 */
  body?: Record<string, number> | null;
};

export function tableKey(gender: string, distance: string) {
  return `${gender}:${distance}`;
}

/** 세계기록보다 빠른가 — 받지 않는다 */
export function tooFast(c: Cutoffs, gender: string, distance: string, seconds: number) {
  const floor = c.floor?.[tableKey(gender, distance)];
  return typeof floor === "number" && seconds < floor;
}

export function codeFor(c: Cutoffs, gender: string, distance: string, seconds: number) {
  for (const band of c.tables[tableKey(gender, distance)] ?? []) {
    if (band.upTo === undefined || seconds <= band.upTo) return band.code;
  }
  return null;
}

/** [초, 백분율] 점들을 직선으로 잇는다. 가장 빠른 점보다 빠르면 그 점, 가장 느린 점보다 느리면 null */
function interpolate(points: [number, number][], seconds: number): number | null {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (seconds <= sorted[0][0]) return sorted[0][1];
  for (let i = 1; i < sorted.length; i += 1) {
    const [t1, p1] = sorted[i];
    if (seconds <= t1) {
      const [t0, p0] = sorted[i - 1];
      return p0 + ((seconds - t0) / (t1 - t0)) * (p1 - p0);
    }
  }
  return null;
}

/** 화면에 쓰기 좋게 — 10% 미만은 소수 한 자리 */
export function roundPct(p: number) {
  return p < 10 ? Math.round(p * 10) / 10 : Math.round(p);
}

export function percentileFor(c: Cutoffs, gender: string, distance: string, seconds: number) {
  const pc = c.percentile;
  if (!pc) return { percentile: null, label: null };
  const key = tableKey(gender, distance);
  if (pc.tables[key]) {
    const p = interpolate(pc.tables[key], seconds);
    return { percentile: p === null ? null : roundPct(p), label: p === null ? null : pc.label };
  }
  const via = pc.via?.[distance];
  if (via) {
    const p = interpolate(pc.tables[tableKey(gender, via.key)] ?? [], seconds * via.factor);
    return { percentile: p === null ? null : roundPct(p), label: p === null ? null : via.label };
  }
  return { percentile: null, label: null };
}

/**
 * 체급 보정 — `(BMI − 기준) × k`, 최대 ±cap. |보정| ≥ signAt 이면 + 또는 −.
 * 범위 밖 값(키 120~220 · 몸무게 30~200 같은)은 measure 칸의 min·max 로 걸러서 들어온다.
 */
export function modifierFor(
  c: Cutoffs,
  gender: string,
  code: string,
  body: Record<string, number> | null | undefined,
): "+" | "-" | null {
  const a = c.adjust;
  if (!a || !body || !a.codes.includes(code)) return null;
  const h = body.heightCm;
  const w = body.weightKg;
  const base = a.base[gender];
  if (!h || !w || typeof base !== "number") return null;
  const bmi = w / (h / 100) ** 2;
  const adj = Math.max(-a.cap, Math.min(a.cap, (bmi - base) * a.k));
  if (adj >= a.signAt) return "+";
  if (adj <= -a.signAt) return "-";
  return null;
}

export function resolveRecord(
  c: Cutoffs,
  input: RecordInput,
): { code: string; detail: RecordDetail } | null {
  const { gender, distance, km, seconds } = input;
  if (!gender || !distance || !km || !seconds || seconds <= 0) return null;
  const code = codeFor(c, gender, distance, seconds);
  if (!code) return null;
  const { percentile, label } = percentileFor(c, gender, distance, seconds);
  return {
    code,
    detail: {
      version: c.version,
      gender,
      distance,
      km,
      seconds,
      paceSec: Math.round(seconds / km),
      kmh: Math.round((km / (seconds / 3600)) * 10) / 10,
      percentile,
      percentileLabel: label,
      modifier: modifierFor(c, gender, code, input.body),
    },
  };
}

/** 3725 → "1:02:05", 2460 → "41:00" */
export function formatClock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return h ? `${h}:${mm}:${String(r).padStart(2, "0")}` : `${mm}:${String(r).padStart(2, "0")}`;
}

/** 2412 → 40′12″, 3725 → 1:02′05″ — 자격증·통지서 표기 */
export function formatPrime(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}′${r}″` : `${m}′${r}″`;
}
