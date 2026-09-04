import Link from "next/link";
import { Sheet } from "@/components/Sheet";

/** 회차 목록은 최근 20건 + 더 보기 → my-obsidian-vault / 10-Projects/TypeLog.md */
export default function RecordsPage() {
  return (
    <Sheet eyebrow="RECORDS" headline="아직 기록이 없어요">
      <p className="lead">
        테스트를 마치면 회차별로 여기 쌓여요.
        <br />
        다시 해보면 지난번과 무엇이 달라졌는지 함께 보여드려요.
      </p>
      <div style={{ marginTop: 20 }}>
        <Link className="btn btn--primary" href="/types">
          타입 찾아보기 →
        </Link>
      </div>
    </Sheet>
  );
}
