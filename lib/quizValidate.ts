import {
  ITEM_TYPES,
  OUTCOME_KINDS,
  RESOLVER_STRATEGIES,
  type Item,
  type Outcome,
  type QuizImport,
  type Resolver,
  type ResultTypeInput,
} from "@/lib/quizTypes";
import { flattenItems, randomAnswers, score, seeded } from "@/lib/scoring";

/**
 * 등록 JSON 을 기계가 검사한다.
 *
 * **관리자는 문항을 하나하나 확인하지 않는다.** 그래서 사람이 아니라 여기가 본다.
 * FitLog 가 인바디 합계 규칙으로 Vision 의 숫자 오인식을 잡는 것과 같은 장치다.
 *
 * 규격과 검사 목록은 볼트에 있다
 * → my-obsidian-vault / 30-Patterns/설문지 JSON 작성 지침.md
 */

export type Finding = { path: string; message: string };
export type Report = {
  errors: Finding[];
  warnings: Finding[];
  /** 무작위 응답으로 돌려 본 결과 코드 분포 */
  distribution?: { code: string; count: number; pct: number }[];
  /** 1등과 2등의 평균 격차 — 작으면 tiebreak 가 결과를 지배한다 */
  meanConfidence?: number | null;
  /**
   * 1등과 2등이 **정확히 동점**이던 비율(%).
   *
   * `meanConfidence` 로는 못 잡는다 — `nearest` 의 점수는 거리라서 눈금이 크고,
   * 축 하나가 정확히 중간값이면 그 축은 판별력이 0인데도 평균 격차는 커 보인다.
   * 동점이면 `tiebreak`(없으면 **배열 순서**)가 결과를 정한다.
   */
  tieRate?: number | null;
  summary?: { itemCount: number; scoringItems: number; estimatedMinutes: number };
};

const MONTE_CARLO_RUNS = 2000;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

/** 오프셋이 붙은 ISO 시각만 받는다 — 없으면 서버(UTC)와 KST 가 9시간 어긋난다 */
function hasOffset(s: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(s.trim());
}

