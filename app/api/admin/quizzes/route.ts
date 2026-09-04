import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin, badRequest, conflict, notFound, serverError } from "@/lib/auth";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getAttemptModel } from "@/models/Attempt";
import { validateImport } from "@/lib/quizValidate";
import type { QuizImport } from "@/lib/quizTypes";

export const runtime = "nodejs";

/** GET /api/admin/quizzes — 목록 (응답 수까지) */
export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    await connectDB();
    const rows = await getQuizModel().find({}).sort({ order: 1, createdAt: 1 }).lean();
    const Attempt = getAttemptModel();
    const list = await Promise.all(
      rows.map(async (q: Record<string, unknown>) => ({
        slug: q.slug,
        title: q.title,
        status: q.status,
        schedule: q.schedule,
        itemCount: Array.isArray(q.items) ? q.items.length : 0,
        revision: q.revision,
        scoringRevision: q.scoringRevision,
        contentRevision: q.contentRevision,
        attempts: await Attempt.countDocuments({ quizId: q._id }),
      })),
    );
    return NextResponse.json({ ok: true, quizzes: list });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/admin/quizzes — 검사 또는 등록.
 *
 * `?dryRun=1` 이면 검사만 하고 저장하지 않는다. 관리자 화면의 [검사] 버튼이 쓴다.
 *
 * `upsert` 는 **draft 만** 받는다. published 는 문항이 잠기므로 거부한다 —
 * 화면에서만 막으면 뚫린다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */
export async function POST(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if ("error" in guard) return guard.error;

    const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return badRequest("JSON 을 읽을 수 없어요.");
    }

    const report = validateImport(payload);

    await connectDB();
    const Quiz = getQuizModel();
    const ResultType = getResultTypeModel();

    const body = payload as QuizImport;
    const slug = body.mode === "content" ? body.quizSlug : body.quiz?.slug;
    const existing = slug ? await Quiz.findOne({ slug }).lean() : null;

    // 상태에 따른 거부는 검사 단계에서도 알려 준다
    if (body.mode === "upsert" && existing && existing.status !== "draft") {
      report.errors.unshift({
        path: "quiz.slug",
        message:
          '이미 공개된 질문지예요. 문장만 고치는 것이면 mode: "content", 문항을 고치는 것이면 먼저 공개를 해제해요.',
      });
    }
    if (body.mode === "content" && !existing) {
      report.errors.unshift({ path: "quizSlug", message: "그 slug 의 질문지가 없어요." });
    }

    if (report.errors.length || dryRun) {
      return NextResponse.json({ ok: report.errors.length === 0, report }, { status: report.errors.length ? 400 : 200 });
    }

    // ── content: 문장만 갈아 끼운다. code·vector 는 바꿀 수 없다 ──
    if (body.mode === "content") {
      const quizId = existing!._id;
      for (const t of body.resultTypes) {
        const prev = await ResultType.findOne({ quizId, code: t.code }).lean();
        if (!prev) return notFound(`"${t.code}" 는 없는 결과 타입이에요.`);
        if (t.vector && JSON.stringify(t.vector) !== JSON.stringify(prev.vector ?? null)) {
          return conflict(`"${t.code}" 의 vector 는 채점 결과와 이어져 있어 바꿀 수 없어요.`);
        }
        await ResultType.updateOne(
          { quizId, code: t.code },
          {
            $set: {
              name: t.name,
              subtitle: t.subtitle ?? null,
              emoji: t.emoji,
              imageUrl: t.imageUrl ?? null,
              imageCredit: t.imageCredit ?? null,
              color: t.color ?? null,
              rarity: t.rarity ?? null,
              content: t.content,
              updatedAt: new Date(),
            },
          },
        );
      }
      const updated = await Quiz.findOneAndUpdate(
        { _id: quizId },
        { $inc: { contentRevision: 1 }, $set: { updatedAt: new Date() } },
        { new: true },
      ).lean();
      return NextResponse.json({
        ok: true,
        report,
        mode: "content",
        slug,
        contentRevision: updated?.contentRevision,
      });
    }

    // ── upsert: draft 를 통째로 교체한다 ──
    const q = body.quiz;
    const sc = q.schedule ?? {};
    const doc = {
      slug: q.slug,
      title: q.title,
      tagline: q.tagline,
      category: q.category ?? "etc",
      ageRange: q.ageRange ?? { min: null, max: null },
      cover: { emoji: q.cover?.emoji ?? null, imageUrl: q.cover?.imageUrl ?? null },
      status: "draft" as const,
      schedule: {
        startAt: sc.startAt ? new Date(sc.startAt) : null,
        endAt: sc.endAt ? new Date(sc.endAt) : null,
        openingNoticeText: sc.openingNoticeText ?? null,
      },
      estimatedMinutes: q.estimatedMinutes ?? report.summary?.estimatedMinutes ?? null,
      shuffle: q.shuffle ?? false,
      order: q.order ?? 100,
      outcomes: body.outcomes,
      items: body.items,
      resolver: body.resolver,
      updatedAt: new Date(),
    };

    const saved = await Quiz.findOneAndUpdate(
      { slug: q.slug },
      { $set: doc, $inc: existing ? { revision: 1 } : {}, $setOnInsert: { createdAt: new Date() } },
      { new: true, upsert: true },
    ).lean();

    // 결과 타입은 통째로 교체한다 — draft 에서는 옛 내용을 남기지 않는다
    await ResultType.deleteMany({ quizId: saved!._id });
    await ResultType.insertMany(
      body.resultTypes.map((t) => ({
        quizId: saved!._id,
        quizSlug: q.slug,
        code: t.code,
        name: t.name,
        subtitle: t.subtitle ?? null,
        emoji: t.emoji,
        imageUrl: t.imageUrl ?? null,
        imageCredit: t.imageCredit ?? null,
        color: t.color ?? null,
        vector: t.vector ?? null,
        rarity: t.rarity ?? null,
        content: t.content,
        updatedAt: new Date(),
      })),
    );

    return NextResponse.json({
      ok: true,
      report,
      mode: "upsert",
      slug: q.slug,
      created: !existing,
      revision: saved!.revision,
    });
  } catch (err) {
    return serverError(err);
  }
}
