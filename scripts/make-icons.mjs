/**
 * public/app-icon.svg 에서 PNG 파생물을 만든다.
 *
 *   node scripts/make-icons.mjs
 *
 * sharp 는 Next 의 전이 의존성이라 따로 설치하지 않는다.
 * density 를 높여 렌더한 뒤 축소해야 작은 크기에서 선이 뭉개지지 않는다.
 * → my-obsidian-vault / 20-Design/앱 공통 UI와 아이콘.md
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = path.join(process.cwd(), "public", "app-icon.svg");

/** 이름 → 크기. 쓰임은 볼트의 표와 같다 */
const TARGETS = [
  ["icon.png", 192], // PWA · 일반
  ["favicon.png", 32], // 탭
  ["site-title-icon.png", 64], // TopNav 로고
  ["typelog-link-icon.png", 56], // 다른 앱 스위처
  ["typelog-icon-512.png", 512], // 원본 보관
];

const svg = await readFile(SRC);

for (const [name, size] of TARGETS) {
  const out = path.join(process.cwd(), "public", name);
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(out);
  console.log(`${name.padEnd(24)} ${size}×${size}`);
}
