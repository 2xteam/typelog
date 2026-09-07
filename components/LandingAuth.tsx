"use client";

import { loginUrl } from "@/lib/portal";
import { useSession } from "@/lib/useSession";

/**
 * 소개 페이지 헤더에서 **로그인 상태에 따라 갈리는 조각**만 떼어 둔 것.
 *
 * 세션은 클라이언트가 읽는 쿠키에 있어 서버 컴포넌트에서는 알 수 없다.
 * 상태가 정해지기 전에는 아무것도 그리지 않고 자리만 잡아 둔다 —
 * 로그인한 사람에게 "로그인" 버튼이 한 번 스쳐 보이는 것보다 낫다.
 * → my-obsidian-vault / 30-Patterns/인증과 세션 공유.md
 *
 * ⚠️ 다른 네 앱의 `LandingAuth.tsx` 에는 `LandingCta` 도 함께 있는데 여기는 없다.
 * TypeLog 은 **로그인 없이도 타입을 해볼 수 있어서** 본문 CTA 가 "타입 찾아보기"다.
 * 세션에 따라 갈리지 않으므로 페이지에 그대로 둔다.
 */
export function LandingHeaderAuth() {
  const session = useSession();

  if (session.status === "loading") return <div style={{ height: 34 }} />;

  if (session.status === "signed-in") {
    return (
      <a className="btn btn--ghost btn--sm" href="/home">
        내 기록
      </a>
    );
  }

  return (
    <a className="btn btn--ghost btn--sm" href={loginUrl("/home")}>
      로그인
    </a>
  );
}
