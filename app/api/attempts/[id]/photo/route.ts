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
 * 사진을 넣으면 그 결과에 바로 저장한다 — 회원 · 비회원 모두(사용자 2026-11-19). 새로고침 · 기기 저장소가 지워져도,
 * 회원은 다른 기기에서도 보인다. ?kind=wide 는 신문 · 수배용 넓은 사진(긴 변 1600), 없으면 얼굴 크롭.
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

    const wide = new URL(req.url).searchParams.get("kind") === "wide";
    const body = Buffer.from(await req.arrayBuffer());
    if (!body.length || body.length > (wide ? 3_000_000 : 1_500_000)) return badRequest("사진 크기가 맞지 않아요.");

    // 포털 키 규칙(<응시 id>-<영숫자 12~32>)에 맞춰 넓은 사진은 무작위 앞에 w 를 붙인다 → myjane/app/api/storage/typelog-photo
    const key = `typelog/run/${id}-${wide ? "w" : ""}${crypto.randomBytes(9).toString("hex")}.jpg`;
    const { url } = await portal("POST", key, body);

    const c = (attempt.custom ?? {}) as { photoKey?: string; photoWideKey?: string };
    const old = wide ? c.photoWideKey : c.photoKey;
    await Attempt.updateOne(
      { _id: attempt._id },
      {
        $set: {
          ...(wide ? { "custom.photoWideUrl": url, "custom.photoWideKey": key } : { "custom.photoUrl": url, "custom.photoKey": key }),
          // 사진 단계에서 「동의하고 …」 를 눌러야 올라온다 — 그 시각(마지막 동의)
          "custom.photoConsentAt": new Date(),
        },
      },
    );
    if (old && old !== key) void portal("DELETE", old).catch(() => {});

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/attempts/[id]/photo?guestKey=&kind=wide — 서버에 둔 사진을 본인에게 같은 출처로 */
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
    const wide = new URL(req.url).searchParams.get("kind") === "wide";
    const c = (attempt.custom ?? {}) as { photoUrl?: string | null; photoWideUrl?: string | null };
    const url = wide ? c.photoWideUrl : c.photoUrl;
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