export function validateImport(payload: unknown): Report {
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });
  const warn = (path: string, message: string) => warnings.push({ path, message });

  if (!isPlainObject(payload)) {
    return { errors: [{ path: "$", message: "JSON 객체가 아니에요." }], warnings };
  }
  const mode = payload.mode;
  if (mode !== "upsert" && mode !== "content") {
    return {
      errors: [{ path: "mode", message: '"upsert" 또는 "content" 여야 해요.' }],
      warnings,
    };
  }

  // ── content 모드: 결과 문장만 ──
  if (mode === "content") {
    if (typeof payload.quizSlug !== "string" || !payload.quizSlug.trim()) {
      err("quizSlug", "어느 질문지인지 slug 가 필요해요.");
    }
    validateResultTypes(payload.resultTypes, null, err, warn);
    return { errors, warnings };
  }

  // ── upsert 모드: 다섯 덩어리 전부 ──
  const quiz = payload.quiz;
  const outcomes = payload.outcomes;
  const items = payload.items;
  const resolver = payload.resolver;
  const resultTypes = payload.resultTypes;

  if (!isPlainObject(quiz)) err("quiz", "질문지 메타가 없어요.");
  if (!Array.isArray(outcomes) || outcomes.length === 0) err("outcomes", "결과 변수 선언이 없어요.");
  if (!Array.isArray(items) || items.length === 0) err("items", "문항이 없어요.");
  if (!isPlainObject(resolver)) err("resolver", "결과를 정하는 방법이 없어요.");
  if (!Array.isArray(resultTypes) || resultTypes.length === 0)
    err("resultTypes", "결과 타입이 없어요.");
  if (errors.length) return { errors, warnings };

  const meta = quiz as Record<string, unknown>;
  const outs = outcomes as Outcome[];
  const flat = flattenItems(items as Item[]);
  const res = resolver as Resolver;
  const types = resultTypes as ResultTypeInput[];

  // ── 메타 ──
  for (const key of ["slug", "title", "tagline"] as const) {
    if (typeof meta[key] !== "string" || !(meta[key] as string).trim()) {
      err(`quiz.${key}`, "빠졌어요.");
    }
  }
  if (typeof meta.slug === "string" && !/^[a-z0-9-]+$/.test(meta.slug)) {
    err("quiz.slug", "소문자 영문·숫자·하이픈만 쓸 수 있어요.");
  }
  if (isPlainObject(meta.cover) && !meta.cover.emoji) {
    err("quiz.cover.emoji", "이미지가 없어도 화면이 완성되도록 이모지가 필요해요.");
  }
  if (typeof meta.title === "string" && meta.title.length > 20) {
    warn("quiz.title", `20자를 넘어요 (${meta.title.length}자).`);
  }
  if (typeof meta.tagline === "string" && meta.tagline.length > 40) {
    warn("quiz.tagline", `40자를 넘어요 (${meta.tagline.length}자).`);
  }

  // ── 일정 ──
  if (isPlainObject(meta.schedule)) {
    const sc = meta.schedule;
    for (const key of ["startAt", "endAt"] as const) {
      const v = sc[key];
      if (v === null || v === undefined) continue;
      if (typeof v !== "string" || Number.isNaN(Date.parse(v))) {
        err(`quiz.schedule.${key}`, "읽을 수 없는 시각이에요.");
      } else if (!hasOffset(v)) {
        err(
          `quiz.schedule.${key}`,
          "시간대 오프셋이 없어요. 한국 시간은 +09:00 을 붙여요 — 없으면 9시간 어긋나요.",
        );
      }
    }
    const s = typeof sc.startAt === "string" ? Date.parse(sc.startAt) : null;
    const e = typeof sc.endAt === "string" ? Date.parse(sc.endAt) : null;
    if (s && e && e <= s) err("quiz.schedule.endAt", "시작보다 이르거나 같아요.");
    if (s && s < Date.now()) warn("quiz.schedule.startAt", "이미 지난 시각이에요.");
    if (typeof sc.openingNoticeText === "string" && sc.openingNoticeText.length > 40) {
      warn("quiz.schedule.openingNoticeText", "40자를 넘어요.");
    }
  }

  // ── outcomes ──
  const outIds = new Set<string>();
  for (const [i, o] of outs.entries()) {
    if (!o?.id) err(`outcomes[${i}].id`, "빠졌어요.");
    else if (outIds.has(o.id)) err(`outcomes[${i}].id`, `"${o.id}" 가 중복이에요.`);
    else outIds.add(o.id);
    if (!OUTCOME_KINDS.includes(o?.kind)) {
      err(`outcomes[${i}].kind`, `${OUTCOME_KINDS.join(" · ")} 중 하나여야 해요.`);
    }
    if (o?.kind === "axis" && (!o.left?.code || !o.right?.code)) {
      err(`outcomes[${i}]`, "축에는 left.code 와 right.code 가 필요해요.");
    }
  }
  if (outs.filter((o) => o.kind === "sum").length > 1) {
    err("outcomes", "sum 은 한 설문지에 하나만 둘 수 있어요.");
  }

  // ── 문항 ──
  const linkIds = new Set<string>();
  const seenOrder: string[] = [];
  let scoringItems = 0;
  for (const [i, it] of flat.entries()) {
    const at = `items[${i}]`;
    if (!it?.linkId) err(`${at}.linkId`, "빠졌어요.");
    else if (linkIds.has(it.linkId)) err(`${at}.linkId`, `"${it.linkId}" 가 중복이에요.`);
    else linkIds.add(it.linkId);
    if (it?.linkId && /^q\d+$/.test(it.linkId)) {
      warn(`${at}.linkId`, "순번은 쓰지 않아요. 순서를 바꾸면 의미가 깨져요.");
    }
    if (!ITEM_TYPES.includes(it?.type)) {
      err(`${at}.type`, `${ITEM_TYPES.join(" · ")} 중 하나여야 해요.`);
      continue;
    }
    if (it.type !== "display" && !it.text) err(`${at}.text`, "질문 문장이 빠졌어요.");
    if (typeof it.text === "string" && it.text.length > 60) {
      warn(`${at}.text`, `60자를 넘어요 (${it.text.length}자).`);
    }

    if (it.type === "choice") {
      const opts = it.options ?? [];
      if (opts.length < 2) err(`${at}.options`, "선택지가 두 개 이상이어야 해요.");
      const oids = new Set<string>();
      for (const [j, o] of opts.entries()) {
        if (!o?.oid) err(`${at}.options[${j}].oid`, "빠졌어요.");
        else if (oids.has(o.oid)) err(`${at}.options[${j}].oid`, "중복이에요.");
        else oids.add(o.oid);
        if (!o?.text) err(`${at}.options[${j}].text`, "빠졌어요.");
        checkWeights(o?.weights, `${at}.options[${j}].weights`, outIds, outs, err);
      }
      if (opts.some((o) => Object.keys(o.weights ?? {}).length)) scoringItems += 1;
    } else if (it.type === "boolean") {
      checkWeights(it.weightsTrue, `${at}.weightsTrue`, outIds, outs, err);
      checkWeights(it.weightsFalse, `${at}.weightsFalse`, outIds, outs, err);
      scoringItems += 1;
    } else if (it.type === "integer") {
      if (!it.scale || typeof it.scale.min !== "number" || typeof it.scale.max !== "number") {
        err(`${at}.scale`, "min·max 가 필요해요.");
      } else if (it.scale.max <= it.scale.min) {
        err(`${at}.scale`, "max 가 min 보다 커야 해요.");
      }
      checkWeights(it.coefficient, `${at}.coefficient`, outIds, outs, err, true);
      scoringItems += 1;
    } else if (it.type === "ranking") {
      if (!it.rankCoefficients?.length) err(`${at}.rankCoefficients`, "빠졌어요.");
      scoringItems += 1;
    }

    if (it.enableWhen) {
      const target = it.enableWhen.linkId;
      if (!target) err(`${at}.enableWhen.linkId`, "빠졌어요.");
      else if (!seenOrder.includes(target)) {
        err(
          `${at}.enableWhen.linkId`,
          `"${target}" 는 이 문항보다 뒤에 있거나 없어요. 앞의 문항만 가리킬 수 있어요.`,
        );
      }
    }
    if (it.linkId) seenOrder.push(it.linkId);
  }

  if (flat.filter((i) => i.type !== "display").length < 6) {
    warn("items", "문항이 6개 미만이면 결과가 우연에 좌우돼요.");
  }
  if (flat.length > 40) warn("items", "40개를 넘으면 아이가 끝까지 못 해요.");

  // 이모지 중복
  const emojis = new Map<string, number>();
  const countEmoji = (e?: string | null) => {
    if (!e) return;
    emojis.set(e, (emojis.get(e) ?? 0) + 1);
  };
  for (const it of flat) {
    countEmoji(it.emoji);
    for (const o of it.options ?? []) countEmoji(o.emoji);
  }
  for (const t of types) countEmoji(t.emoji);
  for (const [e, n] of emojis) {
    if (n > 1) warn("emoji", `${e} 가 ${n}번 쓰였어요. 서로 다르게 두면 구분이 쉬워요.`);
  }

  // 자유 입력이 결과 문장에서 쓰이는지
  const templated = JSON.stringify(types);
  for (const it of flat) {
    if (it.type !== "string" && it.type !== "date") continue;
    if (!templated.includes(`{{answer.${it.linkId}}}`)) {
      warn(`items(${it.linkId})`, "자유 입력인데 결과 문장에서 한 번도 쓰이지 않아요.");
    }
  }

  // ── resolver ──
  if (!RESOLVER_STRATEGIES.includes(res.strategy)) {
    err("resolver.strategy", `${RESOLVER_STRATEGIES.join(" · ")} 중 하나여야 해요.`);
  }
  const typeCodes = new Set(types.map((t) => t.code));

  if (res.strategy === "argmax") {
    const tally = outs.filter((o) => o.kind === "tally");
    if (!tally.length) err("resolver", "argmax 인데 tally outcome 이 없어요.");
    for (const o of tally) {
      if (!typeCodes.has(o.id)) err("resultTypes", `"${o.id}" 에 대응하는 결과 타입이 없어요.`);
    }
    requireTiebreak(res, tally.map((o) => o.id), err);
  }

  if (res.strategy === "letters") {
    const order = res.order ?? outs.filter((o) => o.kind === "axis").map((o) => o.id);
    if (!order.length) err("resolver.order", "축 순서가 필요해요.");
    const axes = order.map((id) => outs.find((o) => o.id === id));
    if (axes.some((a) => !a || a.kind !== "axis")) {
      err("resolver.order", "축(axis) 이 아닌 id 가 있어요.");
    } else {
      /** 축 4개면 16종이 다 필요하다 — 빠진 조합은 결과가 없는 응답이 된다 */
      const combos = axes.reduce<string[]>(
        (acc, a) => acc.flatMap((p) => [p + a!.left!.code, p + a!.right!.code]),
        [""],
      );
      const missing = combos.filter((c) => !typeCodes.has(c));
      if (missing.length) {
        err(
          "resultTypes",
          `가능한 조합 ${combos.length}종 중 ${missing.length}개가 없어요: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`,
        );
      }
      for (const id of order) {
        const gives = flat.some((it) =>
          [
            ...(it.options ?? []).map((o) => o.weights),
            it.weightsTrue,
            it.weightsFalse,
            it.coefficient,
          ].some((w) => w && id in w),
        );
        if (!gives) err("items", `축 "${id}" 에 점수를 주는 문항이 없어요.`);
      }
    }
  }

  if (res.strategy === "nearest") {
    const dims = outs.filter((o) => o.kind === "dim").map((o) => o.id);
    if (!dims.length) err("outcomes", "nearest 인데 dim outcome 이 없어요.");
    for (const [i, t] of types.entries()) {
      if (!t.vector) err(`resultTypes[${i}].vector`, "nearest 에서는 벡터가 필요해요.");
      else {
        const missing = dims.filter((d) => !(d in t.vector!));
        if (missing.length) {
          err(`resultTypes[${i}].vector`, `차원이 빠졌어요: ${missing.join(", ")}`);
        }
      }
    }
  }

  if (res.strategy === "band") {
    const on = res.on ?? outs.find((o) => o.kind === "sum")?.id;
    if (!on || !outIds.has(on)) err("resolver.on", "어느 outcome 의 구간인지 알 수 없어요.");
    const bands = res.bands ?? [];
    if (!bands.length) err("resolver.bands", "구간이 없어요.");
    let prev = -Infinity;
    let sawOpen = false;
    for (const [i, b] of bands.entries()) {
      if (!typeCodes.has(b.code)) err(`resolver.bands[${i}].code`, "없는 결과 타입이에요.");
      if (b.lt === undefined) {
        sawOpen = true;
        if (i !== bands.length - 1) err(`resolver.bands[${i}]`, "열린 구간은 맨 끝에 둬요.");
      } else {
        if (b.lt <= prev) err(`resolver.bands[${i}].lt`, "앞 구간과 겹치거나 순서가 뒤집혔어요.");
        prev = b.lt;
      }
    }
    if (!sawOpen) err("resolver.bands", "마지막 구간이 열려 있지 않아 빈틈이 남아요.");
  }

  if (res.strategy === "rules") {
    const rules = res.rules ?? [];
    if (!rules.length) err("resolver.rules", "규칙이 없어요.");
    for (const [i, rule] of rules.entries()) {
      if (!typeCodes.has(rule.code)) err(`resolver.rules[${i}].code`, "없는 결과 타입이에요.");
    }
    if (rules.length && rules[rules.length - 1].when !== true) {
      err("resolver.rules", '마지막 규칙은 "when": true 인 기본값이어야 해요.');
    }
  }

  validateResultTypes(types, res, err, warn);

  // ── 몬테카를로 분포 점검 ──
  let distribution: Report["distribution"];
  let meanConfidence: number | null = null;
  let tieRate: number | null = null;
  if (!errors.length) {
    const rnd = seeded(20260904);
    const counts = new Map<string, number>();
    let confSum = 0;
    let confN = 0;
    let ties = 0;
    for (let i = 0; i < MONTE_CARLO_RUNS; i += 1) {
      const answers = randomAnswers(items as Item[], rnd);
      const out = score({ outcomes: outs, items: items as Item[], resolver: res, resultTypes: types, answers });
      const code = out.code ?? "(결과 없음)";
      counts.set(code, (counts.get(code) ?? 0) + 1);
      if (out.confidence !== null) {
        confSum += out.confidence;
        confN += 1;
        if (out.confidence === 0) ties += 1;
      }
    }
    distribution = [...counts.entries()]
      .map(([code, count]) => ({ code, count, pct: Math.round((count / MONTE_CARLO_RUNS) * 1000) / 10 }))
      .sort((a, b) => b.count - a.count);
    meanConfidence = confN ? Math.round((confSum / confN) * 10) / 10 : null;

    tieRate = confN ? Math.round((ties / confN) * 1000) / 10 : null;

    /**
     * 치우침은 **타입 개수에 견주어** 본다.
     *
     * 절대값 40% 만 보면 8타입 질문지에서 22.6% 가 조용히 통과한다 — 고른
     * 분포라면 12.5% 여야 하니 1.8배인데도 걸리지 않았다. 타입이 16개면
     * 6.25% 가 기준이므로 같은 22.6% 는 3.6배로 훨씬 심각하다.
     * (2026-09-04 english-name 이 배열 순서로 결정되고 있던 것을 이 게이트가
     *  없어서 놓쳤다)
     */
    const even = types.length ? 100 / types.length : 0;
    for (const d of distribution) {
      if (d.code === "(결과 없음)") {
        err("resolver", `무작위 응답 ${d.pct}% 가 어떤 결과에도 걸리지 않아요.`);
      } else if (d.pct > 40) {
        warn("distribution", `"${d.code}" 가 ${d.pct}% 로 치우쳤어요.`);
      } else if (even && d.pct > even * 2.5) {
        warn(
          "distribution",
          `"${d.code}" 가 ${d.pct}% 예요 — 고르면 ${Math.round(even * 10) / 10}% 인데 2.5배가 넘어요.`,
        );
      }
    }
    for (const t of types) {
      const found = distribution.find((d) => d.code === t.code);
      if (!found) warn("distribution", `"${t.code}" 는 한 번도 나오지 않았어요 — 도달 불가일 수 있어요.`);
      else if (found.pct < 2) warn("distribution", `"${t.code}" 가 ${found.pct}% 로 거의 안 나와요.`);
      else if (even && found.pct < even * 0.4) {
        warn(
          "distribution",
          `"${t.code}" 가 ${found.pct}% 예요 — 고르면 ${Math.round(even * 10) / 10}% 인데 절반도 안 돼요.`,
        );
      }
    }
    if (meanConfidence !== null && meanConfidence < 3) {
      warn("distribution", `1등과 2등의 평균 격차가 ${meanConfidence} 로 작아요 — tiebreak 가 결과를 지배해요.`);
    }
    if (tieRate !== null && tieRate > 5) {
      warn(
        "distribution",
        `무작위 응답 ${tieRate}% 에서 1·2등이 정확히 동점이에요 — ${
          res.tiebreak?.length ? "tiebreak 순서" : "resultTypes 배열 순서"
        }가 결과를 정해요.`,
      );
    }
  }

  const itemCount = flat.filter((i) => i.type !== "display").length;
  return {
    errors,
    warnings,
    distribution,
    meanConfidence,
    tieRate,
    summary: {
      itemCount,
      scoringItems,
      estimatedMinutes: Math.max(1, Math.ceil((itemCount * 8) / 60)),
    },
  };
}

