import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin, badRequest, conflict, notFound, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getAttemptModel } from "@/models/Attempt";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/quiz-status — 공개 · 공개 해제 · 종료.
 *
 * body: `{ slug, action: "publish" | "unpublish" | "close" }`
 *
 * 경로가 한 겹인 이유 — 포털의 통합 admin 프록시가 `[app]/[resource]` **한 겹**만
 * 넘긴다. `quizzes/<slug>/status` 처럼 두 겹이면 닿지 않으므로 slug 를 본문에 담는다.
 * → my-obsidian-vault / 30-Patterns/통합 admin.md
 *
 * `unpublish` 는 **응답이 0건일 때만** 허용한다. 한 건이라도 있으면 그 응답이
 * 가리키는 문항이 사라질 수 있으므로 막고, 새 slug 로 만들라고 안내한다.
 */
export async function PATCH(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    let body: { slug?: string; action?: string };
    try {
      body = (await req.json()) as { slug?: string; action?: string };
    } catch {
      return badRequest("JSON 을 읽을 수 없어요.");
    }

    const slug = body.slug?.trim();
    const action = body.action;
    if (!slug) return badRequest("어느 질문지인지 slug 가 필요해요.");
    if (!["publish", "unpublish", "close"].includes(action ?? "")) {
      return badRequest("publish · unpublish · close 중 하나여야 해요.");
    }

    await connectDB();
    const Quiz = getQuizModel();
    const quiz = await Quiz.findOne({ slug }).lean();
    if (!quiz) return notFound("그 slug 의 질문지가 없어요.");

    if (action === "publish") {
      if (quiz.status === "published") return conflict("이미 공개돼 있어요.");
      if (!Array.isArray(quiz.items) || quiz.items.length === 0) {
        return badRequest("문항이 없어서 공개할 수 없어요.");
      }
      await Quiz.updateOne(
        { slug },
        { $set: { status: "published", publishedAt: new Date(), updatedAt: new Date() } },
      );
      return NextResponse.json({ ok: true, status: "published" });
    }

    if (action === "unpublish") {
      const attempts = await getAttemptModel().countDocuments({ quizId: quiz._id });
      if (attempts > 0) {
        return conflict(
          `응답이 ${attempts}건 있어 공개를 해제할 수 없어요. 문항을 고치려면 새 slug 로 만들어요.`,
        );
      }
      await Quiz.updateOne(
        { slug },
        { $set: { status: "draft", publishedAt: null, updatedAt: new Date() } },
      );
      return NextResponse.json({ ok: true, status: "draft" });
    }

    await Quiz.updateOne({ slug }, { $set: { status: "closed", updatedAt: new Date() } });
    return NextResponse.json({ ok: true, status: "closed" });
  } catch (err) {
    return serverError(err);
  }
}
