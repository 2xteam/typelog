"use client";

import { Sheet } from "@/components/Sheet";
import { useSession } from "@/lib/useSession";

/**
 * 관리 화면 링크를 여기 두지 않는다. **관리는 포털(`www.myjane.co.kr/admin`)에서 한다**
 * → my-obsidian-vault / 30-Patterns/통합 admin.md
 */
export default function MyPage() {
  const session = useSession();
  if (session.status !== "signed-in") return null;

  return (
    <Sheet eyebrow="MY" headline="내 정보">
      <dl style={{ margin: "18px 0 0", display: "grid", gap: 12 }}>
        <div>
          <dt style={labelStyle}>이름</dt>
          <dd style={valueStyle}>{session.user.name || "—"}</dd>
        </div>
        <div>
          <dt style={labelStyle}>전화번호</dt>
          <dd style={valueStyle}>{session.user.phone || "—"}</dd>
        </div>
      </dl>
      <p className="lead">
        이름과 연락처는 myjane 계정 정보예요. 바꾸려면 포털에서 고쳐요.
      </p>
    </Sheet>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.3px",
  color: "var(--text-muted)",
} as const;

const valueStyle = {
  margin: "4px 0 0",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--text-primary)",
} as const;
