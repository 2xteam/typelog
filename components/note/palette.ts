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
 * 1차는 진한 톤만(사용자 — 밝은 톤은 나중에 따로 본다). 글자색은 아래 `cardTheme` 이
 * 대비를 계산해 정한다 — 색을 바꿔도 손으로 확인할 필요가 없게.
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
export const POLES: Pole[] = [
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

/** 메시 그라디언트 — 4색의 자리 · 크기를 응시 id 로 고정한다(공유 · admin 에서도 같은 모양) */
export function meshCss(picks: AxisPick[], seed: string) {
  const h = hash(seed + ":mesh");
  const spots = [
    [18, 14],
    [86, 22],
    [24, 82],
    [80, 88],
  ];
  const layers = picks.map((p, i) => {
    const jx = ((h >>> (i * 4)) & 15) - 7;
    const jy = ((h >>> (i * 4 + 2)) & 15) - 7;
    const [x, y] = spots[(i + (h & 3)) % 4];
    const size = p.strong ? 78 : 58;
    return `radial-gradient(${size}% ${size * 0.8}% at ${x + jx}% ${y + jy}%, ${p.color.hex} 0%, ${p.color.hex}cc 38%, transparent 72%)`;
  });
  const base = picks.length
    ? toHex(picks.map((p) => rgb(p.color.hex)).reduce((a, c) => mix(a, c, 0.5)))
    : "#2a2420";
  return { image: layers.join(", "), base };
}
