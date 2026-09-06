import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TypeLog",
    short_name: "TypeLog",
    description: "질문에 답하고 나의 타입을 기록하는 TypeLog",
    start_url: "/home",
    display: "standalone",
    /* 라이트 전용이므로 첫 페인트 색을 globals.css 의 :root 와 같게 둔다 */
    background_color: "#f7fbfb",
    theme_color: "#116271",
    orientation: "portrait",
    icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png" }],
  };
}
