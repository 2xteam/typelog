import { NextResponse } from "next/server";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { badRequest, forbidden, getViewer, notFound, serverError } from "@/lib/auth";
import { getAttemptModel } from "@/models/Attempt";

export const runtime = "nodejs";

/**
 * POST /api/attempts/[id]/share — 공개 링크를 만든다.
 *
 * 토큰이 있는 사람만 볼 수 있다. 추측할 수 없어야 하므로 난수 24바이트를 쓴다.
 * 이미 있으면 그것을 그대로 준다 — 누를 때마다 새 링크가 생기면 이미 보낸 링크가
 * 살아 있는지 알 수 없다.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound("없는 기록이에요.");

    let body: { guestKey?: string } = {};
    try {
      body = await req.json();
    } catch {
      /* 본문이 없어도 된다 */
    }

    await connectDB();
    const Attempt = getAttemptModel();
    const attempt = await Attempt.findById(id).lean();
    if (!attempt) return notFound("없는 기록이에요.");
    if (attempt.status !== "completed") return badRequest("끝난 기록만 나눌 수 있어요.");

    const mine =
      attempt.owner.kind === "user"
        ? (await getViewer(req))?.userId === attempt.owner.userId
        : !!body.guestKey && body.guestKey === attempt.owner.guestKey;
    if (!mine) return forbidden("이 기록은 나눌 수 없어요.");

    let token = attempt.share?.token ?? null;
    if (!token || !attempt.share?.isPublic) {
      token = token ?? crypto.randomBytes(24).toString("base64url");
      await Attempt.updateOne(
        { _id: attempt._id },
        { $set: { "share.token": token, "share.isPublic": true } },
      );
    }

    return NextResponse.json({ ok: true, token, path: `/r/${token}` });
  } catch (err) {
    return serverError(err);
  }
}
