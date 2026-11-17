"use client";

import { formatPrime } from "@/lib/record";
import { dateDot, distLabel, pacePrime, pctText, serial, type RunView } from "./view";

/**
 * 복약 지도 처방전 — 러닝자격증(1~5급, 신문에 오르지 못한 기록)의 맨 위 그림(사용자 2026-11-17).
 *
 * 레퍼런스: 약국 복약 안내문 + 약제비 영수증 한 장(약품 사진 · 약품명/성분 · 복약 안내 꼬리표 · 투약량/횟수/일수,
 * 오른쪽에 영수증 · 복용 시간 표). 가상의 「마이재인 러닝약국」 — 실제 약국 · 상표 · 금액을 쓰지 않는다.
 *
 * 약은 러닝 뒤 실제로 많이 쓰는 것들을 **성분명**으로만 — 파스(케토프로펜) · 바르는 겔(디클로페낙) ·
 * 뿌리는 쿨링 스프레이(멘톨 · 캄파) · 작약감초탕(쥐) · 아세트아미노펜 · 근이완제(에페리손, 전문의약품 — 처방 필요라고 적는다) ·
 * 수분 보충염 · 물집 밴드 · 바셀린 + 생활 지도(휴식 · 얼음찜질). 주의 꼬리표는 실제 주의사항에서 가져왔다
 * (케토프로펜 광과민 → 햇볕 주의, 스프레이 → 화기 주의, 감초 → 오래 먹지 않기, 아세트아미노펜 → 술 금지).
 * 급수가 낮을수록(오래 달릴수록) 처방이 늘고, 하프 · 풀은 물집 · 쓸림이 들어간다.
 * ⚠️ 재미로 만든 것 — 맨 아래에 「실제 처방이 아니에요 · 약은 약사 · 의사와 상의」 와 심장 신호 문구를 늘 둔다.
 * → my-obsidian-vault / 50-Plans/J 러닝 기록 급수.md 「처방전 · 현상수배」
 */

type Vis = "patch" | "tube" | "spray" | "sachet" | "pill" | "bandage" | "jar" | "roller";
type Tag = [string, "red" | "teal"];
type Rx = {
  key: string;
  name: string;
  cat: string;
  ing: string;
  tags: Tag[];
  text: string;
  dose: string;
  times: string;
  days: string;
  vis: Vis;
  color?: string;
  mark?: string;
};

