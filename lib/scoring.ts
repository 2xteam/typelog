import type {
  Condition,
  Item,
  Outcome,
  Resolver,
  ResultTypeInput,
  Weights,
} from "@/lib/quizTypes";

/**
 * 채점 엔진.
 *
 * 1) 답을 모아 outcome 별 원점수와 **그 회차의 가능 범위**를 낸다
 * 2) POMP(0~100)로 정규화한다
 * 3) `resolver` 로 결과 코드를 정한다
 *
 * POMP 를 쓰는 이유는 화면이 아니라 **저작 편의**다. `resolver` 에 쓰는 숫자가
 * 문항 수와 무관해지므로, JSON 을 만드는 쪽이 임계값을 다시 계산하지 않는다.
 *
 * → my-obsidian-vault / 10-Projects/TypeLog.md
 */

export const ENGINE_VERSION = 1;

export type Answer = {
  linkId: string;
  oids?: string[];
  value?: unknown;
};

export type OutcomeScore = {
  id: string;
  raw: number;
  min: number;
  max: number;
  pomp: number;
};

export type ScoreResult = {
  code: string | null;
  ranked: { code: string; score: number }[];
  outcomes: OutcomeScore[];
  confidence: number | null;
};

/** 문항 트리를 평탄하게 — group 은 담기만 하고 점수를 내지 않는다 */
export function flattenItems(items: Item[]): Item[] {
  const out: Item[] = [];
  const walk = (list: Item[]) => {
    for (const it of list) {
      if (it.type === "group") {
        if (it.items) walk(it.items);
        continue;
      }
      out.push(it);
    }
  };
  walk(items ?? []);
  return out;
}

function addWeights(target: Map<string, number>, w: Weights | null | undefined, k = 1) {
  if (!w) return;
  for (const [id, v] of Object.entries(w)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    target.set(id, (target.get(id) ?? 0) + v * k);
  }
}

/**
 * 한 문항이 각 outcome 에 줄 수 있는 **최소·최대**.
 *
 * ⚠️ 이건 "가능한 값"이지 "받은 값"이 아니다. 어떤 축에 −2 ~ +2 를 주는 문항이
 * 6개면 그 축의 범위는 −12 ~ +12 다. **답하지 않은 문항은 범위에서도 빼야 한다** —
 * 안 빼면 미답이 곧 중간값으로 취급된다.
 */
