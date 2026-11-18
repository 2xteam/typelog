/**
 * 러닝 노트 — 아이덴티티 컬러.
 *
 * 색은 **고르지 않는다.** 성향에서 나온다(사용자 2026-11-18).
 *   - 8개 극(C·P / L·S / A·I / R·F)마다 이름 있는 색 계열이 하나씩 있다. 계열마다 4색
 *   - 내가 나온 4개 극의 계열에서 한 색씩 → 그 4색이 섞여 카드가 된다
 *   - 계열 안에서 어느 색인가: **진하게(강한 쪽) 둘 · 은은하게(약한 쪽) 둘** 중에서 고르고,
 *     둘 중 하나는 카드 번호(응시 id)로 정한다. 한 번 나온 카드의 색은 다시 바뀌지 않는다
 *   - 결과 화면의 색 원판은 내 색이 어디 있는지 **보여 주기만** 한다. 바꾸는 버튼은 없다
 *
 * 톤은 둘 — 밝은 톤(파스텔, 기본 — 사용자 2026-11-18) · 진한 톤. `NEXT_PUBLIC_NOTE_TONE=deep` 이면 진한 톤.
 * 서버 · 브라우저가 같은 값을 읽어야 해서 NEXT_PUBLIC 이다(빌드 때 박힌다). 무대는 어느 톤이든 어둡다.
 * 글자색은 아래 `cardTheme` 이 대비를 계산해 정한다 — 밝은 톤이면 에스프레소 글자로 저절로 바뀐다.
 *
 * 서버(admin · 공유 API)에서도 같은 색을 내야 하므로 이 파일은 순수 함수만 둔다.
 * → my-obsidian-vault / 50-Plans/K 러닝 노트.md
 */

export type NamedColor = { ko: string; en: string; hex: string };
export type Pole = {
  code: string;
  /** 원판 안쪽 고리 · 카드 표의 값 */
  ko: string;
  /** 카드 앞면 이탤릭 노트 줄 */
  note: string;
  colors: [NamedColor, NamedColor, NamedColor, NamedColor];
};

/**
 * 원판 순서 = 색상환 순서(주황 → 노랑 → 초록 → 청록 → 파랑 → 보라 → 빨강 → 갈색).
 * 앞의 두 색이 「진하게」, 뒤의 두 색이 「은은하게」 자리다.
 */
const DEEP: Pole[] = [
  {
    code: "C",
    ko: "크루형",
    note: "Crew",
    colors: [
      { ko: "테라코타", en: "Terracotta", hex: "#9c4a30" },
      { ko: "러스트", en: "Rust", hex: "#8a3b22" },
      { ko: "코퍼", en: "Copper", hex: "#8c5229" },
      { ko: "시에나", en: "Burnt Sienna", hex: "#7a3a24" },
    ],
  },
  {
    code: "F",
    ko: "즐김형",
    note: "Joy",
    colors: [
      { ko: "앰버", en: "Amber", hex: "#8a5a10" },
      { ko: "오커", en: "Ochre", hex: "#835e1c" },
      { ko: "머스타드", en: "Mustard", hex: "#756116" },
      { ko: "브론즈", en: "Bronze", hex: "#6e5220" },
    ],
  },
  {
    code: "L",
    ko: "장거리형",
    note: "Long",
    colors: [
      { ko: "포레스트", en: "Forest", hex: "#1f4a33" },
      { ko: "헌터 그린", en: "Hunter Green", hex: "#24503a" },
      { ko: "모스", en: "Moss", hex: "#45512a" },
      { ko: "올리브", en: "Olive", hex: "#4f5323" },
    ],
  },
  {
    code: "P",
    ko: "개인형",
    note: "Solo",
    colors: [
      { ko: "딥 틸", en: "Deep Teal", hex: "#0f4f52" },
      { ko: "페트롤", en: "Petrol", hex: "#1a4b5e" },
      { ko: "스프루스", en: "Spruce", hex: "#1e4b42" },
      { ko: "비리디언", en: "Viridian", hex: "#1f5d52" },
    ],
  },
  {
    code: "R",
    ko: "기록형",
    note: "Record",
    colors: [
      { ko: "코발트", en: "Cobalt", hex: "#1f3e86" },
      { ko: "사파이어", en: "Sapphire", hex: "#234594" },
      { ko: "네이비", en: "Navy", hex: "#1b2a55" },
      { ko: "프러시안 블루", en: "Prussian Blue", hex: "#1c3350" },
    ],
  },
  {
    code: "A",
    ko: "중독형",
    note: "Daily",
    colors: [
      { ko: "아메시스트", en: "Amethyst", hex: "#4e2d73" },
      { ko: "인디고", en: "Indigo", hex: "#2f2c70" },
      { ko: "플럼", en: "Plum", hex: "#552346" },
      { ko: "바이올렛", en: "Violet", hex: "#432f6e" },
    ],
  },
  {
    code: "S",
    ko: "단거리형",
    note: "Short",
    colors: [
      { ko: "크림슨", en: "Crimson", hex: "#8e1d2e" },
      { ko: "버건디", en: "Burgundy", hex: "#6a1b31" },
      { ko: "가넷", en: "Garnet", hex: "#74202d" },
      { ko: "옥스블러드", en: "Oxblood", hex: "#561821" },
    ],
  },
  {
    code: "I",
    ko: "간헐적형",
    note: "Now & then",
    colors: [
      { ko: "모카", en: "Mocha", hex: "#5e4334" },
      { ko: "카멜", en: "Camel", hex: "#7d5b37" },
      { ko: "토프", en: "Taupe", hex: "#5d5247" },
      { ko: "세피아", en: "Sepia", hex: "#4f3b2a" },
    ],
  },
];