const CATALOG: Record<string, Rx> = {
  keto: {
    key: "keto",
    name: "케토프로펜 파스",
    cat: "[근육통 소염진통 파스]",
    ing: "케토프로펜 30mg/매",
    tags: [["햇볕 주의", "red"], ["상처엔 금지", "red"], ["하루 1~2매", "teal"]],
    text: "아픈 종아리·허벅지에 붙여요. 뗀 뒤에도 2주 동안은 붙였던 자리를 햇볕에 내놓지 마세요.",
    dose: "1매",
    times: "2",
    days: "3",
    vis: "patch",
  },
  gel: {
    key: "gel",
    name: "디클로페낙 겔",
    cat: "[바르는 소염진통제]",
    ing: "디클로페낙디에틸암모늄 1.16%",
    tags: [["문질러 바르기", "teal"], ["바른 뒤 손 씻기", "teal"]],
    text: "아픈 곳에 얇게 펴 바르고 손을 씻어요. 눈 주위와 상처에는 바르지 않아요.",
    dose: "2cm",
    times: "3",
    days: "3",
    vis: "tube",
  },
  spray: {
    key: "spray",
    name: "쿨링 파스 스프레이",
    cat: "[뿌리는 파스]",
    ing: "l-멘톨 · dl-캄파 · 살리실산메틸",
    tags: [["화기 주의", "red"], ["15cm 떨어져서", "teal"]],
    text: "15cm 떨어져서 2~3초만 뿌려요. 한 곳에 오래 뿌리면 피부가 얼 수 있어요.",
    dose: "3초",
    times: "3",
    days: "2",
    vis: "spray",
  },
  jakyak: {
    key: "jakyak",
    name: "작약감초탕 과립",
    cat: "[다리 쥐(경련) · 한방]",
    ing: "작약 · 감초 엑스",
    tags: [["쥐날 때만", "teal"], ["오래 먹지 마세요", "red"]],
    text: "종아리에 쥐가 날 때 1포. 감초가 들어 있어 여러 날 이어서 먹지 않아요.",
    dose: "1포",
    times: "1",
    days: "1",
    vis: "sachet",
    color: "#c58b3a",
  },
  acet: {
    key: "acet",
    name: "아세트아미노펜정 500mg",
    cat: "[해열진통제]",
    ing: "아세트아미노펜 500mg",
    tags: [["술 마시지 마세요", "red"], ["하루 최대량 지키기", "red"]],
    text: "많이 아플 때만 4~6시간 간격으로 드세요. 술과 함께 먹지 않아요.",
    dose: "1",
    times: "2",
    days: "2",
    vis: "pill",
    color: "#f4f4f2",
    mark: "AP 500",
  },
  eperisone: {
    key: "eperisone",
    name: "에페리손염산염정 50mg",
    cat: "[근이완제 · 전문의약품]",
    ing: "에페리손염산염 50mg",
    tags: [["졸음 주의", "red"], ["의사 처방 필요", "red"]],
    text: "근육이 심하게 뭉쳐 풀리지 않으면 진료 뒤 처방받는 약이에요. 이 처방전으로는 받을 수 없어요 🙅",
    dose: "1",
    times: "3",
    days: "3",
    vis: "pill",
    color: "#f2c7d3",
    mark: "EP 50",
  },
  ors: {
    key: "ors",
    name: "경구 수분 보충염",
    cat: "[탈수 · 땀 보충]",
    ing: "포도당 · 염화나트륨 · 염화칼륨",
    tags: [["물에 녹여서", "teal"], ["천천히 마시기", "teal"]],
    text: "달리고 나서 물 200mL에 1포를 녹여 천천히 마셔요.",
    dose: "1포",
    times: "2",
    days: "1",
    vis: "sachet",
    color: "#6cb7d9",
  },
  blister: {
    key: "blister",
    name: "하이드로콜로이드 밴드",
    cat: "[물집 · 쓸림 보호]",
    ing: "하이드로콜로이드 패드",
    tags: [["터뜨리지 마세요", "red"], ["저절로 떨어질 때까지", "teal"]],
    text: "물집은 터뜨리지 말고 덮어 두세요. 밴드가 하얗게 부풀면 잘 붙어 있는 거예요.",
    dose: "1매",
    times: "1",
    days: "3",
    vis: "bandage",
  },
  vaseline: {
    key: "vaseline",
    name: "바셀린",
    cat: "[쓸림 방지]",
    ing: "백색 바셀린",
    tags: [["달리기 전에", "teal"]],
    text: "겨드랑이 · 허벅지 안쪽 · 발가락 사이에 달리기 전에 얇게 발라요.",
    dose: "콩알",
    times: "1",
    days: "—",
    vis: "jar",
  },
  ice: {
    key: "ice",
    name: "얼음찜질 · 폼롤러",
    cat: "[생활요법]",
    ing: "얼음 15분 · 종아리 1분씩",
    tags: [["생활요법 병행", "teal"], ["아프지 않을 만큼", "teal"]],
    text: "얼음은 수건에 싸서 15분까지. 폼롤러는 아프지 않을 만큼만 굴려요.",
    dose: "15분",
    times: "2",
    days: "3",
    vis: "roller",
  },
  rest: {
    key: "rest",
    name: "푹쉬어정",
    cat: "[회복 · 생활 지도]",
    ing: "수면 8시간 · 단백질 · 물",
    tags: [["계단 주의", "red"], ["천천히 일어나세요", "teal"]],
    text: "오늘은 계단 대신 엘리베이터. 앉았다 일어날 땐 난간을 잡아요.",
    dose: "1",
    times: "1",
    days: "3",
    vis: "pill",
    color: "#d9ccf2",
    mark: "REST",
  },
};

