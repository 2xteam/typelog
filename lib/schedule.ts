/**
 * 질문지를 지금 풀 수 있는지 판정한다.
 *
 * `schedule`은 목록을 어떻게 그릴지와 무관하다. **시작하는 순간 한 곳**에서만 막는다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

export type Schedule = {
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  openingNoticeText?: string | null;
};

export const DEFAULT_OPENING_NOTICE = "곧 만나요. 조금만 기다려 주세요 ✨";

export type StartCheck =
  | { ok: true }
  | { ok: false; reason: "before_start"; startAt: Date; notice: string }
  | { ok: false; reason: "after_end"; endAt: Date };

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * `startAt`도 `endAt`도 없을 수 있다. 셋 다 정상 조합이다 —
 * 둘 다 없음(바로 열려 무기한) · startAt만(예약 후 무기한) · 둘 다(기간 한정).
 *
 * ⚠️ `now > endAt` 을 그대로 쓰면 `endAt`이 null 일 때 **항상 마감된다.**
 * JS 는 `null` 을 `0` 으로 바꾸므로 `Date > null` 이 언제나 true 다.
 * 그래서 존재 검사를 먼저 하고, 그 판정을 이 함수 하나에만 둔다.
 */
export function canStart(
  schedule: Schedule | null | undefined,
  now: Date = new Date(),
): StartCheck {
  const startAt = toDate(schedule?.startAt);
  const endAt = toDate(schedule?.endAt);

  if (startAt && now < startAt) {
    return {
      ok: false,
      reason: "before_start",
      startAt,
      notice: schedule?.openingNoticeText?.trim() || DEFAULT_OPENING_NOTICE,
    };
  }
  if (endAt && now > endAt) {
    return { ok: false, reason: "after_end", endAt };
  }
  return { ok: true };
}

/** 아직 열리지 않았는가 — 목록의 `Coming Soon` 탭을 가르는 기준 */
export function isComingSoon(
  schedule: Schedule | null | undefined,
  now: Date = new Date(),
): boolean {
  const check = canStart(schedule, now);
  return !check.ok && check.reason === "before_start";
}
