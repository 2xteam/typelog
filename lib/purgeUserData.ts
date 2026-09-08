import { connectDB } from "@/lib/db";
import { getAttemptModel } from "@/models/Attempt";

/**
 * 이 앱(TypeLog)이 가진 한 사람의 데이터를 지운다.
 *
 * **회원 문서는 건드리지 않는다.** 포털이 원본을 갖는다.
 * 부르는 곳은 포털의 정리 작업 하나다 → myjane/app/api/cron/purge
 *
 * ⚠️ `Attempt.userId` 는 **문자열**이다 (`String(user._id)` — lib/auth.ts).
 * ObjectId 로 넘기면 하나도 안 지워진다.
 *
 * 질문지(`Quiz`)와 결과 유형(`ResultType`)은 서비스가 만든 내용이라 남긴다.
 *
 * ⚠️ 로그인하지 않고 남긴 응답은 `guestKey` 로만 묶여 있어 **여기서 지울 수 없다.**
 * 그 값은 회원과 연결되지 않는다(브라우저의 임의 UUID). 방침의 쿠키 안내에
 * 그렇게 적어 두었다.
 *
 * → my-obsidian-vault / 50-Plans/C 법적 페이지.md
 */
export type PurgeResult = Record<string, number>;

export async function purgeUserData(id: string): Promise<PurgeResult> {
  await connectDB();
  const attempts = await getAttemptModel().deleteMany({ userId: id }).exec();
  return { attempts: attempts.deletedCount ?? 0 };
}