/** 급수별 처방 — 낮은 급(오래 달림)일수록 늘어난다 */
const BY_GRADE: Record<string, string[]> = {
  "cert-1": ["keto", "spray", "ors", "rest"],
  "cert-2": ["keto", "gel", "spray", "ors", "rest"],
  "cert-3": ["keto", "gel", "spray", "jakyak", "ors", "ice"],
  "cert-4": ["keto", "gel", "spray", "jakyak", "acet", "ors", "ice", "rest"],
  "cert-5": ["keto", "gel", "spray", "jakyak", "acet", "eperisone", "ice", "rest"],
};

export function rxItems(code: string, distance: string): Rx[] {
  let keys = [...(BY_GRADE[code] ?? BY_GRADE["cert-3"])];
  // 하프 · 풀은 물집 · 쓸림이 생긴다 — 생활 지도를 밀어내고 넣는다
  if (distance === "half" || distance === "full") {
    for (const k of ["blister", "vaseline"]) if (!keys.includes(k)) keys.push(k);
    while (keys.length > 8) {
      const drop = ["rest", "ice", "ors"].find((k) => keys.includes(k));
      if (!drop) break;
      keys = keys.filter((k) => k !== drop);
    }
  }
  return keys.map((k) => CATALOG[k]);
}

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

