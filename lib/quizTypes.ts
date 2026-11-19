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
  /** 기록 시간(초). 거리 choice 와 짝을 지어 페이스와 서로 환산한다 — 러닝 기록 */
  "duration",
  /** 숫자 몇 개(키·몸무게 등). `transient` 면 서버에 저장하지 않는다 */
  "measure",
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
  /** 선택지가 뜻하는 숫자 — 거리 choice 의 km 처럼. 점수에는 쓰지 않는다 */
  value?: number | null;
};

/** measure 문항의 칸 하나 */
export type MeasureField = {
  key: string;
  label: string;
  unit?: string | null;
  min: number;
  max: number;
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
  /**
   * 조건부 노출 — 자기 앞에 오는 문항만 가리킬 수 있다.
   * `resultIn` 은 **지금까지의 답으로 미리 낸 결과**가 이 중 하나일 때만 보인다
   * (러닝 기록 — 신문이 나온 사람에게만 대회 이름을 묻는다)
   */
  enableWhen?: { linkId?: string; eq?: unknown; ne?: unknown; resultIn?: string[] } | null;
  /** duration — 짝이 되는 거리 choice 의 linkId (선택지 value 가 km) */
  distanceFrom?: string | null;
  /** measure */
  fields?: MeasureField[] | null;
  /** measure — 서버에 저장하지 않고 채점에만 쓴다 (키·몸무게) */
  transient?: boolean;
  /** 완료 뒤에도 고칠 수 있다 (러닝 기록의 대회 이름). 점수에 쓰지 않는 문항만 */
  editableAfterFinish?: boolean;
  /** 응시 중에는 묻지 않고 결과 화면에서만 넣는다 (러닝 기록의 러너 이름) */
  afterFinishOnly?: boolean;
  /** string — 최대 글자 수 */
  maxLength?: number | null;
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
  /** 기록(초)을 (성별, 거리) 경계표에 대어 코드를 정한다 — 러닝 기록 */
  "threshold",
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
  /** threshold */
  cutoffs?: Cutoffs | null;
};

/**
 * threshold 전략의 설정 — 전부 데이터다. 경계표 키는 `"{성별 oid}:{거리 oid}"`.
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md
 */
export type Cutoffs = {
  /** 기준표 버전 — 결과에 함께 남겨, 기준이 바뀌어도 지난 등급을 설명할 수 있게 */
  version: string;
  /** 답을 읽을 문항 */
  gender: string;
  distance: string;
  time: string;
  /** 키마다 위에서부터 `time ≤ upTo` 인 첫 코드. 마지막은 upTo 없는 열린 구간 */
  tables: Record<string, { upTo?: number; code: string }[]>;
  /** 이보다 빠르면 받지 않는다 (세계기록) */
  floor?: Record<string, number> | null;
  /** 「상위 N%」 — 보여주기만 한다. [초, 백분율] 점들을 직선으로 잇는다 */
  percentile?: {
    label: string;
    tables: Record<string, [number, number][]>;
    /** 표가 없는 거리는 다른 거리로 환산해서 찾는다 (5km → 10km) */
    via?: Record<string, { key: string; factor: number; label: string }> | null;
  } | null;
  /** 체급 보정 — 등급은 바꾸지 않고 + − 만 붙인다 */
  adjust?: {
    measure: string;
    base: Record<string, number>;
    k: number;
    cap: number;
    signAt: number;
    codes: string[];
  } | null;
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
  /**
   * 화면 아래에 작게 붙는 한 줄. 실제로 있는 브랜드·나라 이름을 결과로 쓰는
   * 질문지에 필요하다 — 그 브랜드가 만들었거나 관련된 것처럼 읽히면 안 된다.
   */
  disclaimer?: string | null;
  /**
   * 일반 질문지와 다른 화면을 쓰는 질문지. 지금은 `"running"` 하나 —
   * 큰 선택 화면 · 사진 단계 · 생성 연출 · 딱지/신문/자격증 결과
   */
  experience?: "running" | "note" | null;
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
      /** 공개 뒤에도 고칠 수 있는 질문지 글자 — 채점과 무관하다 */
      quizMeta?: {
        title?: string;
        tagline?: string;
        disclaimer?: string | null;
        /** 화면 방식 — 채점과 무관해서 공개 뒤에도 바꾼다. 답 · 결과 코드는 그대로다 */
        experience?: "running" | "note" | null;
        /** 목록 노출 순서 — 작을수록 위. 채점과 무관 */
        order?: number;
        /** 추천 연령 — 채점과 무관(2026-11-19) */
        ageRange?: { min: number; max?: number | null };
      } | null;
      resultTypes?: ResultTypeInput[];
    };
