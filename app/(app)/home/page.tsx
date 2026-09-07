import Link from "next/link";
import { Sheet } from "@/components/Sheet";

/** 포털에서 들어오는 링크는 소개 페이지를 거치지 않고 여기로 온다 */
export default function HomePage() {
  return (
    <>
      <Sheet
        tone="dark"
        eyebrow="TYPE PLAY"
        headline={
          <>
            오늘은
            <br />
            어떤 걸 해볼까요?
          </>
        }
        lead="짧은 질문에 답하면 나의 타입이 나와요."
      >
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <Link className="btn btn--primary" href="/types">
            타입 찾아보기 →
          </Link>
          <Link className="btn btn--ghost" href="/records">
            내 기록
          </Link>
        </div>
      </Sheet>

      <Sheet eyebrow="MY COLLECTION" headline="타입 도감">
        <p className="lead">
          해본 테스트에서 나온 타입이 여기 모여요.
          <br />
          아직 아무것도 없어요 — 첫 테스트를 해보면 채워져요.
        </p>
      </Sheet>
    </>
  );
}
