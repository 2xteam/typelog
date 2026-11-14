import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin, serverError } from "@/lib/auth";
import { getAttemptModel } from "@/models/Attempt";
import { getQuizModel } from "@/models/Quiz";
import { getUserModel } from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/referrals — 공유 성과.
 *
 * 공유한 사람(회원)마다: 결과 링크 수 · 링크 열람 · 그 링크로 시작한 응시 ·
 * 가입으로 이어진 수(conversion.kind = signup) · 로그인으로 이어진 수.
 * 그리고 가입한 사람 목록(누구의 링크로 왔는지).
 *
 * 원본: attempts.share(링크) · attempts.via(누구의 링크로 왔나) · attempts.conversion(계정으로 옮긴 순간).
 * 2026-11-14 부터 쌓인다 — 그 전 기록에는 via 가 없다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md 「공유 성과」
 */

/** 화면에 다 보이지 않게 — 관리자도 연락처 전체가 필요한 화면이 아니다 */
function maskEmail(e?: string | null) {
  if (!e) return null;
  const [id, host] = e.split("@");
  if (!host) return null;
  return `${id.slice(0, 2)}${"*".repeat(Math.max(1, id.length - 2))}@${host}`;
}
function maskPhone(p?: string | null) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  return d.length >= 8 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : null;
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    await connectDB();
    const Attempt = getAttemptModel();

    // 공유한 쪽 — 결과 링크가 있는 회원 기록
    const shares = await Attempt.aggregate<{ _id: string; links: number; views: number }>([
      { $match: { "share.token": { $ne: null }, "owner.kind": "user" } },
      { $group: { _id: "$owner.userId", links: { $sum: 1 }, views: { $sum: { $ifNull: ["$share.viewCount", 0] } } } },
    ]);

    // 링크로 들어온 쪽
    const via = await Attempt.aggregate<{ _id: string; plays: number; completed: number; signups: number; logins: number }>([
      { $match: { "via.sharerUserId": { $ne: null } } },
      {
        $group: {
          _id: "$via.sharerUserId",
          plays: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          signups: { $sum: { $cond: [{ $eq: ["$conversion.kind", "signup"] }, 1, 0] } },
          logins: { $sum: { $cond: [{ $eq: ["$conversion.kind", "login"] }, 1, 0] } },
        },
      },
    ]);

    // 가입한 사람 목록 — 최근 300
    const converted = await Attempt.find({ "conversion.kind": "signup" })
      .select({ via: 1, conversion: 1, quizId: 1, quizSlug: 1, "result.code": 1 })
      .sort({ "conversion.at": -1 })
      .limit(300)
      .lean();

    const userIds = new Set<string>();
    for (const s of shares) if (s._id) userIds.add(s._id);
    for (const v of via) if (v._id) userIds.add(v._id);
    for (const c of converted) {
      if (c.via?.sharerUserId) userIds.add(c.via.sharerUserId);
      if (c.conversion?.userId) userIds.add(c.conversion.userId);
    }
    const users = await getUserModel()
      .find({ _id: { $in: [...userIds] } })
      .select({ nickname: 1, name: 1, email: 1, phone: 1, createdAt: 1 })
      .lean();
    const who = new Map(
      users.map((u) => {
        const x = u as unknown as { _id: unknown; nickname?: string; name?: string; email?: string; phone?: string; createdAt?: Date };
        return [
          String(x._id),
          {
            userId: String(x._id),
            nickname: x.nickname ?? x.name ?? "이름없음",
            email: maskEmail(x.email),
            phone: maskPhone(x.phone),
            joinedAt: x.createdAt ?? null,
          },
        ];
      }),
    );
    const quizzes = await getQuizModel().find({}).select({ slug: 1, title: 1 }).lean();
    const title = new Map(quizzes.map((q) => [String(q._id), q.title]));

    const rows = new Map<string, { links: number; views: number; plays: number; completed: number; signups: number; logins: number }>();
    const row = (id: string) => {
      if (!rows.has(id)) rows.set(id, { links: 0, views: 0, plays: 0, completed: 0, signups: 0, logins: 0 });
      return rows.get(id)!;
    };
    for (const s of shares) if (s._id) Object.assign(row(s._id), { links: s.links, views: s.views });
    for (const v of via) if (v._id) Object.assign(row(v._id), { plays: v.plays, completed: v.completed, signups: v.signups, logins: v.logins });

    const sharers = [...rows.entries()]
      .map(([id, r]) => ({ ...(who.get(id) ?? { userId: id, nickname: "(탈퇴·없음)", email: null, phone: null, joinedAt: null }), ...r }))
      .sort((a, b) => b.signups - a.signups || b.plays - a.plays || b.views - a.views);

    const total = sharers.reduce(
      (t, r) => ({
        links: t.links + r.links,
        views: t.views + r.views,
        plays: t.plays + r.plays,
        signups: t.signups + r.signups,
        logins: t.logins + r.logins,
      }),
      { links: 0, views: 0, plays: 0, signups: 0, logins: 0 },
    );

    return NextResponse.json({
      ok: true,
      since: "2026-11-14",
      total,
      sharers,
      signups: converted.map((c) => ({
        at: c.conversion?.at ?? null,
        member: c.conversion?.userId ? (who.get(c.conversion.userId) ?? null) : null,
        sharer: c.via?.sharerUserId ? (who.get(c.via.sharerUserId) ?? null) : null,
        quiz: title.get(String(c.quizId)) ?? c.quizSlug,
        resultCode: c.result?.code ?? null,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
