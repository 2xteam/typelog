import { NextResponse } from "next/server";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { badRequest, forbidden, getViewer, notFound, serverError } from "@/lib/auth";
import { getAttemptModel, type AttemptDoc } from "@/models/Attempt";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/attempts/[id]/photo?guestKey= — 결과 링크 자격증에 보일 사진(얼굴 크롭 JPEG)을 올린다.
 *
 * 러닝 기록의 사진은 원래 기기 안에만 있다. **결과 링크를 만들 때(또는 링크가 있는데 사진을 바꿀 때)만**
 * 자격증 사진 한 장을 올려, 링크로 보는 사람에게도 자격증 사진이 보이게 한다(사용자 2026-11-14).
 *
 * TypeLog 에는 R2 키가 없다 → 포털(myjane)의 /api/storage/typelog-photo 가 대신 올린다(공유 비밀).
 * 키는 추측하기 어렵게 `typelog/run/<응시 id>-<무작위>.jpg`, 바꾸면 옛 파일을 지운다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md 「공유 사진」
 */

const PORTAL = (process.env.PORTAL_API_ORIGIN || process.env.NEXT_PUBLIC_PORTAL_ORIGIN || "https://www.myjane.co.kr").replace(/\/+$/, "");

async function portal(method: "POST" | "DELETE", key: string, body?: Buffer) {
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
