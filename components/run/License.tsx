import { formatPrime } from "@/lib/record";
import { certGrade, dateDot, DIST_CODE, distLabel, mmdd, modifierMark, pacePrime, serial, type RunView } from "./view";

/**
 * 자격증 — 레퍼런스(쏘맥자격증)의 항목 위치를 그대로 쓴다. 색은 인스타그램.
 * 시안: docs/design/run-license.html (2026-11-14 확정)
 */
/**
 * 선수자격증 — 신문 이상(1면 · 사회면 · 딱지 · 면허 정지)을 받은 사람에게 결과 아래 함께 준다
 * (사용자 결정 2026-11-14). 모양은 같고 띠 · 급수 · 증명 문구만 다르다.
 */
const ATHLETE_LEVEL: Record<string, string> = {
  "ticket-suspend": "특급",
  ticket: "1급",
  "news-front": "2급",
  "news-local": "3급",
};

export function License({ v, athlete = false }: { v: RunView; athlete?: boolean }) {
  const d = v.detail;
  const grade = certGrade(v.code);
  const word = athlete ? "선수자격증" : "러닝자격증";
  /** 발급처 — 결과를 받은 사람 누구나 바꿀 수 있다(러닝자격증 · 선수자격증 모두, 사용자 2026-11-14) */
  const brand = v.issuer?.trim() || "마이재인";
  const sealChars = `${brand}주식회사인`.split("");
  const sealCols = Math.max(3, Math.ceil(Math.sqrt(sealChars.length)));
  return (
    <div className="rl-card">
      <div className="rl-band">
        <span className="rl-ko">
          {brand} {word}
        </span>
        <span className="rl-en">{athlete ? "ATHLETE LICENSE" : "RUNNING LICENSE"}</span>
      </div>
      <div className="rl-body">
        <div className="rl-photo">
          {v.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.photo} alt="" />
          ) : (
            <svg viewBox="0 0 300 404" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <defs>
                <linearGradient id="rl-sil" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#962fbf" stopOpacity=".35" />
                  <stop offset="1" stopColor="#d62976" stopOpacity=".35" />
                </linearGradient>
              </defs>
              <circle cx="150" cy="150" r="70" fill="url(#rl-sil)" />
              <path d="M30 404 C30 300 80 250 150 250 C220 250 270 300 270 404 Z" fill="url(#rl-sil)" />
            </svg>
          )}
        </div>
        <div className="rl-info">
          <p className="rl-lic">LICENSE NO.</p>
          <p className="rl-lic-no">
            {athlete ? "A.T.H" : "R.U.N"} {DIST_CODE[d.distance] ?? ""} {v.completedAt.getFullYear()} {mmdd(v.completedAt)}
            {serial(v)}
          </p>
          <dl className="rl-rows">
            <Row label="러너" value={<>{v.name}</>} />
            <Row
              label="급수"
              value={
                <span className="rl-grade">
                  {athlete
                    ? `${distLabel(d)} 선수 ${ATHLETE_LEVEL[v.code] ?? ""}`
                    : `${distLabel(d)} ${grade}급 ${modifierMark(d)}`}
                </span>
              }
            />
            <Row
              label="기록"
              value={
                <>
                  {formatPrime(d.seconds)}
                  <span className="rl-sub">
                    1km당 {pacePrime(d.paceSec)} · 시속 {d.kmh}km
                  </span>
                </>
              }
            />
            <Row label="완주일자" value={<>{dateDot(v.completedAt)}</>} />
          </dl>
          <div className="rl-proof-wrap">
            <div className="rl-proof">
              <p>{word}을 취득하였음을 증명함</p>
              <p className="rl-co">{brand} 주식회사</p>
            </div>
            <div
              className="rl-seal"
              style={
                sealCols > 3
                  ? { gridTemplateColumns: `repeat(${sealCols}, 1fr)`, fontSize: Math.round((29 * 3) / sealCols) }
                  : undefined
              }
            >
              {sealChars.map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rl-row">
      <dt>
        {label.split("").map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </dt>
      <span className="rl-colon">:</span>
      <dd>{value}</dd>
    </div>
  );
}
