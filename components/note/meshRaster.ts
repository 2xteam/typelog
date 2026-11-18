"use client";

import { useEffect, useState } from "react";

/**
 * 카드 앞면 메시를 **한 번만 그려 그림(JPEG)으로** 바꿔 쓴다(2026-11-18 — 모바일에서 끊김).
 *
 * 메시는 블러 필터가 수십 개 든 SVG 다. 모바일 사파리는 카드가 움직이거나 돌 때마다 이 필터를 다시 계산해
 * 프레임이 거의 안 나왔다(PC 는 그래픽 카드가 버텨 몰랐다). 그림으로 바꾸면 움직일 때 다시 그리지 않는다.
 * 이미지 저장(html-to-image)도 SVG 필터를 그리다 깨지는 일이 없어진다.
 *
 * 카드마다 섞임이 고정이라(응시 id) 같은 SVG 는 같은 그림이다 — 주소로 캐시한다.
 * 그리는 동안은 바탕색(base)만 보이고, 다 그리면 바뀐다.
 */
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** 카드 앞면 비율 63:100, 화면 · 저장 이미지 모두 충분한 크기 */
const W = 630;
const H = 1000;

function rasterize(svgUrl: string): Promise<string> {
  const hit = cache.get(svgUrl);
  if (hit) return Promise.resolve(hit);
  const wait = pending.get(svgUrl);
  if (wait) return wait;
  const job = new Promise<string>((resolve, reject) => {
    const src = svgUrl.replace(/^url\("?/, "").replace(/"?\)$/, "");
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d");
        if (!g) throw new Error("no canvas");
        g.drawImage(img, 0, 0, W, H);
        const out = `url("${c.toDataURL("image/jpeg", 0.9)}")`;
        cache.set(svgUrl, out);
        resolve(out);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = src;
  }).finally(() => pending.delete(svgUrl));
  pending.set(svgUrl, job);
  return job;
}

/** SVG 메시 주소 → 그림 주소. 그리기 전엔 null(바탕색만), 실패하면 SVG 그대로 */
export function useMeshImage(svgUrl: string): string | null {
  const [url, setUrl] = useState<string | null>(() => cache.get(svgUrl) ?? null);
  useEffect(() => {
    let alive = true;
    const hit = cache.get(svgUrl);
    if (hit) {
      setUrl(hit);
      return;
    }
    setUrl(null);
    rasterize(svgUrl).then(
      (u) => alive && setUrl(u),
      () => alive && setUrl(svgUrl),
    );
    return () => {
      alive = false;
    };
  }, [svgUrl]);
  return url;
}