/** 밝은 톤 — 같은 계열 · 같은 자리, 파스텔. 앞 두 색이 조금 더 짙다(진하게) */
const LIGHT_COLORS: Record<string, Pole["colors"]> = {
  C: [
    { ko: "코럴", en: "Coral", hex: "#f0a588" },
    { ko: "살몬", en: "Salmon", hex: "#f2b09a" },
    { ko: "피치", en: "Peach", hex: "#f8d3bf" },
    { ko: "애프리콧", en: "Apricot", hex: "#f9dcb8" },
  ],
  F: [
    { ko: "허니", en: "Honey", hex: "#f2cf7e" },
    { ko: "버터", en: "Butter", hex: "#f5dc8f" },
    { ko: "바닐라", en: "Vanilla", hex: "#f7e9b8" },
    { ko: "크림", en: "Cream", hex: "#f6edcc" },
  ],
  L: [
    { ko: "세이지", en: "Sage", hex: "#b9cfa4" },
    { ko: "피스타치오", en: "Pistachio", hex: "#c6dba2" },
    { ko: "말차 라테", en: "Matcha Latte", hex: "#d5e2bf" },
    { ko: "티 그린", en: "Tea Green", hex: "#dcebc8" },
  ],
  P: [
    { ko: "민트", en: "Mint", hex: "#a8dccb" },
    { ko: "셀라돈", en: "Celadon", hex: "#b3d9c9" },
    { ko: "아쿠아 헤이즈", en: "Aqua Haze", hex: "#cdeae0" },
    { ko: "시폼", en: "Seafoam", hex: "#d4efe6" },
  ],
  R: [
    { ko: "스카이", en: "Sky", hex: "#a9c8ec" },
    { ko: "콘플라워", en: "Cornflower", hex: "#b3c2ee" },
    { ko: "파우더 블루", en: "Powder Blue", hex: "#cbdcf1" },
    { ko: "아이스", en: "Ice", hex: "#d9e6f5" },
  ],
  A: [
    { ko: "라벤더", en: "Lavender", hex: "#c6b5ea" },
    { ko: "라일락", en: "Lilac", hex: "#d1b4e3" },
    { ko: "페리윙클", en: "Periwinkle", hex: "#cfd0f2" },
    { ko: "모브 미스트", en: "Mauve Mist", hex: "#ddd0ef" },
  ],
  S: [
    { ko: "로즈", en: "Rose", hex: "#f2a7b5" },
    { ko: "베리 밀크", en: "Berry Milk", hex: "#eeb0c4" },
    { ko: "블러시", en: "Blush", hex: "#f6ccd4" },
    { ko: "체리 블라썸", en: "Cherry Blossom", hex: "#f8d8e0" },
  ],
  I: [
    { ko: "라테", en: "Latte", hex: "#dcc3a6" },
    { ko: "카푸치노", en: "Cappuccino", hex: "#d6b99b" },
    { ko: "오트", en: "Oat", hex: "#e8dcc8" },
    { ko: "샌드", en: "Sand", hex: "#eadfcb" },
  ],
};

/** 2026-11-18 사용자 결정으로 밝은 톤이 기본. 진한 톤은 NEXT_PUBLIC_NOTE_TONE=deep */
export const TONE: "deep" | "light" = process.env.NEXT_PUBLIC_NOTE_TONE === "deep" ? "deep" : "light";

export const POLES: Pole[] = TONE === "light" ? DEEP.map((p) => ({ ...p, colors: LIGHT_COLORS[p.code] })) : DEEP;

