/**
 * 러닝 자격증 사진 — 포털(myjane)의 `/api/storage/typelog-photo` 를 서버끼리 부른다.
 * TypeLog 에는 R2 키가 없어서 포털이 대신 올리고 지운다(공유 비밀 `ADMIN_API_SECRET`).
 * → my-obsidian-vault / 10-Projects/TypeLog.md 「공유 사진」
 */
const PORTAL = (process.env.PORTAL_API_ORIGIN || process.env.NEXT_PUBLIC_PORTAL_ORIGIN || "https://www.myjane.co.kr").replace(/\/+$/, "");

export async function portalPhoto(method: "POST" | "DELETE", key: string, body?: Buffer) {
  const res = await fetch(`${PORTAL}/api/storage/typelog-photo`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.ADMIN_API_SECRET ?? ""}`,
      "x-key": key,
      ...(body ? { "content-type": "image/jpeg" } : {}),
    },
    body: body ? new Uint8Array(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !json.ok) throw new Error(json.error ?? `포털 ${res.status}`);
  return json;
}
