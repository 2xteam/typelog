import { NextResponse } from "next/server";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { badRequest, forbidden, getViewer, notFound, serverError } from "@/lib/auth";
import { getAttemptModel, type AttemptDoc } from "@/models/Attempt";
import { portalPhoto as portal } from "@/lib/portalStorage";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/attempts/[id]/photo?guestKey= — 결과 링크 자격증에 보일 사진(얼굴 크롭 JPEG)을 올린다.
 *
 * 러닝 기록의 사진은 원래 기기 안에만 있다. **결과 링크를 만들 때(또는 링크가 있는데 사진을 바꿀 때)만**
 * 자격증 사진 한 장을 올려, 링크로 보는 사람에게도 자격증 사진이 보이게 한다(사용자 2026-11-14).
 *
 * 회원은 사진을 넣는 즉시 올린다(사용자 2026-11-19) — 기기를 바꾸거나 기록에서 다시 들어와도 사진이 보이게.
 * GET 은 그 사진을 본인에게 같은 출처로 돌려준다(R2 는 CORS 가 없어 화면이 직접 못 읽고, 이미지 저장에도 같은 출처가 필요하다).
 *
 * TypeLog 에는 R2 키가 없다 → 포털(myjane)의 /api/storage/typelog-photo 가 대신 올린다(공유 비밀).
 * 키는 추측하기 어렵게 `typelog/run/<응시 id>-<무작위>.jpg`, 바꾸면 옛 파일을 지운다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md 「공유 사진」
 */

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound("없는 기록이에요.");
    const guestKey = new URL(req.url).searchParams.get("guestKey");

    await connectDB();
    const Attempt = getAttemptModel();
    const attempt = (await Attempt.findById(id).lean()) as AttemptDoc | null;
    if (!attempt) return notFound("없는 기록이에요.");
    const viewer = await getViewer(req);
    const mine =
      attempt.owner.kind === "user"
        ? !!viewer && viewer.userId === attempt.owner.userId
        : !!guestKey && guestKey === attempt.owner.guestKey;
    if (!mine) return forbidden("이 기록은 고칠 수 없어요.");

    const body = Buffer.from(await req.arrayBuffer());
    if (!body.length || body.length > 1_500_000) return badRequest("사진 크기가 맞지 않아요.");

    const key = `typelog/run/${id}-${crypto.randomBytes(9).toString("hex")}.jpg`;
    const { url } = await portal("POST", key, body);

    const old = (attempt.custom as { photoKey?: string } | undefined)?.photoKey;
    await Attempt.updateOne({ _id: attempt._id }, { $set: { "custom.photoUrl": url, "custom.photoKey": key } });
    if (old && old !== key) void portal("DELETE", old).catch(() => {});

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/attempts/[id]/photo?guestKey= — 서버에 둔 자격증 사진(얼굴 크롭)을 본인에게 같은 출처로 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound("없는 기록이에요.");
    const guestKey = new URL(req.url).searchParams.get("guestKey");
    await connectDB();
    const attempt = (await getAttemptModel().findById(id).select({ owner: 1, custom: 1 }).lean()) as AttemptDoc | null;
    if (!attempt) return notFound("없는 기록이에요.");
    const viewer = await getViewer(req);
    const mine =
      attempt.owner.kind === "user"
        ? !!viewer && viewer.userId === attempt.owner.userId
        : !!guestKey && guestKey === attempt.owner.guestKey;
    if (!mine) return forbidden("이 기록은 볼 수 없어요.");
    const url = (attempt.custom as { photoUrl?: string | null } | undefined)?.photoUrl;
    if (!url) return notFound("사진이 없어요.");
    const res = await fetch(url);
    if (!res.ok) return notFound("사진을 불러오지 못했어요.");
    return new NextResponse(await res.arrayBuffer(), {
      headers: { "content-type": res.headers.get("content-type") ?? "image/jpeg", "cache-control": "private, max-age=300" },
    });
  } catch (err) {
    return serverError(err);
  }
}