export const poleByCode = (code: string) => POLES.find((p) => p.code === code) ?? null;

/** 카드 표의 왼쪽 칸 — 축 순서(who · dist · freq · mind)와 같다 */
export const AXIS_EN: Record<string, string> = { who: "Who", dist: "Distance", freq: "Rhythm", mind: "Mind" };

/** 축 하나의 결과 — 결과 API 의 outcomes(id · pomp · left · right)에서 만든다 */
export type AxisPick = {
  id: string;
  /** 축 이름(「누구와 달리나요」) */
  label: string;
  code: string;
  /** 「크루형」 */
  pole: string;
  /** 내가 기운 쪽으로 몇 % — 3문항이라 67 · 100 둘 뿐이다 */
  pct: number;
  strong: boolean;
  color: NamedColor;
  /** 원판에서 찾기 — 몇 번째 계열의 몇 번째 색 */
  at: { pole: number; shade: number };
};

export type AxisDecl = { id: string; label?: string | null; left?: { code: string; label?: string | null } | null; right?: { code: string; label?: string | null } | null };

/** 문자열 → 32비트 정수(FNV-1a). 응시 id 로 색을 고정하는 데만 쓴다 */
export function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * 축 4개 → 아이덴티티 컬러 4개.
 * `pomp` 50 미만이 왼쪽(채점 `letters` 와 같은 규칙). 축 순서는 받은 순서 그대로.
 */
export function pickAxes(axes: AxisDecl[], pomp: Record<string, number>, seed: string): AxisPick[] {
  const h = hash(seed);
  return axes.flatMap((a, i) => {
    if (!a.left?.code || !a.right?.code) return [];
    const p = pomp[a.id] ?? 50;
    const left = p < 50;
    const side = left ? a.left : a.right;
    const pct = Math.round(left ? 100 - p : p);
    const strong = pct >= 90;
    const poleIdx = POLES.findIndex((x) => x.code === side.code);
    if (poleIdx < 0) return [];
    const shade = (strong ? 0 : 2) + ((h >>> (i * 3)) & 1);
    return [
      {
        id: a.id,
        label: a.label ?? a.id,
        code: side.code,
        pole: side.label ?? POLES[poleIdx].ko,
        pct,
        strong,
        color: POLES[poleIdx].colors[shade],
        at: { pole: poleIdx, shade },
      },
    ];
  });
}

/** 로스팅 포인트 — 「진하게」 축이 몇 개인가(0~4) */
export const ROAST = ["라이트", "미디엄", "시티", "풀시티", "프렌치"] as const;
export const roastLevel = (picks: AxisPick[]) => Math.min(4, picks.filter((p) => p.strong).length);

// ── 대비 ──────────────────────────────────────────────

type RGB = [number, number, number];
export const rgb = (hex: string): RGB => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: RGB) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const luminance = (c: RGB) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
export const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

/** 카드 글자색 후보 — 아이보리(어두운 카드) · 에스프레소(밝은 카드, 밝은 톤을 열 때) */
export const IVORY = "#f4ecdd";
export const ESPRESSO = "#1d1510";
/** 색 한 칸 위의 글자색 — 원판 라벨처럼 한 색 위에 올라가는 글자 */
export const inkOn = (hex: string) => (contrast(rgb(IVORY), rgb(hex)) >= contrast(rgb(ESPRESSO), rgb(hex)) ? IVORY : ESPRESSO);

/** 글자 대비 목표. AA(4.5) 에 메시가 섞이는 몫을 조금 더 얹었다 */
const TARGET = 4.8;

export type CardTheme = {
  /** 글자색 */
  ink: string;
  /** 「어두운 카드」 인가 — 금박 장식 색을 고르는 데 쓴다 */
  dark: boolean;
  /** 앞면 위에 덮는 막의 진하기(0~0.6). 어느 색에서도 글자가 TARGET 을 넘게 하는 최소값 */
  scrim: number;
  /** 가장 나쁜 곳의 대비(막을 덮은 뒤) — admin · 검사용 */
  worst: number;
  /** 뒷면 바탕 — 첫 색을 막만큼 눌러 단색으로 */
  back: string;
};

/**
 * 4색 위에 어떤 글자색을 쓸지. 각 색 **모두**에서 대비를 재고 가장 나쁜 값으로 고른다
 * (메시라 글자 밑에 어느 색이 올지 모른다). 그래도 모자라면 막(scrim)을 덮어 맞춘다.
 */
