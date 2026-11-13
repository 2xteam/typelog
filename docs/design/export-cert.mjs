/**
 * 러닝 급수증 시안 HTML → PNG.
 *
 *   node docs/design/export-cert.mjs [출력폴더]
 *
 * 구조·방식은 docs/marketing/export-cards.mjs 와 같다 — 로컬 Chrome(없으면 Edge)을
 * headless 로 띄우고, playwright-core 는 다른 저장소에 설치된 것을 빌려 쓴다.
 * 화면 캡처는 흐리므로 2배 해상도로 찍는다.
 *
 * 경로는 `pathToFileURL` 로 만든다 — 직접 이어 붙이면 윈도우 역슬래시를 바꾸느라
 * 이스케이프가 들어가고, 셸 heredoc 으로 이 파일을 만들 때 그게 먹힌다.
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire, } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] ?? path.join(here, "out");
const scale = Number(process.env.SCALE ?? 2);

let pw = null;
for (const c of ["C:/Dev/klead", "C:/Dev/jangmini", "C:/Dev/myjane"]) {
  try {
    pw = createRequire(path.join(c, "package.json"))("playwright-core");
    break;
  } catch {
    /* 다음 */
  }
}
if (!pw) {
  console.error("playwright-core 를 찾지 못했습니다.");
  process.exit(1);
}

let browser = null;
for (const opt of [{ channel: "chrome" }, { channel: "msedge" }]) {
  try {
    browser = await pw.chromium.launch({ ...opt, headless: true });
    break;
  } catch {
    /* 다음 */
  }
}
if (!browser) {
  console.error("Chrome 또는 Edge 를 찾지 못했습니다.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 1200 }, deviceScaleFactor: scale });
// 사용법: node export-cert.mjs <출력폴더> [html 파일] [찍을 요소 id ...]
const html = process.argv[3] ?? "run-license.html";
const ids = process.argv.slice(4).length ? process.argv.slice(4) : ["license"];
await page.goto(pathToFileURL(path.join(here, html)).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);

for (const id of ids) {
  const el = await page.$("#" + id);
  if (!el) {
    console.log("없음:", id);
    continue;
  }
  const file = path.join(outDir, `${id}.png`);
  await el.screenshot({ path: file });
  console.log("찍음:", file);
}
await browser.close();
