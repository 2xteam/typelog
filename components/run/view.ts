import type { RecordDetail } from "@/lib/record";
import { formatPrime } from "@/lib/record";

/**
 * 결과 세 화면이 함께 쓰는 값 — 문자열은 여기서 한 번만 만든다.
 */
export type RunView = {
  attemptId: string;
  attemptNo: number;
  code: string;
  detail: RecordDetail;
  name: string;
  race: string | null;
  completedAt: Date;
  /** 얼굴 사진 (이 기기에만 있다) — 없으면 실루엣 */
  photo: string | null;
  /** 넓게 잡은 가로 사진 — 신문용. 없으면 얼굴 사진 */
  photoWide?: string | null;
  /** 선수자격증 발급처 — 없으면 「마이재인」 */
  issuer?: string | null;
  /** 자격증 홀로그램 무늬 — holo.ts 의 HOLO_IDS. 없으면 꽃무늬 */
  holo?: string | null;
};

export const DIST_LABEL: Record<string, string> = { "5k": "5km", "10k": "10km", half: "하프", full: "풀" };
export const DIST_CODE: Record<string, string> = { "5k": "5K", "10k": "10K", half: "HALF", full: "FULL" };

export function distLabel(d: RecordDetail) {
  return DIST_LABEL[d.distance] ?? `${d.km}km`;
}

/** 2730 → "45분 30초", 6630 → "1시간 50분 30초" */
export function timeKo(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h ? `${h}시간` : "", m ? `${m}분` : "", s ? `${s}초` : ""].filter(Boolean).join(" ") || "0초";
}

export function paceKo(paceSec: number) {
  return `${Math.floor(paceSec / 60)}분 ${paceSec % 60}초`;
}

export function pacePrime(paceSec: number) {
  return formatPrime(paceSec);
}

/** 「상위 2%」 · 0.5% 보다 빠르면 「상위 0.5% 이내」 */
export function pctText(d: RecordDetail) {
  if (d.percentile === null) return null;
  return d.percentile <= 0.5 ? "상위 0.5% 이내" : `상위 ${d.percentile}%`;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function dateDot(d: Date) {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function dateTime(d: Date) {
  return `${dateDot(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

export function dateEn(d: Date) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** 응시 id 끝자리로 만드는 일련번호 — 같은 기록은 늘 같은 번호 */
export function serial(v: RunView, width = 3) {
  const n = parseInt(v.attemptId.slice(-6), 16) % 10 ** width;
  return pad(n, width);
}

export function mmdd(d: Date) {
  return `${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** 자격증 급수 — cert-3 → 3 */
export function certGrade(code: string) {
  const n = Number(code.replace("cert-", ""));
  return Number.isFinite(n) ? n : null;
}

export function modifierMark(d: RecordDetail) {
  return d.modifier === "+" ? "+" : d.modifier === "-" ? "−" : "";
}
