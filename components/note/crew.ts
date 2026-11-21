import { getGuestKey } from "@/lib/guestKey";

/** 내 크루(사용자 2026-11-21) — 결과 화면 · 크루 화면이 함께 쓴다 */
export type CrewCard = {
  attemptId: string;
  attemptNo: number;
  code: string;
  typeName: string;
  emoji: string | null;
  completedAt: string | null;
  runner: string;
  pomp: Record<string, number>;
  strengths: string[];
  goodWith: string[];
};

/** 공유 링크를 만든다(있으면 그대로) — 크루를 모으는 초대 링크 */
export async function ensureShareUrl(attemptId: string): Promise<string> {
  const res = await fetch(`/api/attempts/${attemptId}/share`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guestKey: getGuestKey() }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error ?? "링크를 만들지 못했어요.");
  return `${location.origin}${json.path}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