export function Prescription({ v }: { v: RunView }) {
  const d = v.detail;
  const items = rxItems(v.code, d.distance);
  const no = `${v.completedAt.getFullYear()}${String(v.completedAt.getMonth() + 1).padStart(2, "0")}${String(v.completedAt.getDate()).padStart(2, "0")}-${serial(v, 5)}`;
  const brand = v.issuer?.trim() || "마이재인";
  const pct = pctText(d);
  // 금액은 재미로 — 거리 · 시간에서 만든다(실제 약값이 아니다)
  const total = 4300 * items.length + Math.round(d.km) * 1000;
  const self = Math.round(total / 3 / 10) * 10;
  const ins = total - self;
  const sweat = Math.max(0.3, Math.round((d.seconds / 3600) * 0.8 * 10) / 10);
  const grade = v.code.replace("cert-", "");

  return (
    <div className="rx-paper">
      <div className="rx-main">
        <header className="rx-head">
          <QR seed={v.attemptId} />
          <div className="rx-who">
            <p className="rx-name">
              {v.name} <span>님</span>
            </p>
            <p className="rx-line">
              {d.gender === "f" ? "여" : "남"} / {distLabel(d)} 완주 / 질병기호 M79.1(근육통)
            </p>
            <p className="rx-meta">
              <b>조제일</b> {dateDot(v.completedAt)} &nbsp;<b>조제약사</b> {brand}
            </p>
            <p className="rx-meta">
              <b>교부번호</b> {no}
            </p>
            <p className="rx-meta">
              <b>발행기관</b> {v.race?.trim() ? `${v.race.trim()} 러닝 클리닉` : "동네 공원 러닝 클리닉"}
            </p>
          </div>
          <div className="rx-brand">
            <svg viewBox="0 0 60 60" aria-hidden="true" className="rx-cross">
              <defs>
                <linearGradient id={`rxg-${v.attemptId}`} x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#962fbf" />
                  <stop offset="1" stopColor="#fa7e1e" />
                </linearGradient>
              </defs>
              <path d="M21 4h18v17h17v18H39v17H21V39H4V21h17z" fill={`url(#rxg-${v.attemptId})`} opacity=".9" />
              <path d="M21 21h18v18H21z" fill="#fff" opacity=".35" />
            </svg>
            <p className="rx-shop">
              {brand}
              <br />
              러닝약국
            </p>
            <p className="rx-tel">☎ RUN-{serial(v, 4)}</p>
          </div>
        </header>

        <div className="rx-th">
          <span>약품이미지</span>
          <span>약품명/성분</span>
          <span>복약안내</span>
          <span>투약량</span>
          <span>횟수</span>
          <span>일수</span>
        </div>
        <ul className="rx-list">
          {items.map((it) => (
            <li key={it.key} className="rx-row">
              <div className="rx-img">
                <ItemArt vis={it.vis} color={it.color} mark={it.mark} />
              </div>
              <div className="rx-drug">
                <p className="rx-dname">{it.name}</p>
                <p className="rx-dcat">{it.cat}</p>
                <p className="rx-ding">{it.ing}</p>
              </div>
              <div className="rx-guide">
                <p className="rx-tags">
                  {it.tags.map(([t, c]) => (
                    <span key={t} data-c={c}>
                      {t}
                    </span>
                  ))}
                </p>
                <p className="rx-text">{it.text}</p>
              </div>
              <span className="rx-n">{it.dose}</span>
              <span className="rx-n">{it.times}</span>
              <span className="rx-n">{it.days}</span>
            </li>
          ))}
        </ul>
        <p className="rx-heart">
          🫀 가슴이 아프거나 두근거림 · 어지러움이 있으면 약보다 먼저 달리기를 멈추고 진료를 받으세요.
        </p>
      </div>

      <aside className="rx-side">
        <p className="rx-side-h">
          약제비 계산서·영수증 <small>[러닝 별지 서식]</small>
        </p>
        <dl className="rx-bill">
          <div>
            <dt>영수증번호</dt>
            <dd>{no}</dd>
          </div>
          <div>
            <dt>환자성명</dt>
            <dd>{v.name}</dd>
          </div>
          <div>
            <dt>완주기록</dt>
            <dd>
              {distLabel(d)} {formatPrime(d.seconds)}
            </dd>
          </div>
          <div>
            <dt>1km당</dt>
            <dd>{pacePrime(d.paceSec)}</dd>
          </div>
          <div>
            <dt>등급</dt>
            <dd>
              러닝자격증 {grade}급{pct ? ` · ${pct}` : ""}
            </dd>
          </div>
          <div>
            <dt>약제비 총액</dt>
            <dd>{won(total)}</dd>
          </div>
          <div>
            <dt>본인부담금</dt>
            <dd>{won(self)}</dd>
          </div>
          <div>
            <dt>다리부담금</dt>
            <dd>{won(ins)}</dd>
          </div>
          <div>
            <dt>흘린 땀</dt>
            <dd>약 {sweat}L</dd>
          </div>
          <div className="rx-sum">
            <dt>합 계</dt>
            <dd>국밥 한 그릇</dd>
          </div>
          <div>
            <dt>사업장 소재지</dt>
            <dd>{v.race?.trim() ? `${v.race.trim()} 결승선 옆` : "동네 공원 정문 옆"}</dd>
          </div>
          <div>
            <dt>상 호</dt>
            <dd>{brand} 러닝약국</dd>
          </div>
          <div className="rx-signrow">
            <dt>약 사</dt>
            <dd>
              {brand}
              <span className="rx-seal">(인)</span>
            </dd>
          </div>
        </dl>
        <div className="rx-how">
          <p>
            1일 <u>3</u> 회 &nbsp;총 <u>3</u> 일분
          </p>
          <p>
            물은 <u>수시로</u> &nbsp;<u>200</u> cc씩
          </p>
          <p className="rx-times">
            <span data-on="true">① 아침</span>
            <span>② 점심</span>
            <span data-on="true">③ 저녁</span>
            <span data-on="true">④ 취침 전</span>
          </p>
          <p className="rx-checks">
            <span data-on="true">달린 직후</span>
            <span data-on="true">샤워 후</span>
            <span>공복</span>
            <span>계단 앞</span>
          </p>
        </div>
        <p className="rx-fine">※ 재미로 만든 복약 지도예요. 실제 처방이 아니며, 약은 약사 · 의사와 상의하세요.</p>
      </aside>
    </div>
  );
}

/** 가짜 QR — 응시 id 로 늘 같은 무늬. 찍어도 아무 데도 가지 않는다 */
function QR({ seed }: { seed: string }) {
  const n = 21;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) >>> 16) / 65536;
  const cells: string[] = [];
  const finder = (x: number, y: number) => x < 7 && y < 7;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (finder(x, y) || finder(n - 1 - x, y) || finder(x, n - 1 - y)) continue;
      if (rnd() > 0.52) cells.push(`M${x} ${y}h1v1h-1z`);
    }
  const eye = (x: number, y: number) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
  return (
    <svg className="rx-qr" viewBox="-1 -1 23 23" aria-hidden="true">
      <rect x="-1" y="-1" width="23" height="23" fill="#fff" />
      <path d={`${eye(0, 0)}${eye(14, 0)}${eye(0, 14)}${cells.join("")}`} fill="#111" fillRule="evenodd" />
    </svg>
  );
}

