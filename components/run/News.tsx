import { dateEn, distLabel, mmdd, paceKo, pacePrime, pctText, timeKo, type RunView } from "./view";
import { formatPrime } from "@/lib/record";

/**
 * 신문 — 미국 종이신문 느낌 「The MyJane Journal」. 1면(A1) · 사회면(A12 METRO).
 * 실제 신문의 이름 · 로고 · 슬로건 원문은 쓰지 않는다(슬로건은 비튼 패러디).
 * 시안: docs/design/run-news.html (2026-11-14 확정)
 */

function Photo({ v, hint }: { v: RunView; hint: string }) {
  return (
    <div className="rn-photo">
      {v.photoWide || v.photo ? (
        // 넓게 잡은 가로 사진을 먼저 — 얼굴 크롭은 신문 칸에서 얼굴만 꽉 차 보였다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.photoWide ?? v.photo ?? ""} alt="" />
      ) : (
        <>
          <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <rect width="300" height="300" fill="#bfb8aa" />
            <circle cx="150" cy="120" r="58" fill="#8d877b" />
            <path d="M40 300 C40 215 90 185 150 185 C210 185 260 215 260 300 Z" fill="#8d877b" />
          </svg>
          <span className="rn-hint">{hint}</span>
        </>
      )}
    </div>
  );
}

const PARODY = "A parody for fun · 재미로 만든 패러디예요";

export function NewsFront({ v }: { v: RunView }) {
  const d = v.detail;
  const pct = pctText(d);
  const place = v.race ?? "서울";
  return (
    <div className="rn-paper">
      <div className="rn-topline">
        <span>LATE EDITION</span>
        <span>TODAY&apos;S PACE {pacePrime(d.paceSec)} / KM</span>
        <span>₩1,000</span>
      </div>
      <div className="rn-mast">
        <div className="rn-ear rn-slogan">
          “All the Miles
          <br />
          That Are Fit
          <br />
          to Run.”
        </div>
        <div className="rn-masthead">The MyJane Journal</div>
        <div className="rn-ear">
          <span className="rn-k">WEATHER</span>
          <span className="rn-big">12°C</span>맑음 · 바람 약함
        </div>
      </div>
      <div className="rn-dateband">
        <span>VOL. I ··· No. {mmdd(v.completedAt)}</span>
        <span>SEOUL, {dateEn(v.completedAt)}</span>
        <span>A1</span>
      </div>

      <div className="rn-kicker">
        <span className="rn-tag">EXCLUSIVE</span>
        <span className="rn-sec">
          {v.race ? `${v.race} · ` : "Running · "}
          {distLabel(d)} 단독
        </span>
      </div>
      <h1 className="rn-hed">
        {v.name}, {distLabel(d)} {timeKo(d.seconds)} 주파
      </h1>
      <div className="rn-deck">
        <p>
          1km를 평균 {paceKo(d.paceSec)}에 끊어…{pct ? ` ${d.percentileLabel} ${pct} 기록` : " 끝까지 흔들리지 않았다"}
        </p>
        <p>목격자 “사람이 아니라 바람이 지나간 줄 알았다”</p>
      </div>

      <div className="rn-lead">
        <figure>
          <Photo v={v} hint="사진이 들어가는 자리" />
          <p className="rn-caption">
            <span className="rn-credit">MYJANE / STAFF</span>
            <b>결승선을 통과하는 {v.name} 씨.</b> 본인은 “아직 멀었다”는 말만 남겼다.
          </p>
        </figure>
        <div className="rn-side">
          <p className="rn-byline">
            <b>BY MYJANE STAFF</b> · 러닝 담당
          </p>
          <div className="rn-body">
            <p>
              <span className="rn-dateline">【{place}】</span> {v.completedAt.getMonth() + 1}월 {v.completedAt.getDate()}일,
              한 러너가 {distLabel(d)}를 {timeKo(d.seconds)}에 달린 사실이 확인됐다. 1km를 평균 {paceKo(d.paceSec)}에 끊은 셈이다.
            </p>
            <p>
              {pct ? `${d.percentileLabel} ${pct}에 해당한다. ` : ""}현장을 지켜본 김모(34) 씨는 “운동화 소리가 한참 뒤에 들렸다”고
              전했다.
            </p>
          </div>
          <div className="rn-factbox">
            <p className="rn-t">THE RECORD</p>
            <dl>
              <dt>거리</dt>
              <dd>{distLabel(d)}</dd>
              <dt>기록</dt>
              <dd>{formatPrime(d.seconds)}</dd>
              <dt>1km당</dt>
              <dd>{pacePrime(d.paceSec)}</dd>
              <dt>시속</dt>
              <dd>{d.kmh}km</dd>
              {pct ? (
                <>
                  <dt>{d.distance === "5k" ? "10km 환산" : "춘천 완주자 중"}</dt>
                  <dd>{pct}</dd>
                </>
              ) : null}
            </dl>
          </div>
        </div>
      </div>

      <div className="rn-below">
        <div>
          <p className="rn-brief-h">결승 직후 첫마디는 “물 한 컵만”</p>
          <p className="rn-brief">
            {v.name} 씨는 취재진의 질문에 답하는 대신 물 한 컵을 받아 들었다. 관계자는 “기록보다 표정이 더 인상적이었다”고 말했다.
          </p>
        </div>
        <div>
          <p className="rn-brief-h">측정단 “무리 말고 즐겁게 달리길”</p>
          <p className="rn-brief">
            마이재인 러닝 기록 측정단은 이번 기록을 확인하며 “몸이 보내는 신호를 먼저 들으라”고 당부했다. 기록은 다음에도 잴 수 있다.
          </p>
        </div>
        <div>
          <p className="rn-brief-h">동네 국밥집, 아침부터 줄 서</p>
          <p className="rn-brief">
            달리기를 마친 러너들이 몰리며 국밥집이 오전 8시부터 붐볐다. 사장 박모(58) 씨는 “주말마다 이렇다”며 웃었다.
          </p>
        </div>
      </div>
      <div className="rn-inside">
        <b>INSIDE</b>
        <span>러닝 A3</span>
        <span>동네 소식 A12</span>
        <span>날씨 A12</span>
        <span>생활 광고 A14</span>
      </div>
      <div className="rn-ad">
        <div>
          <p className="rn-a1">ADVERTISEMENT</p>
          <p className="rn-a2">당신의 기록은 어느 면에 실릴까?</p>
        </div>
        <p className="rn-a3">
          마이재인 러닝 기록
          <br />
          딱지 · 신문 · 자격증
        </p>
      </div>
      <p className="rn-parody">{PARODY}</p>
    </div>
  );
}