function requireTiebreak(res: Resolver, codes: string[], err: (p: string, m: string) => void) {
  const tb = res.tiebreak ?? [];
  if (!tb.length) {
    err("resolver.tiebreak", "동점 규칙이 없으면 결과가 무작위처럼 보여요.");
    return;
  }
  const missing = codes.filter((c) => !tb.includes(c));
  if (missing.length) err("resolver.tiebreak", `빠진 코드가 있어요: ${missing.join(", ")}`);
}

function checkWeights(
  w: Record<string, number> | null | undefined,
  path: string,
  outIds: Set<string>,
  outs: Outcome[],
  err: (p: string, m: string) => void,
  allowNegativeOnTally = false,
) {
  if (!w) return;
  for (const [id, v] of Object.entries(w)) {
    if (!outIds.has(id)) {
      err(path, `"${id}" 는 선언되지 않은 결과 변수예요.`);
      continue;
    }
    if (typeof v !== "number" || !Number.isFinite(v)) {
      err(path, `"${id}" 의 값이 숫자가 아니에요.`);
      continue;
    }
    const kind = outs.find((o) => o.id === id)?.kind;
    if (kind === "tally" && v < 0 && !allowNegativeOnTally) {
      err(path, `"${id}" 는 tally 라서 음수를 줄 수 없어요.`);
    }
  }
}