export function cardTheme(hexes: string[]): CardTheme {
  const cols = hexes.map(rgb);
  const worstOf = (ink: RGB, toward: RGB, k: number) => Math.min(...cols.map((c) => contrast(ink, mix(c, toward, k))));
  const cands = [
    { ink: IVORY, toward: [0, 0, 0] as RGB, dark: true },
    { ink: ESPRESSO, toward: [255, 255, 255] as RGB, dark: false },
  ];
  let best = { ...cands[0], scrim: 0, worst: 0 };
  for (const c of cands) {
    let k = 0;
    while (k < 0.6 && worstOf(rgb(c.ink), c.toward, k) < TARGET) k += 0.02;
    const w = worstOf(rgb(c.ink), c.toward, k);
    // 막이 덜 필요한 쪽, 같으면 대비가 큰 쪽
    if (best.worst === 0 || k < best.scrim - 1e-9 || (Math.abs(k - best.scrim) < 1e-9 && w > best.worst)) {
      best = { ...c, scrim: Math.round(k * 100) / 100, worst: Math.round(w * 100) / 100 };
    }
  }
  const back = toHex(mix(cols[0] ?? rgb("#222222"), best.toward, Math.min(0.75, best.scrim + 0.35)));
  return { ink: best.ink, dark: best.dark, scrim: best.scrim, worst: best.worst, back };
}

