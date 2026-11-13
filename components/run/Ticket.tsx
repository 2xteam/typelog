"use client";

import { useId } from "react";
import { formatPrime } from "@/lib/record";
import { dateTime, mmdd, pacePrime, pctText, serial, type RunView } from "./view";

/**
 * 과속딱지 — 가상의 「마이재인 러닝 단속반」 통지서.
 * 경찰 마크 · 「경찰청」 · 실제 고지서 양식 · 실제 금액을 쓰지 않는다.
 *
 * 단속 사진은 사용자가 준 차량 사진(public/run/ticket-car.png, 692×469)을 쓰고
 * 운전석에 얼굴을 얹는다 — ⚠️ 출시 전 사진 사용권 확인 (계획서 「정할 것」).
 * 얼굴 사진은 lib/runPhoto.ts 의 틀(600×720, 타원 중심 300·330, 눈 300)로 잘려 온다.
 * 시안: docs/design/run-ticket.html (2026-11-14)
 */

const LIMIT = 5;

export function Ticket({ v }: { v: RunView }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (s: string) => `${s}-${raw}`;
  const d = v.detail;
  const suspend = v.code === "ticket-suspend";
  const no = `R-${v.completedAt.getFullYear()}-${mmdd(v.completedAt)}-${serial(v, 4)}`;
  const over = Math.round((d.kmh - LIMIT) * 10) / 10;
  const at = Math.round(d.km * (suspend ? 0.84 : 0.72) * 10) / 10;
  const fine = suspend ? "국밥 두 그릇" : "국밥 한 그릇";
  const pct = pctText(d);
  const speed5 = d.kmh.toFixed(1).padStart(5, "0");

  const view = (vb: string) => (
    <svg className="rt-view" viewBox={vb} preserveAspectRatio="xMidYMid slice">
      <use href={`#${id("cam")}`} width="692" height="469" />
    </svg>
  );

  return (
    <div className="rt-ticket">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <radialGradient id={id("face")} cx="45%" cy="40%" r="65%">
            <stop offset="0" stopColor="#c9c9c9" />
            <stop offset="1" stopColor="#8d8d8d" />
          </radialGradient>
          <radialGradient id={id("fade")}>
            <stop offset=".72" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={id("mask")} maskContentUnits="userSpaceOnUse">
            <ellipse cx="0" cy="-3" rx="37" ry="45" fill={`url(#${id("fade")})`} />
          </mask>
          <clipPath id={id("glass")}>
            <path d="M166 42 H500 L512 134 H150 Z" />
          </clipPath>
          <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .14 0" />
          </filter>
          <symbol id={id("cam")} viewBox="0 0 692 469">
            <image href="/run/ticket-car.png" width="692" height="469" />
            <g clipPath={`url(#${id("glass")})`}>
              <g transform="translate(405 88) scale(.9)">
                <path d="M-58 72 C -56 42 -32 28 0 28 C 32 28 56 42 58 72 Z" fill="#4a4a4a" />
                <rect x="-12" y="26" width="24" height="12" fill="#5a5a5a" />
                <ellipse cx="0" cy="0" rx="30" ry="35" fill={`url(#${id("face")})`} />
                <path d="M-30 -10 C -28 -38 28 -40 30 -10 C 22 -24 -22 -24 -30 -10 Z" fill="#363636" />
                {v.photo ? (
                  /* 틀 600×720 → 머리 좌표: 타원 가로 210 → 30 (1/7), 타원 중심이 원점에 */
                  <image
                    href={v.photo}
                    x={-300 / 7}
                    y={-330 / 7}
                    width={600 / 7}
                    height={720 / 7}
                    mask={`url(#${id("mask")})`}
                  />
                ) : (
                  <rect x="-30" y="-20" width="60" height="6" rx="3" fill="#cfcfcf" />
                )}
                {/* 눈 띠 — 틀의 눈높이 300 → (300−330)/7 ≈ −4.3 */}
                <rect x="-40" y="-12" width="80" height="16" fill="#000" />
              </g>
              <rect x="140" y="40" width="380" height="100" fill="#000" opacity=".3" />
              <path d="M352 40 L372 40 L330 140 L310 140 Z" fill="#fff" opacity=".07" />
            </g>
            <rect x="290" y="380" width="92" height="24" rx="2" fill="#dcdcdc" stroke="#111" strokeWidth="1.5" />
            <text x="336" y="397" textAnchor="middle" fontFamily="var(--rf-mono), monospace" fontWeight="700" fontSize="14.5" fill="#111">
              {(d.distance === "5k" ? "5K" : d.distance === "10k" ? "10K" : d.distance === "half" ? "HM" : "FM")} {serial(v, 4)}
            </text>
            <g stroke="#fff" strokeWidth="2" fill="none">
              <path d="M371 52 h11 M371 52 v11" />
              <path d="M439 52 h-11 M439 52 v11" />
              <path d="M371 124 h11 M371 124 v-11" />
              <path d="M439 124 h-11 M439 124 v-11" />
            </g>
            <rect width="692" height="469" filter={`url(#${id("grain")})`} />
          </symbol>
        </defs>
      </svg>

      <div className="rt-head">
        <div className="rt-issuer">
          <svg viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="24" fill="#14213d" />
            <circle cx="26" cy="28" r="14" fill="none" stroke="#ffcc00" strokeWidth="3" />
            <rect x="23" y="8" width="6" height="6" rx="1" fill="#ffcc00" />
            <path d="M26 28 L33 21" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <p className="rt-ko">마이재인 러닝 단속반</p>
            <p className="rt-en">MYJANE RUNNING PATROL</p>
          </div>
        </div>
        <div className="rt-no">
          <p className="rt-k">통지번호</p>
          <p className="rt-v">{no}</p>
        </div>
      </div>

      <div className="rt-titlebar">
        <div>
          <p className="rt-title">러닝 과속 단속 통지서</p>
          <p className="rt-title-en">RUNNING SPEED VIOLATION NOTICE</p>
        </div>
        <div className="rt-limit">
          <b>{LIMIT}</b>
        </div>
      </div>

      <p className="rt-lead">
        <b>{v.name}</b> 님, 아래와 같이 <b>너무 빨리 달리신 사실</b>이 단속 카메라에 찍혀 알려 드려요. 이 구간 제한속도는{" "}
        <b>동네 산책 속도 {LIMIT}km/h</b> 예요.
      </p>

      <p className="rt-sec-h">
        단속 사진 <span>EVIDENCE</span>
      </p>
      <div className="rt-cam rt-cam--main">
        <div className="rt-hud rt-hud--top">
          <span>
            <i className="rt-rec" />
            RUN-CAM 07 · MYJANE PATROL
          </span>
          <span>{dateTime(v.completedAt)}</span>
        </div>
        {view("54 28 558 313")}
        <div className="rt-hud rt-hud--bot">
          <span>LIMIT 00{LIMIT} km/h</span>
          <span className="rt-hot">
            SPEED {speed5} km/h ▲+{over}
          </span>
        </div>
      </div>
      <div className="rt-crops">
        <div className="rt-cam">
          <span className="rt-crop-label">얼굴 확대 · FACE</span>
          {view("353 54 104 60")}
        </div>
        <div className="rt-cam">
          <span className="rt-crop-label">배번호 확대 · BIB</span>
          {view("278 368 116 50")}
        </div>
        <div className="rt-speed">
          <span className="rt-lab">MEASURED</span>
          <span className="rt-num" data-speed={d.kmh.toFixed(1)}>
            {d.kmh.toFixed(1)}
          </span>
          <span className="rt-unit">KM/H</span>
        </div>
      </div>

      <p className="rt-sec-h">
        위반 내용 <span>DETAILS</span>
      </p>
      <table className="rt-table">
        <tbody>
          <tr>
            <th>위반자</th>
            <td>{v.name}</td>
            <th>위반 일시</th>
            <td className="rt-mono">{dateTime(v.completedAt)}</td>
          </tr>
          <tr>
            <th>위반 장소</th>
            <td colSpan={3}>
              {v.race ? `${v.race} ` : ""}
              {d.distance === "half" ? "하프" : d.distance === "full" ? "풀" : d.distance.replace("k", "km")} 코스 {at}km 지점
            </td>
          </tr>
          <tr>
            <th>제한 속도</th>
            <td>
              {LIMIT}km/h <span className="rt-dim">(동네 산책)</span>
            </td>
            <th>측정 속도</th>
            <td>
              <span className="rt-red">
                {d.kmh}km/h (+{over})
              </span>
            </td>
          </tr>
          <tr>
            <th>기록</th>
            <td>
              <span className="rt-mono">{formatPrime(d.seconds)}</span> · 1km당 <span className="rt-mono">{pacePrime(d.paceSec)}</span>
            </td>
            <th>순위</th>
            <td>{pct ? `${d.percentileLabel} ${pct}` : "—"}</td>
          </tr>
        </tbody>
      </table>

      <div className="rt-verdict">
        <div>
          <p className="rt-k">벌점</p>
          <p className="rt-v">0점</p>
        </div>
        <div>
          <p className="rt-k">과태료</p>
          <p className="rt-v">{fine}</p>
        </div>
        <div>
          <p className="rt-k">처분</p>
          <p className="rt-v">{suspend ? "러닝 면허 정지" : "경고 · 안전 운행"}</p>
        </div>
      </div>
      <p className="rt-care">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.6-9.4C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.5 1.2 4.4 2.6.9-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.1C19.5 16.4 12 21 12 21z" fill="#e02424" />
          <path d="M5 12h3l1.5-3 2.5 6 1.5-3H19" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        빨리 달린 것도 좋지만, 심장도 신호를 지켜요. {suspend ? "다음 대회까지 푹 쉬어 주세요." : "무리하지 말고 즐겁게 달려요."}
      </p>

      <div className="rt-tear">
        <span className="rt-scissor">✂</span>
        <div className="rt-stub">
          <div>
            <p className="rt-stub-t">
              납부 영수증 <span>RECEIPT</span>
            </p>
            <dl>
              <dt>납부자</dt>
              <dd>{v.name}</dd>
              <dt>납부 금액</dt>
              <dd>{fine}</dd>
              <dt>납부처</dt>
              <dd>결승선 앞 국밥집</dd>
            </dl>
          </div>
          <div>
            <svg className="rt-barcode" viewBox="0 0 210 62" preserveAspectRatio="none" aria-hidden="true">
              {Array.from({ length: 47 }, (_, i) => (
                <rect key={i} x={i * 4.4} y="0" width={[1, 2, 3, 1, 2, 1, 3, 2][(i * 7 + 3) % 8]} height="62" fill="#111" />
              ))}
            </svg>
            <p className="rt-barcode-no">{no.replace(/-/g, " ")}</p>
          </div>
          <div className="rt-seal">
            <span>
              마이재인
              <br />
              러닝
              <br />
              단속반
            </span>
          </div>
        </div>
      </div>
      <p className="rt-foot">이 통지서는 재미로 만든 패러디예요. 실제 과태료 · 벌점과 관계없어요.</p>
      {suspend ? (
        <div className="rt-suspend">
          면허 정지<small>SUSPENDED</small>
        </div>
      ) : null}
    </div>
  );
}
