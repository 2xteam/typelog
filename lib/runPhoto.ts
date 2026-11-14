/**
 * 러닝 기록의 얼굴 사진 — **이 기기의 브라우저(IndexedDB)에만** 둔다. 서버로 보내지 않는다.
 *
 * 사진은 맞추기 화면에서 **정해진 틀(600×720)로 잘라** 저장한다. 얼굴 타원과 눈높이가
 * 늘 같은 자리에 오므로, 결과 화면(자격증 · 신문 · 딱지)은 좌표 하나로 얹으면 된다.
 *
 *   얼굴 타원  중심 (300, 330) · 가로 반지름 210 · 세로 반지름 270
 *   눈높이     y = 300
 *
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md 「사진 — 세 화면 모두」
 */

export const FACE_W = 600;
export const FACE_H = 720;
export const FACE_OVAL = { cx: 300, cy: 330, rx: 210, ry: 270 };
export const EYE_Y = 300;

/** 신문 사진은 올린 사진 원본(긴 변 1600)을 따로 저장해 칸에 꽉 맞춰 쓴다 → savePhoto 의 wide */

const DB = "typelog-run";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** 응시 1건의 사진. 같은 기기에서 다시 볼 때 보인다 */
export async function savePhoto(attemptId: string, blob: Blob, wide?: Blob | null) {
  try {
    await tx("readwrite", (s) => s.put(blob, attemptId));
    await tx("readwrite", (s) => s.put(blob, "latest"));
    if (wide) {
      await tx("readwrite", (s) => s.put(wide, `${attemptId}:wide`));
      await tx("readwrite", (s) => s.put(wide, "latest:wide"));
    }
  } catch {
    /* 저장소를 못 쓰는 브라우저(사생활 보호 창 등) — 이번 화면에서만 쓴다 */
  }
}

export async function loadPhoto(attemptId: string, kind: "face" | "wide" = "face"): Promise<Blob | null> {
  try {
    const key = kind === "wide" ? `${attemptId}:wide` : attemptId;
    return ((await tx("readonly", (s) => s.get(key))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function deletePhoto(attemptId: string) {
  try {
    await tx("readwrite", (s) => s.delete(attemptId));
  } catch {
    /* 없으면 그만 */
  }
}

/**
 * 고른 사진을 긴 변 1600px 로 줄여 읽는다 — 휴대폰 원본(4000px 넘는)을 그대로 쓰면
 * 맞추기 화면이 버벅인다. 사진 방향(EXIF)은 브라우저가 맞춰 준다.
 */
export async function readImage(file: File): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}
