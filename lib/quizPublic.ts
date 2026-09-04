import type { Item } from "@/lib/quizTypes";

/**
 * 화면에 내려보내는 문항.
 *
 * ⚠️ **가중치(`weights` · `coefficient`)를 절대 내보내지 않는다.** 내보내면
 * 원하는 결과가 나오는 답을 브라우저에서 계산할 수 있다.
 *
 * 라우트 파일이 아니라 여기 두는 이유 — Next 의 route 파일은 핸들러와 정해진
 * 설정 값만 export 할 수 있다. 헬퍼를 export 하면 빌드가 타입 오류로 막힌다.
 */
export function publicItem(item: Item) {
  return {
    linkId: item.linkId,
    type: item.type,
    text: item.text ?? null,
    emoji: item.emoji ?? null,
    imageUrl: item.imageUrl ?? null,
    required: item.required ?? true,
    repeats: item.repeats ?? false,
    scale: item.scale ?? null,
    enableWhen: item.enableWhen ?? null,
    options: (item.options ?? []).map((o) => ({
      oid: o.oid,
      text: o.text,
      emoji: o.emoji ?? null,
      imageUrl: o.imageUrl ?? null,
    })),
  };
}