/** 응시 id → 고정된 난수열(mulberry32). 같은 카드면 언제 어디서 그려도 같은 값이 나온다 */
function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 닫힌 덩어리 — 둘레 점을 무작위 반지름으로 흔들고 부드럽게 잇는다(Catmull-Rom → 3차 베지어) */
function blobPath(r: () => number, cx: number, cy: number, rad: number, wobble: number) {
  const n = 6 + Math.floor(r() * 3);
  const pts = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + r() * 0.5;
    const rr = rad * (1 - wobble + r() * wobble * 2);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let k = 0; k < n; k++) {
    const p0 = pts[(k - 1 + n) % n];
    const p1 = pts[k];
    const p2 = pts[(k + 1) % n];
    const p3 = pts[(k + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

/**
 * 메시 — 레퍼런스(테이스팅 노트 포스터)처럼 여러 색 **덩어리**가 겹쳐 섞인다. SVG 한 장을 카드 바탕에 깐다.
 *
 * **섞임 포인트는 카드마다 다르고, 한 번 정해지면 그대로다.** 응시 id 로 만든 난수열이 덩어리의 자리 · 크기 ·
 * 모양 · 흐림 · 겹침 순서 · 바탕 결의 각도를 정한다 → 같은 유형도 카드마다 다르고, 어디서 그려도 같다.
 *
 * 경계 흐림(사용자 2026-11-18 — 전엔 10점 만점에 10, 레퍼런스는 3쯤):
 *   - 덩어리 대부분은 흐림 1.4~2.6(카드 너비 63 기준) — 경계가 보이되 부드럽게
 *   - 하나는 아주 넓게 번지는 바탕 덩어리(6), 한두 개는 작고 또렷한 「툭 나타난」 점(0.7~1.1)
 *   - 하나는 모서리 · 가장자리에 걸쳐 들어오는 큰 색면 — 경계가 또렷한 매끈한 곡선(0.3)
 *   - 고운 입자를 얹어 종이 결처럼(밝은 톤은 어두운 점 · 진한 톤은 밝은 점)
 * 진한 축은 덩어리 둘, 은은한 축은 하나. 밝은 톤의 또렷한 점은 같은 색을 흰색 쪽으로 조금 —
 * 글자 대비는 더 좋아진다(에스프레소 글자). 진한 톤은 검정 쪽으로.
 */
export function meshCss(picks: AxisPick[], seed: string) {
  const r = rng(seed + ":mesh");
  const between = (a: number, b: number) => a + (b - a) * r();
  const W = 63;
  const H = 100;
  const light = TONE === "light";
  const colors = picks.map((p) => p.color.hex);
  if (!colors.length) return { image: "none", base: "#2a2420" };

  type Shape = { d: string; fill: string; blur: number; op: number };
  const shapes: Shape[] = [];
  // 넓게 번지는 바탕 덩어리 하나
  shapes.push({
    d: blobPath(r, between(10, 53), between(15, 85), between(34, 44), 0.25),
    fill: colors[Math.floor(r() * colors.length)],
    blur: 6,
    op: 0.9,
  });
  for (const p of picks) {
    const n = p.strong ? 2 : 1;
    for (let k = 0; k < n; k++) {
      shapes.push({
        d: blobPath(r, between(-6, W + 6), between(-6, H + 6), between(13, 26), 0.32),
        fill: p.color.hex,
        blur: between(1.4, 2.6),
        op: between(0.82, 1),
      });
    }
  }
  // 작고 또렷한 점 — 「툭 나타난 변수」 같은 자리
  const accents = 1 + Math.floor(r() * 2);
  for (let k = 0; k < accents; k++) {
    const c = rgb(colors[Math.floor(r() * colors.length)]);
    shapes.push({
      d: blobPath(r, between(6, W - 6), between(30, H - 8), between(5, 9), 0.22),
      fill: toHex(mix(c, light ? [255, 255, 255] : [0, 0, 0], light ? 0.28 : 0.2)),
      blur: between(0.7, 1.1),
      op: 0.95,
    });
  }
  // 겹침 순서 — 바탕 덩어리는 늘 맨 아래
  const rest = shapes.slice(1);
  for (let i = rest.length - 1; i > 0; i--) {
    const k = Math.floor(r() * (i + 1));
    [rest[i], rest[k]] = [rest[k], rest[i]];
  }
  const ordered = [shapes[0], ...rest];
  // 또렷한 곡선 경계(레퍼런스 왼쪽 위 모서리) — 큰 덩어리를 카드 바깥 모서리 · 가장자리에 두어
  // 일부만 걸쳐 들어오게 한다. 흔들림을 작게(매끈한 호), 흐림은 거의 없게. 맨 위에 얹는다
  {
    const spots: [number, number][] = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0], [1, 0],
      [-1, 1], [0, 1], [1, 1],
    ];
    const [sx, sy] = spots[Math.floor(r() * spots.length)];
    const rad = between(22, 32);
    const cx = sx < 0 ? -rad * between(0.2, 0.45) : sx > 0 ? W + rad * between(0.2, 0.45) : between(10, W - 10);
    const cy = sy < 0 ? -rad * between(0.2, 0.45) : sy > 0 ? H + rad * between(0.2, 0.45) : between(20, H - 20);
    // 바탕 덩어리와 다른 색 — 같은 색끼리 붙으면 경계가 보이지 않는다
    const others = colors.filter((c) => c !== shapes[0].fill);
    const pool = others.length ? others : colors;
    ordered.push({ d: blobPath(r, cx, cy, rad, 0.06), fill: pool[Math.floor(r() * pool.length)], blur: 0.3, op: 1 });
  }
  if (light) {
    ordered.splice(1, 0, { d: blobPath(r, between(8, 55), between(8, 92), between(10, 16), 0.3), fill: "#ffffff", blur: 4, op: 0.5 });
  }

  // 바탕 결 — 4색을 무작위 각도 · 순서로(빈 곳 없이 여러 색이 비친다)
  const order = [...colors];
  for (let i = order.length - 1; i > 0; i--) {
    const k = Math.floor(r() * (i + 1));
    [order[i], order[k]] = [order[k], order[i]];
  }
  const ang = between(0, Math.PI);
  const gx = (0.5 + Math.cos(ang) * 0.5).toFixed(2);
  const gy = (0.5 + Math.sin(ang) * 0.5).toFixed(2);
  const gx2 = (0.5 - Math.cos(ang) * 0.5).toFixed(2);
  const gy2 = (0.5 - Math.sin(ang) * 0.5).toFixed(2);

  const blurs = [...new Set(ordered.map((s) => s.blur.toFixed(1)))];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>` +
    `<defs><linearGradient id='g' x1='${gx2}' y1='${gy2}' x2='${gx}' y2='${gy}'>` +
    order.map((c, i) => `<stop offset='${(i / Math.max(1, order.length - 1)).toFixed(2)}' stop-color='${c}'/>`).join("") +
    `</linearGradient>` +
    blurs.map((b) => `<filter id='b${b.replace(".", "_")}' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='${b}'/></filter>`).join("") +
    `<filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='2.4' numOctaves='2' seed='${Math.floor(r() * 999)}'/>` +
    `<feColorMatrix values='0 0 0 0 ${light ? 0.1 : 1} 0 0 0 0 ${light ? 0.08 : 1} 0 0 0 0 ${light ? 0.06 : 1} 0 0 0 ${light ? 0.16 : 0.1} 0'/></filter></defs>` +
    `<rect width='${W}' height='${H}' fill='url(#g)'/>` +
    ordered
      .map((s) => `<path d='${s.d}' fill='${s.fill}' fill-opacity='${s.op.toFixed(2)}' filter='url(#b${s.blur.toFixed(1).replace(".", "_")})'/>`)
      .join("") +
    `<rect width='${W}' height='${H}' filter='url(#n)'/>` +
    `</svg>`;
  const base = toHex(picks.map((p) => rgb(p.color.hex)).reduce((a, c) => mix(a, c, 0.5)));
  return { image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, base };
}
