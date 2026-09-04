/**
 * 질문지 JSON 의 모양.
 *
 * 규격은 볼트에 있다 → my-obsidian-vault / 30-Patterns/설문지 JSON 작성 지침.md
 * 설계 배경(왜 outcome 을 선언으로 두는지, POMP 를 왜 쓰는지)은 10-Projects/TypeLog.md
 *
 * QTI 의 `outcomeDeclaration` 을 따라 **결과 변수를 문항과 분리해 선언**한다.
 * 축·태그·총점·벡터를 각각의 필드로 두지 않고 한 목록에 `kind` 만 다르게 담으므로,
 * 새 스코어링 방식이 생겨도 스키마를 고치지 않는다.
 */

export const OUTCOME_KINDS = ["axis", "tally", "sum", "dim"] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

export type Outcome = {
  id: string;
  kind: OutcomeKind;
  label?: string | null;
  /** kind: "axis" 일 때만. 음수가 left, 양수가 right */
  left?: { code: string; label?: string | null } | null;
  right?: { code: string; label?: string | null } | null;
};

export const ITEM_TYPES = [
  "choice",
  "boolean",
  "integer",
  "ranking",
  "string",
  "date",
  "display",
  "group",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** 어떤 outcome 에 몇 점 — 문항이 아는 것은 이것뿐이다 */
export type Weights = Record<string, number>;

export type Option = {
  oid: string;
  text: string;
  emoji?: string | null;
  imageUrl?: string | null;
  weights?: Weights | null;
};

export type Item = {
  /** 응답이 이 값으로 저장된다. 공개 시점부터 영구 식별자다 */
  linkId: string;
  type: ItemType;
  text?: string | null;
  emoji?: string | null;
  imageUrl?: string | null;
  required?: boolean;
  repeats?: boolean;
  reverse?: boolean;
  note?: string | null;
  /** choice */
  options?: Option[] | null;
  /** boolean */
  weightsTrue?: Weights | null;
  weightsFalse?: Weights | null;
  /** integer */
  scale?: { min: number; max: number; labels?: string[] | null } | null;
  coefficient?: Weights | null;
  /** ranking */
  rankCoefficients?: number[] | null;
  /** 조건부 노출 — 자기 앞에 오는 문항만 가리킬 수 있다 */
  enableWhen?: { linkId: string; eq?: unknown; ne?: unknown } | null;
  /** group */
  items?: Item[] | null;
};

export const RESOLVER_STRATEGIES = [
  "argmax",
  "letters",
  "nearest",
  "band",
  "matrix",
  "rules",
] as const;
export type ResolverStrategy = (typeof RESOLVER_STRATEGIES)[number];

/** rules 의 조건 — **문자열 수식이 아니라 구조**다. eval 하면 JSON 이 곧 코드가 된다 */
export type Condition =
  | true
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | {
      outcome?: string;
      answer?: string;
      eq?: unknown;
      ne?: unknown;
      gte?: number;
      lte?: number;
      in?: unknown[];
    };

export type Resolver = {
  strategy: ResolverStrategy;
  /** argmax · letters — 동점일 때의 우선순위. 필수다 */
  tiebreak?: string[] | null;
  /** letters — 축 id 를 이어 붙이는 순서 */
  order?: string[] | null;
  threshold?: number | null;
  /** nearest */
  metric?: "cosine" | "euclidean" | null;
  /** band */
  on?: string | null;
  bands?: { lt?: number; code: string }[] | null;
  /** matrix */
  rows?: { on: string; bands: { lt?: number; key: string }[] } | null;
  cols?: { on: string; bands: { lt?: number; key: string }[] } | null;
  cells?: Record<string, string> | null;
  /** rules — 위에서부터 처음 맞는 코드 */
  rules?: { when: Condition; code: string }[] | null;
};

export type Schedule = {
  startAt?: string | null;
  endAt?: string | null;
  openingNoticeText?: string | null;
};

export type QuizMeta = {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  ageRange: { min: number; max: number };
  cover: { emoji: string; imageUrl?: string | null };
  schedule?: Schedule | null;
  estimatedMinutes?: number | null;
  shuffle?: boolean;
  order?: number;
};

export type ResultTypeContent = {
  summary: string;
  strengths: string[];
  cautions?: string[] | null;
  tips?: string[] | null;
  goodWith?: string[] | null;
  funFact?: string | null;
};

export type ResultTypeInput = {
  code: string;
  name: string;
  subtitle?: string | null;
  emoji: string;
  imageUrl?: string | null;
  imageCredit?: string | null;
  color?: string | null;
  /** nearest 전략일 때 필수 */
  vector?: Weights | null;
  rarity?: string | null;
  content: ResultTypeContent;
};

/** 등록 payload. 모드는 둘뿐이다 */
export type QuizImport =
  | {
      $schema?: string;
      mode: "upsert";
      quiz: QuizMeta;
      outcomes: Outcome[];
      items: Item[];
      resolver: Resolver;
      resultTypes: ResultTypeInput[];
    }
  | {
      $schema?: string;
      mode: "content";
      quizSlug: string;
      resultTypes: ResultTypeInput[];
    };
