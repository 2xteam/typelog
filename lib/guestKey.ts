"use client";

/**
 * 로그인하지 않은 사람을 구분하는 값.
 *
 * 공유 링크로 들어온 사람이 로그인 없이 한 번 해볼 수 있게 한다.
 * **한 `guestKey` 는 한 질문지를 1회만** 할 수 있다(서버가 막는다).
 *
 * 이 값은 그 브라우저에만 있다. 지우거나 시크릿 창을 열면 다시 할 수 있는데,
 * 막을 방법이 마땅치 않고 IP·지문을 쓰는 것은 이 앱에 과하다. 한계로 둔다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */
const KEY = "typelog_guest";

export function getGuestKey(): string {
  try {
    const found = window.localStorage.getItem(KEY);
    if (found) return found;
    const made =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, made);
    return made;
  } catch {
    /* 시크릿 모드 등에서 막히면 그 세션에만 쓰는 값을 준다 */
    return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
