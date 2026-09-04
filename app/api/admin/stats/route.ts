import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getAttemptModel } from "@/models/Attempt";

export const runtime = "nodejs";

/**
 * GET /api/admin/stats — 통합 admin 의 요약 타일과 표.
 *
 * 응답 모양은 앱마다 같다. 포털은 **무엇을 세는지 모르고 모양만 안다** —
 * 그래서 여기서 항목을 늘리면 포털을 고치지 않아도 화면에 나온다.
 *
 *   stats  : { label, value }[]
 *   tables : { title, columns, rows }[]
 *
 * ⚠️ **집계는 실제 스키마를 보고 짠다.** 화면에 0 이 찍혀도 아무도 오류라고
 * 알려주지 않는다 (SnapWord 가 단어 수를 `$size` 로 세다 늘 0 이던 사고)
 * → my-obsidian-vault / 30-Patterns/통합 admin.md
 */
export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    await connectDB();
    const Quiz = getQuizModel();
    const Attempt = getAttemptModel();

    /** 오늘 00:00 KST — 서버가 UTC 라 직접 계산한다 */
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStart = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) -
        9 * 60 * 60 * 1000,
    );

    const [quizzes, published, attempts, completed, today, guests] = await Promise.all([
      Quiz.countDocuments({}),
      Quiz.countDocuments({ status: "published" }),
      Attempt.countDocuments({}),
      Attempt.countDocuments({ status: "completed" }),
      Attempt.countDocuments({ startedAt: { $gte: todayStart } }),
      Attempt.countDocuments({ "owner.kind": "guest" }),
    ]);

    const rate = attempts > 0 ? Math.round((completed / attempts) * 100) : 0;

    const stats = [
      { label: "질문지", value: quizzes },
      { label: "공개 중", value: published },
      { label: "총 응시", value: attempts },
      { label: "완주", value: completed },
      { label: "완주율(%)", value: rate },
      { label: "오늘 응시", value: today },
      { label: "게스트 응시", value: guests },
    ];

    /** 질문지별 응시 — 어느 질문지가 실제로 쓰이는지 본다 */
    const rows: (string | number)[][] = [];
    const list = await Quiz.find({}).sort({ order: 1 }).lean();
    for (const q of list) {
      const [total, done] = await Promise.all([
        Attempt.countDocuments({ quizId: q._id }),
        Attempt.countDocuments({ quizId: q._id, status: "completed" }),
      ]);
      rows.push([
        q.title,
        q.status === "published" ? "공개" : q.status === "closed" ? "종료" : "작성 중",
        Array.isArray(q.items) ? q.items.length : 0,
        total,
        done,
      ]);
    }

    const tables = rows.length
      ? [
          {
            title: "질문지별 응시",
            columns: ["질문지", "상태", "문항", "응시", "완주"],
            rows,
          },
        ]
      : [];

    return NextResponse.json({ ok: true, stats, tables });
  } catch (err) {
    return serverError(err);
  }
}
