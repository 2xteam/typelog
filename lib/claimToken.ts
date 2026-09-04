import crypto from "node:crypto";

/**
 * 게스트 응시 1건을 계정으로 옮길 때 쓰는 **1회용 표**.
 *
 * 결과 화면에서 가입·로그인으로 바로 이어진 그 흐름에서만 이관하기 위한 것이다.
 * `guestKey` 전체를 훑으면 누가 썼는지 알 수 없는 기록까지 계정에 붙는다.
 *
 * route 파일이 아니라 여기 두는 이유 — Next 의 route 파일은 핸들러와 정해진
 * 설정 값만 export 할 수 있다. 헬퍼를 export 하면 `next build` 가 막힌다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

const TTL_SEC = 30 * 60;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET 환경 변수가 없거나 너무 짧습니다.");
  return s;
}

export function signClaim(attemptId: string, guestKey: string): string {
  const body = Buffer.from(
    JSON.stringify({ a: attemptId, g: guestKey, exp: Math.floor(Date.now() / 1000) + TTL_SEC }),
    "utf8",
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyClaim(token: string | null | undefined): { a: string; g: string } | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  // 길이가 다르면 timingSafeEqual 이 예외를 던지므로 먼저 거른다
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof c.a !== "string" || typeof c.g !== "string") return null;
    if (typeof c.exp !== "number" || c.exp * 1000 < Date.now()) return null;
    return { a: c.a, g: c.g };
  } catch {
    return null;
  }
}