export function NewsLocal({ v }: { v: RunView }) {
  const d = v.detail;
  const pct = pctText(d);
  const place = v.race ?? "동네 공원";
  return (
    <div className="rn-paper">
      <div className="rn-pagehead">
        <div className="rn-left">
          <span className="rn-pno">A12</span>
          <span className="rn-secname">METRO</span>
          <span className="rn-secko">동네 소식</span>
        </div>
        <div className="rn-right">
          <span className="rn-mini">The MyJane Journal</span>
          <br />
          {dateEn(v.completedAt)}
        </div>
      </div>

      <div className="rn-metro">
        <div className="rn-col">
          <p className="rn-m-hed">단지 고양이, 3년째 경비실로 ‘출근’</p>
          <p className="rn-m-deck">주민들 “사원증 만들어 줘야”</p>
          <div className="rn-m-body">
            <p>한 아파트 단지의 고양이가 3년째 매일 아침 7시 경비실 앞에 나타나 화제다. 경비원 최모(66) 씨는 “지각한 적이 한 번도 없다”고 말했다.</p>
            <p>주민들은 고양이 이름을 두고 투표를 벌이고 있다.</p>
          </div>
          <div className="rn-m-sep" />
          <p className="rn-m-hed rn-sm">편의점 바나나우유 품절… “러너들이 다 사 갔다”</p>
          <div className="rn-m-body">
            <p>주말 아침 공원 앞 편의점에서 바나나우유가 오전 9시에 동났다. 점주는 다음 주 물량을 두 배로 늘리겠다고 밝혔다.</p>
          </div>
        </div>

        <div className="rn-col rn-ours">
          <svg className="rn-pen" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
            <path d="M48 9 C 140 3, 270 7, 368 5 C 390 6, 396 16, 395 34 C 398 110, 392 200, 394 262 C 395 284, 382 294, 352 293 C 260 297, 140 299, 44 292 C 18 290, 7 280, 7 256 C 3 180, 6 100, 5 30 C 6 14, 18 8, 44 8 C 100 6, 150 12, 196 4" />
          </svg>
          <span className="rn-pen-note">나다!!</span>
          <p className="rn-m-hed rn-lg">
            {place}서 {distLabel(d)} {timeKo(d.seconds)} 완주
          </p>
          <p className="rn-m-deck">
            1km당 {paceKo(d.paceSec)}…{pct ? ` ${d.percentileLabel} ${pct}` : " 끝까지 달렸다"}
            <br />“처음엔 3km만 뛰려 했는데 생각보다 할 만했다”
          </p>
          <div className="rn-ours-grid">
            <figure>
              <Photo v={v} hint="사진 자리" />
              <p className="rn-caption">
                <b>{v.name} 씨.</b> 완주 직후 벤치에서.
              </p>
            </figure>
            <div className="rn-m-body" style={{ marginTop: 0 }}>
              <p>
                <span className="rn-dateline">【{v.race ?? "서울"}】</span> {v.race ? `${v.race}에서 ` : "주말 아침 동네 공원에서 "}
                {distLabel(d)}를 {timeKo(d.seconds)}에 완주한 시민이 화제다. 1km를 평균 {paceKo(d.paceSec)}에 달렸다.
              </p>
              <p>
                {v.name} 씨는 “끝나고 먹은 국밥이 제일 기억에 남는다”며 웃었다. 산책하던 이모(61) 씨는 “매주 보는 얼굴인데 오늘은 표정이 달랐다”고 전했다.
              </p>
              <p>마이재인 러닝 기록 측정단은 “다치지 않고 꾸준히 달리는 게 제일”이라고 덧붙였다.</p>
            </div>
          </div>
        </div>

        <div className="rn-col">
          <div className="rn-weather">
            <p className="rn-t">WEATHER</p>
            <div className="rn-wrow"><span>오늘</span><b>맑음 12°</b></div>
            <div className="rn-wrow"><span>내일</span><b>구름 10°</b></div>
            <div className="rn-wrow"><span>달리기</span><b>좋음</b></div>
          </div>
          <div className="rn-m-sep" />
          <p className="rn-m-hed rn-sm">약수터 물맛, 3주 연속 ‘좋음’</p>
          <div className="rn-m-body"><p>구청이 매주 공개하는 약수터 수질 검사에서 뒷산 약수터가 3주 연속 ‘좋음’을 받았다.</p></div>
          <div className="rn-m-sep" />
          <p className="rn-m-hed rn-sm">[알림] 공원 둘레길 보수</p>
          <div className="rn-m-body"><p>다음 달 1일부터 2주간 북쪽 구간이 막힌다. 남쪽으로 돌아가면 된다.</p></div>
        </div>
      </div>

      <div className="rn-rule-thick" />
      <div className="rn-metro rn-metro--b">
        <div className="rn-col">
          <p className="rn-m-hed rn-md">새벽 5시 한강 다리 위, 헤드랜턴 행렬</p>
          <p className="rn-m-deck">출근 전 달리는 ‘새벽 러닝 모임’ 늘어</p>
          <div className="rn-m-body rn-cols2">
            <p>해가 뜨기 전 한강 다리 위로 헤드랜턴 불빛이 줄지어 지나간다. 출근 전에 5~10km를 달리는 새벽 러닝 모임이 늘고 있다.</p>
            <p>모임을 이끄는 정모(41) 씨는 “처음 오는 분께는 속도보다 대화할 수 있는 페이스를 권한다”고 말했다.</p>
            <p>참가자들은 달리기가 끝나면 다리 아래 편의점에서 함께 아침을 먹는다.</p>
          </div>
        </div>
        <div className="rn-col">
          <p className="rn-m-hed rn-sm">운동화 끈 묶는 법 강좌, 정원 3배 몰려</p>
          <div className="rn-m-body"><p>구민회관이 연 ‘풀리지 않는 운동화 끈’ 강좌에 정원의 세 배가 신청했다.</p></div>
        </div>
        <div className="rn-col">
          <p className="rn-m-hed rn-sm">분실물 센터에 러닝 장갑 41켤레</p>
          <div className="rn-m-body"><p>공원 관리소는 지난달 주인을 찾지 못한 장갑이 41켤레라고 밝혔다. 짝이 맞는 건 12켤레뿐이다.</p></div>
        </div>
      </div>
      <div className="rn-classified">
        <p className="rn-cl-head">
          CLASSIFIEDS <span>생활 광고</span>
        </p>
        <div className="rn-cl-grid">
          <p><b>구함</b> 러닝 메이트. 주 3회 새벽, 대화되는 페이스로. 공원 정문 05:30.</p>
          <p><b>팝니다</b> 운동화 270mm. 300km 달림, 아직 쌩쌩. 끈은 새것.</p>
          <p><b>분실</b> 왼쪽 무선 이어폰 한 짝. 찾아 주시면 국밥 삽니다.</p>
          <p><b>알림</b> 다음 주 일요일 둘레길 쓰레기 줍기 달리기. 집게 드려요.</p>
          <p><b>구함</b> 같이 스트레칭 할 사람. 유연성 무관, 끈기만.</p>
          <p><b>팝니다</b> 완주 메달 걸이. 메달 12개까지 걸림.</p>
          <p><b>삽니다</b> 페이스 끝까지 지키는 법. 값은 부르는 대로.</p>
          <p><b>부탁</b> 노래 크게 틀고 뛰시는 분, 선곡 좋아요. 목록 공유 부탁.</p>
        </div>
      </div>
      <div className="rn-ad">
        <div>
          <p className="rn-a1">ADVERTISEMENT</p>
          <p className="rn-a2">당신의 기록은 어느 면에 실릴까?</p>
        </div>
        <p className="rn-a3">
          마이재인 러닝 기록
          <br />
          딱지 · 신문 · 자격증
        </p>
      </div>
      <p className="rn-parody">{PARODY}</p>
    </div>
  );
}