function validateResultTypes(
  raw: unknown,
  res: Resolver | null,
  err: (p: string, m: string) => void,
  warn: (p: string, m: string) => void,
) {
  if (!Array.isArray(raw) || !raw.length) {
    err("resultTypes", "결과 타입이 없어요.");
    return;
  }
  const codes = new Set<string>();
  for (const [i, t] of (raw as ResultTypeInput[]).entries()) {
    const at = `resultTypes[${i}]`;
    if (!t?.code) err(`${at}.code`, "빠졌어요.");
    else if (codes.has(t.code)) err(`${at}.code`, `"${t.code}" 가 중복이에요.`);
    else codes.add(t.code);
    if (!t?.name) err(`${at}.name`, "빠졌어요.");
    else if (t.name.length > 15) warn(`${at}.name`, `15자를 넘어요 (${t.name.length}자).`);
    if (!t?.emoji) err(`${at}.emoji`, "이미지가 없어도 화면이 완성되도록 이모지가 필요해요.");
    if (!t?.content?.summary) err(`${at}.content.summary`, "빠졌어요.");
    else if (t.content.summary.length > 120) {
      warn(`${at}.content.summary`, `120자를 넘어요 (${t.content.summary.length}자).`);
    }
    if (!t?.content?.strengths?.length) err(`${at}.content.strengths`, "두 개 이상 필요해요.");
    if (t?.imageUrl && !t.imageCredit) {
      warn(`${at}.imageCredit`, "이미지를 쓰는데 출처·라이선스가 없어요.");
    }
    if (t?.imageUrl && !/^https:\/\//.test(t.imageUrl)) {
      err(`${at}.imageUrl`, "https 로 시작해야 해요.");
    }
    /** 문장 톤 — 전부 해요체다. 반말·격식체를 섞지 않는다 */
    const text = [t?.content?.summary, ...(t?.content?.strengths ?? [])].join(" ");
    if (/(?:합니다|습니다)[.!?]?\s|(?:이다|한다)[.!?]?\s/.test(text + " ")) {
      warn(`${at}.content`, "해요체가 아닌 문장이 섞여 있어요.");
    }
  }
  void res;
}
