import { getViewer } from "@/lib/auth";
import { signClaim } from "@/lib/claimToken";
import { getAttemptModel } from "@/models/Attempt";

/*
  이 브라우저 · 계정의 참여 상태 — 공유 링크 첫 화면(/r/[token])과 홍보 시작 화면(/start/[slug])이 함께 쓴다.
*/

/**
 * 이 비회원이 이 질문지를 이미 한 번 했나 — 했으면 공유 화면이 처음부터 「가입하지 않으면 한 번만…」 과
 * 가입 · 로그인 버튼을 보여 준다(누른 뒤 409 를 받기 전에, 사용자 2026-11-14).
 * 규칙은 POST /api/attempts 와 같다: 로그인했으면 해당 없음, 개발 환경은 몇 번이든.
 */
export async function guestAlreadyPlayed(req: Request, quizId: unknown): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return false;
  const guestKey = new URL(req.url).searchParams.get("guestKey");
  if (!guestKey) return false;
  if (await getViewer(req)) return false;
  const n = await getAttemptModel().countDocuments({ "owner.guestKey": guestKey, quizId });
  return n > 0;
}

/**
 * 지난 참여 기록(사용자 2026-11-19) — 공유 링크로 다시 왔을 때 「기록 보기」 로 이전 결과(자격증)에 보낸다.
 *   비회원  이 브라우저 식별자(guestKey)로 끝낸 가장 최근 응시. 가입하면 그 기록이 계정으로 옮겨지도록 이관 표도 준다
 *   회원    끝낸 응시가 있으면 기록 화면으로
 */
export async function pastRecord(req: Request, quizId: unknown): Promise<{ kind: "guest" | "member"; attemptId: string; claimToken: string | null; count: number } | null> {
  const viewer = await getViewer(req);
  const Attempt = getAttemptModel();
  if (viewer) {
    const filter = { "owner.userId": viewer.userId, quizId, status: "completed" as const };
    const [latest, count] = await Promise.all([
      Attempt.findOne(filter).sort({ completedAt: -1 }).select({ _id: 1 }).lean(),
      Attempt.countDocuments(filter),
    ]);
    return latest ? { kind: "member", attemptId: String(latest._id), claimToken: null, count } : null;
  }
  const guestKey = new URL(req.url).searchParams.get("guestKey");
  if (!guestKey) return null;
  const filter = { "owner.kind": "guest", "owner.guestKey": guestKey, quizId, status: "completed" as const };
  const [latest, count] = await Promise.all([
    Attempt.findOne(filter).sort({ completedAt: -1 }).select({ _id: 1 }).lean(),
    Attempt.countDocuments(filter),
  ]);
  if (!latest) return null;
  return { kind: "guest", attemptId: String(latest._id), claimToken: signClaim(String(latest._id), guestKey), count };
}
