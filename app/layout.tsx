import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TypeLog",
  description:
    "질문에 답하면 나의 타입이 나오고, 다시 할 때마다 그 변화가 쌓이는 성향 놀이",
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.webmanifest",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/*
          결쩜사와 동일한 서체 조합.
          본문·라벨은 Pretendard, 큰 헤드라인은 Gowun Batang(명조) 700.
          시스템 폰트 스택으로 대체하면 색을 맞춰도 다른 사이트처럼 보인다.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
        <meta name="apple-mobile-web-app-title" content="TypeLog" />
      </head>
      <body>{children}</body>
    </html>
  );
}