/** 약품 그림 — 사진 대신 그린다(실제 상표가 보이지 않게) */
function ItemArt({ vis, color = "#f1f1ee", mark }: { vis: Vis; color?: string; mark?: string }) {
  switch (vis) {
    case "pill":
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <ellipse cx="60" cy="44" rx="44" ry="26" fill="#000" opacity=".08" />
          <ellipse cx="60" cy="40" rx="44" ry="26" fill={color} stroke="#d8d8d4" />
          <ellipse cx="52" cy="31" rx="26" ry="8" fill="#fff" opacity=".55" />
          <text x="60" y="45" textAnchor="middle" fontSize="13" fontWeight="700" fill="#999" letterSpacing="1">
            {mark}
          </text>
        </svg>
      );
    case "patch":
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <rect x="16" y="12" width="88" height="58" rx="8" fill="#f6efe2" stroke="#e0d4bd" />
          <rect x="24" y="20" width="72" height="42" rx="5" fill="none" stroke="#e7c9a5" strokeDasharray="3 3" />
          <path d="M36 34h48M36 42h48M36 50h30" stroke="#e7c9a5" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "tube":
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <path d="M14 26 L86 22 Q94 40 86 58 L14 54 Z" fill="#fff" stroke="#d5d5d0" />
          <path d="M14 26 L30 25 L30 55 L14 54 Z" fill="#d62976" opacity=".75" />
          <rect x="86" y="30" width="22" height="20" rx="3" fill="#962fbf" />
          <path d="M40 36h36M40 44h28" stroke="#ccc" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "spray":
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <rect x="44" y="20" width="32" height="56" rx="6" fill="#4f9fd6" />
          <rect x="44" y="34" width="32" height="20" fill="#fff" opacity=".85" />
          <rect x="52" y="8" width="16" height="14" rx="3" fill="#ddd" />
          <path d="M68 12 l16 -4" stroke="#bbb" strokeWidth="3" strokeLinecap="round" />
          <circle cx="92" cy="8" r="2" fill="#9cd2f0" />
          <circle cx="98" cy="13" r="2.5" fill="#9cd2f0" />
          <circle cx="95" cy="3" r="1.6" fill="#9cd2f0" />
        </svg>
      );
    case "sachet":
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <path
            d="M22 14 l4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 V66 l-4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 Z"
            fill={color}
          />
          <rect x="34" y="28" width="52" height="24" rx="4" fill="#fff" opacity=".85" />
        </svg>
      );
    case "bandage":
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <rect x="10" y="24" width="100" height="34" rx="17" fill="#f3d7bf" stroke="#e2bea0" />
          <rect x="42" y="27" width="36" height="28" rx="6" fill="#f7e9dc" />
          <g fill="#e2bea0">
            <circle cx="24" cy="36" r="1.5" />
            <circle cx="24" cy="46" r="1.5" />
            <circle cx="96" cy="36" r="1.5" />
            <circle cx="96" cy="46" r="1.5" />
          </g>
        </svg>
      );
    case "jar":
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <rect x="34" y="12" width="52" height="14" rx="4" fill="#2f6fb3" />
          <rect x="30" y="24" width="60" height="48" rx="10" fill="#f4f4f0" stroke="#d6d6d0" />
          <rect x="38" y="38" width="44" height="18" rx="3" fill="#2f6fb3" opacity=".2" />
        </svg>
      );
    case "roller":
      return (
        <svg viewBox="0 0 120 80" aria-hidden="true">
          <rect x="14" y="26" width="92" height="30" rx="15" fill="#5a5a66" />
          <g stroke="#7b7b88" strokeWidth="3">
            <path d="M30 28v26M46 28v26M62 28v26M78 28v26M94 28v26" />
          </g>
          <path d="M12 66 q10 -8 20 0" stroke="#7fc3e8" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="84" y="58" width="20" height="14" rx="3" fill="#bfe3f5" />
        </svg>
      );
  }
}
