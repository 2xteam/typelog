/**
 * OG 이미지에 쓸 **한글 서체**.
 *
 * `next/og` 의 기본 서체에는 한글이 없다. 안 실으면 글자가 전부 네모(tofu)로
 * 나오는데, 이미지라서 콘솔에도 아무 오류가 남지 않는다 — 카카오톡에 공유해
 * 보기 전까지 모른다.
 *
 * Google Fonts 의 CSS 를 먼저 받아 실제 폰트 파일 주소를 뽑는다. 주소를
 * 코드에 박으면 구글이 파일을 갈아치울 때 조용히 깨진다.
 */

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&display=swap";

/** 빌드/요청마다 다시 받지 않도록 프로세스 안에 담아 둔다 */
let cached: ArrayBuffer | null = null;

export async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  if (cached) return cached;
  try {
    // text= 를 붙이면 그 글자만 담긴 작은 파일을 준다
    const css = await fetch(`${CSS_URL}&text=${encodeURIComponent(text)}`, {
      headers: {
        // 이 UA 가 아니면 woff2 를 주는데 satori 는 woff2 를 읽지 못한다
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/533.1 (KHTML, like Gecko)",
      },
    }).then((r) => r.text());
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    const buf = await fetch(url).then((r) => r.arrayBuffer());
    cached = buf;
    return buf;
  } catch {
    // 서체를 못 받아도 이미지는 나와야 한다. 한글이 네모로 나오는 편이 500 보다 낫다
    return null;
  }
}