function itemRange(item: Item): Map<string, { min: number; max: number }> {
  const range = new Map<string, { min: number; max: number }>();
  const note = (id: string, v: number) => {
    const cur = range.get(id) ?? { min: 0, max: 0 };
    range.set(id, { min: Math.min(cur.min, v), max: Math.max(cur.max, v) });
  };

  if (item.type === "choice") {
    const opts = item.options ?? [];
    if (item.repeats) {
      // 여러 개를 고를 수 있으면 양수는 다 더할 수 있고 음수도 다 더할 수 있다
      for (const o of opts) {
        for (const [id, v] of Object.entries(o.weights ?? {})) {
          const cur = range.get(id) ?? { min: 0, max: 0 };
          range.set(id, {
            min: cur.min + Math.min(0, v),
            max: cur.max + Math.max(0, v),
          });
        }
      }
    } else {
      const ids = new Set<string>();
      for (const o of opts) for (const id of Object.keys(o.weights ?? {})) ids.add(id);
      for (const id of ids) {
        // 하나만 고르므로 선택지들 중 최소/최대. 그 outcome 을 안 주는 선택지는 0 이다
        let lo = Infinity;
        let hi = -Infinity;
        for (const o of opts) {
          const v = o.weights?.[id] ?? 0;
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        range.set(id, { min: Math.min(0, lo), max: Math.max(0, hi) });
      }
    }
    return range;
  }

  if (item.type === "boolean") {
    const ids = new Set([
      ...Object.keys(item.weightsTrue ?? {}),
      ...Object.keys(item.weightsFalse ?? {}),
    ]);
    for (const id of ids) {
      const a = item.weightsTrue?.[id] ?? 0;
      const b = item.weightsFalse?.[id] ?? 0;
      range.set(id, { min: Math.min(a, b), max: Math.max(a, b) });
    }
    return range;
  }

  if (item.type === "integer" && item.scale && item.coefficient) {
    const { min, max } = item.scale;
    const mid = (min + max) / 2;
    for (const [id, c] of Object.entries(item.coefficient)) {
      const a = (min - mid) * c;
      const b = (max - mid) * c;
      note(id, Math.min(a, b));
      note(id, Math.max(a, b));
    }
    return range;
  }

  if (item.type === "ranking" && item.rankCoefficients && item.options) {
    // 순위별 계수를 선택지에 배정하는 문제 — 상한은 큰 계수를 큰 가중치에 붙였을 때
    const coeffs = item.rankCoefficients;
    for (const o of item.options) {
      for (const [id, v] of Object.entries(o.weights ?? {})) {
        for (const c of coeffs) note(id, v * c);
      }
    }
    return range;
  }

  // string · date · display 는 점수를 내지 않는다
  return range;
}

/** 답 하나가 실제로 준 점수 */
function itemContribution(item: Item, answer: Answer): Weights {
  const acc = new Map<string, number>();

  if (item.type === "choice") {
    const chosen = new Set(answer.oids ?? []);
    for (const o of item.options ?? []) {
      if (chosen.has(o.oid)) addWeights(acc, o.weights);
    }
  } else if (item.type === "boolean") {
    addWeights(acc, answer.value === true ? item.weightsTrue : item.weightsFalse);
  } else if (item.type === "integer" && item.scale && item.coefficient) {
    const v = Number(answer.value);
    if (Number.isFinite(v)) {
      const mid = (item.scale.min + item.scale.max) / 2;
      const delta = item.reverse ? mid - v : v - mid;
      addWeights(acc, item.coefficient, delta);
    }
  } else if (item.type === "ranking" && item.rankCoefficients) {
    const order = answer.oids ?? [];
    order.forEach((oid, i) => {
      const c = item.rankCoefficients?.[i];
      if (typeof c !== "number") return;
      const opt = item.options?.find((o) => o.oid === oid);
      addWeights(acc, opt?.weights, c);
    });
  }

  return Object.fromEntries(acc);
}

/** 조건은 구조로만 평가한다. 문자열 수식을 eval 하지 않는다 */
export function evalCondition(
  cond: Condition,
  ctx: { outcomes: Record<string, number>; answers: Record<string, unknown> },
): boolean {
  if (cond === true) return true;
  if (typeof cond !== "object" || cond === null) return false;
  if ("all" in cond) return cond.all.every((c) => evalCondition(c, ctx));
  if ("any" in cond) return cond.any.some((c) => evalCondition(c, ctx));
  if ("not" in cond) return !evalCondition(cond.not, ctx);

  const left =
    "outcome" in cond && cond.outcome
      ? ctx.outcomes[cond.outcome]
      : "answer" in cond && cond.answer
        ? ctx.answers[cond.answer]
        : undefined;
  if (left === undefined) return false;

  if ("eq" in cond) return left === cond.eq;
  if ("ne" in cond) return left !== cond.ne;
  if ("gte" in cond) return typeof left === "number" && left >= (cond.gte as number);
  if ("lte" in cond) return typeof left === "number" && left <= (cond.lte as number);
  if ("in" in cond) return Array.isArray(cond.in) && cond.in.includes(left);
  return false;
}

function bandCode(
  value: number,
  bands: { lt?: number; code: string }[] | null | undefined,
): string | null {
  for (const b of bands ?? []) {
    if (b.lt === undefined || value < b.lt) return b.code;
  }
  return null;
}

function cosine(a: Weights, b: Weights): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    const x = a[k] ?? 0;
    const y = b[k] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function euclidean(a: Weights, b: Weights): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let sum = 0;
  for (const k of keys) {
    const d = (a[k] ?? 0) - (b[k] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export type ScoreInput = {
  outcomes: Outcome[];
  items: Item[];
  resolver: Resolver;
  resultTypes: Pick<ResultTypeInput, "code" | "vector">[];
  answers: Answer[];
};

export function score(input: ScoreInput): ScoreResult {
  const flat = flattenItems(input.items);
  const byLink = new Map(flat.map((i) => [i.linkId, i]));
  const answered = new Map(input.answers.map((a) => [a.linkId, a]));

  const raw = new Map<string, number>();
  const bounds = new Map<string, { min: number; max: number }>();
  for (const o of input.outcomes) {
    raw.set(o.id, 0);
    bounds.set(o.id, { min: 0, max: 0 });
  }

  for (const [linkId, answer] of answered) {
    const item = byLink.get(linkId);
    if (!item) continue; // 은퇴한 문항의 답 — 점수에서 무시한다

    addWeights(raw, itemContribution(item, answer));

    // 범위는 **실제로 답한 문항만** 더한다
    for (const [id, r] of itemRange(item)) {
      const cur = bounds.get(id);
      if (!cur) continue;
      bounds.set(id, { min: cur.min + r.min, max: cur.max + r.max });
    }
  }

  const scores: OutcomeScore[] = input.outcomes.map((o) => {
    const r = raw.get(o.id) ?? 0;
    const b = bounds.get(o.id) ?? { min: 0, max: 0 };
    const span = b.max - b.min;
    const pomp = span > 0 ? ((r - b.min) / span) * 100 : 50;
    return { id: o.id, raw: r, min: b.min, max: b.max, pomp: Math.round(pomp * 10) / 10 };
  });

  const pompById: Record<string, number> = {};
  for (const s of scores) pompById[s.id] = s.pomp;

  const ranked = resolve(input, scores, pompById, answered);
  const code = ranked[0]?.code ?? null;
  const confidence =
    ranked.length >= 2 ? Math.round((ranked[0].score - ranked[1].score) * 10) / 10 : null;

  return { code, ranked, outcomes: scores, confidence };
}

function resolve(
  input: ScoreInput,
  scores: OutcomeScore[],
  pomp: Record<string, number>,
  answered: Map<string, Answer>,
): { code: string; score: number }[] {
  const r = input.resolver ?? { strategy: "argmax" };
  const tiebreak = r.tiebreak ?? [];
  /** 동점일 때 tiebreak 앞쪽이 이긴다. 규칙이 없으면 결과가 무작위처럼 보인다 */
  const rank = (code: string) => {
    const i = tiebreak.indexOf(code);
    return i === -1 ? tiebreak.length : i;
  };
  const sortPairs = (pairs: { code: string; score: number }[]) =>
    pairs.sort((a, b) => b.score - a.score || rank(a.code) - rank(b.code));

  if (r.strategy === "argmax") {
    const tally = input.outcomes.filter((o) => o.kind === "tally");
    return sortPairs(tally.map((o) => ({ code: o.id, score: pomp[o.id] ?? 0 })));
  }

  if (r.strategy === "letters") {
    const threshold = r.threshold ?? 50;
    const order = r.order ?? input.outcomes.filter((o) => o.kind === "axis").map((o) => o.id);
    let code = "";
    for (const id of order) {
      const axis = input.outcomes.find((o) => o.id === id);
      if (!axis?.left || !axis.right) return [];
      code += (pomp[id] ?? 50) < threshold ? axis.left.code : axis.right.code;
    }
    /** 축마다 임계값에서 얼마나 떨어졌는지의 평균 — 확신의 정도로 쓴다 */
    const margin =
      order.reduce((sum, id) => sum + Math.abs((pomp[id] ?? 50) - threshold), 0) /
      Math.max(order.length, 1);
    return [{ code, score: Math.round(margin * 10) / 10 }];
  }

  if (r.strategy === "nearest") {
    const dims = input.outcomes.filter((o) => o.kind === "dim").map((o) => o.id);
    const me: Weights = {};
    for (const id of dims) me[id] = pomp[id] ?? 50;
    const metric = r.metric ?? "cosine";
    const pairs = input.resultTypes
      .filter((t) => t.vector)
      .map((t) => {
        const v: Weights = {};
        for (const id of dims) v[id] = t.vector?.[id] ?? 0;
        const s = metric === "cosine" ? cosine(me, v) * 100 : -euclidean(me, v);
        return { code: t.code, score: Math.round(s * 10) / 10 };
      });
    return sortPairs(pairs);
  }

  if (r.strategy === "band") {
    const on = r.on ?? input.outcomes.find((o) => o.kind === "sum")?.id ?? "";
    const code = bandCode(pomp[on] ?? 0, r.bands);
    return code ? [{ code, score: pomp[on] ?? 0 }] : [];
  }

  if (r.strategy === "matrix") {
    const rowKey = r.rows ? bandCode2(pomp[r.rows.on] ?? 0, r.rows.bands) : null;
    const colKey = r.cols ? bandCode2(pomp[r.cols.on] ?? 0, r.cols.bands) : null;
    if (!rowKey || !colKey) return [];
    const code = r.cells?.[`${rowKey}:${colKey}`];
    return code ? [{ code, score: 100 }] : [];
  }

  // rules — 위에서부터 처음 맞는 것. 마지막은 항상 무조건 참인 기본값이다
  const answers: Record<string, unknown> = {};
  for (const [linkId, a] of answered) {
    answers[linkId] = a.oids?.length ? (a.oids.length === 1 ? a.oids[0] : a.oids) : a.value;
  }
  for (const rule of r.rules ?? []) {
    if (evalCondition(rule.when, { outcomes: pomp, answers })) {
      return [{ code: rule.code, score: 100 }];
    }
  }
  void scores;
  return [];
}

function bandCode2(
  value: number,
  bands: { lt?: number; key: string }[] | null | undefined,
): string | null {
  for (const b of bands ?? []) {
    if (b.lt === undefined || value < b.lt) return b.key;
  }
  return null;
}

/** 무작위 응답 하나를 만든다 — 몬테카를로 분포 점검에 쓴다 */
export function randomAnswers(items: Item[], rnd: () => number): Answer[] {
  const out: Answer[] = [];
  for (const item of flattenItems(items)) {
    if (item.type === "display" || item.type === "string" || item.type === "date") continue;
    if (item.type === "choice") {
      const opts = item.options ?? [];
      if (!opts.length) continue;
      if (item.repeats) {
        const picked = opts.filter(() => rnd() < 0.4);
        out.push({ linkId: item.linkId, oids: picked.length ? picked.map((o) => o.oid) : [opts[0].oid] });
      } else {
        out.push({ linkId: item.linkId, oids: [opts[Math.floor(rnd() * opts.length)].oid] });
      }
    } else if (item.type === "boolean") {
      out.push({ linkId: item.linkId, value: rnd() < 0.5 });
    } else if (item.type === "integer" && item.scale) {
      const { min, max } = item.scale;
      out.push({ linkId: item.linkId, value: min + Math.floor(rnd() * (max - min + 1)) });
    } else if (item.type === "ranking" && item.options) {
      const shuffled = [...item.options].sort(() => rnd() - 0.5);
      out.push({ linkId: item.linkId, oids: shuffled.map((o) => o.oid) });
    }
  }
  return out;
}

/** 재현 가능한 난수 (mulberry32) — 같은 seed 면 같은 분포가 나온다 */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
