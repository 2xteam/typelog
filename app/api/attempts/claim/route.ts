import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { badRequest, requireViewer, serverError } from "@/lib/auth";
import { getAttemptModel } from "@/models/Attempt";
import { verifyClaim } from "@/lib/claimToken";

export const runtime = "nodejs";

/**
 * POST /api/attempts/claim — 게스트로 한 응시를 계정으로 옮긴다.
 *
 * body: `{ claimToken }`
 *
 * ⚠️ **`guestKey` 전체를 훑지 않는다.** 로그인할 때마다 그 브라우저의 기록을 다
 * 옮기면, 누가 썼는지 알 수 없는 기록까지 계정에 붙는다(가족 공용 PC, 빌려준 폰).
 * 그래서 **결과 화면에서 가입·로그인으로 바로 이어진 그 흐름에서만** 옮긴다 —
 * 토큰이 가리키는 **1건만**이다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

export async function POST(req: Request) {
  try {
    const guard = await requireViewer(req);
    if ("error" in guard) return guard.error;
    const userId = guard.viewer.userId;

    let body: { claimToken?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("잘못된 요청이에요.");
    }
    const claims = body.claimToken ? verifyClaim(body.claimToken) : null;
    // 이미 쓴 토큰·만료된 토큰은 조용히 넘긴다 — 사용자가 할 수 있는 일이 없다
    if (!claims) return NextResponse.json({ ok: true, claimed: 0 });

    await connectDB();
    const Attempt = getAttemptModel();
    const attempt = await Attempt.findOne({
      _id: claims.a,
      "owner.kind": "guest",
      "owner.guestKey": claims.g,
      status: "completed",
    }).lean();
    if (!attempt) return NextResponse.json({ ok: true, claimed: 0 });

    /**
     * ⚠️ **`attemptNo` 를 다시 매기는 것을 빠뜨리기 쉽다.** 게스트로 1회차였던
     * 기록이 계정에 이미 2건 있는 질문지로 들어오면 3회차가 되어야 한다.
     */
    const already = await Attempt.countDocuments({
      "owner.userId": userId,
      quizId: attempt.quizId,
    });

    await Attempt.updateOne(
      { _id: attempt._id },
      {
        $set: {
          "owner.kind": "user",
          "owner.userId": userId,
          attemptNo: already + 1,
        },
        // 게스트일 때만 있던 것들은 지운다. TTL 이 남아 있으면 회원 기록이 사라진다
        $unset: { "owner.guestKey": "", expiresAt: "" },
      },
    );

    return NextResponse.json({ ok: true, claimed: 1, attemptId: String(attempt._id) });
  } catch (err) {
    return serverError(err);
  }
}
