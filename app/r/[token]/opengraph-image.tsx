import { ImageResponse } from "next/og";
import { connectDB } from "@/lib/db";
import { getQuizModel } from "@/models/Quiz";
import { getResultTypeModel } from "@/models/ResultType";
import { getAttemptModel } from "@/models/Attempt";
import { loadKoreanFont } from "@/lib/ogFont";

/**
 * 공유 링크의 미리보기 이미지.
 *
 * 카카오톡·메신저에 링크를 붙이면 이 그림이 먼저 보인다. 글자만 있는 링크와
 * 그림이 있는 링크는 눌리는 정도가 다르다.
 *
 * **친구의 타입 이름까지만 보여준다.** 결과 문장을 그림에 넣으면 링크를 받은
 * 사람이 눌러볼 이유가 없어진다 — 그리고 남의 결과를 미리보기로 아무에게나
 * 퍼뜨리는 셈이 된다.
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

export const runtime = "nodejs";
export const alt = "TypeLog — 친구가 나눈 타입";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1c0733";
const PAPER = "#fdfbff";
const ACCENT = "#7c3aed";
const GOLD = "#c9a84c";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let title = "친구가 타입을 나눠 줬어요";
  let typeName: string | null = null;
  let emoji = "✨";

  try {
    await connectDB();
    const attempt = await getAttemptModel()
      .findOne({ "share.token": token, "share.isPublic": true, status: "completed" })
      .select({ quizId: 1, result: 1 })
      .lean();
    if (attempt) {
      const quiz = await getQuizModel().findById(attempt.quizId).select({ title: 1 }).lean();
      if (quiz?.title) title = quiz.title;
      const t = attempt.result?.code
        ? await getResultTypeModel()
            .findOne({ quizId: attempt.quizId, code: attempt.result.code })
            .select({ name: 1, emoji: 1 })
            .lean()
        : null;
      if (t) {
        typeName = t.name;
        emoji = t.emoji || emoji;
      }
    }
  } catch {
    /* 못 읽어도 기본 그림은 나와야 한다 */
  }

  const headline = typeName ? `친구는 ${typeName}` : "친구가 타입을 나눠 줬어요";
  const font = await loadKoreanFont(`${headline}${title}나도 해보기TypeLog`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: PAPER,
          // 결쩜사 패턴의 시트를 한 장 얹은 모양
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            borderRadius: 48,
            background: `linear-gradient(150deg, ${INK} 0%, #3a1266 100%)`,
            color: PAPER,
          }}
        >
          <div style={{ display: "flex", fontSize: 112, marginBottom: 8 }}>{emoji}</div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: 6,
              color: GOLD,
              marginBottom: 18,
            }}
          >
            TYPELOG
          </div>
          <div
            style={{
              display: "flex",
              fontSize: typeName ? 68 : 54,
              fontWeight: 700,
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 26,
              padding: "12px 28px",
              borderRadius: 999,
              background: ACCENT,
              fontSize: 26,
            }}
          >
            나도 해보기
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 24, opacity: 0.72 }}>
            {title}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Gowun Batang", data: font, weight: 700 as const, style: "normal" as const }]
        : [],
    },
  );
}
