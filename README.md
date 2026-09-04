# TypeLog

질문에 답하면 나의 타입이 나오고, 다시 할 때마다 그 변화가 쌓이는 성향 놀이.

```
운영    https://typelog.myjane.co.kr
로컬    http://localhost:3005
DB      MongoDB Atlas — type (회원은 user DB 공유)
```

## 개발

```bash
npm install
cp .env.example .env.local     # 값을 채운다
npm run dev                    # http://localhost:3005
npm run dev:https              # Secure 쿠키·리디렉트 확인용
```

포트는 앱마다 다르다 — myjane 3000 · SnapWord 3001 · SnapNote 3002 ·
FitLog 3003 · 2hbk 3004 · TypeLog 3005.

## 배경 지식

설계 결정과 데이터 모델은 옵시디언 볼트에 있다. 작업 전에 `CLAUDE.md`를 먼저 본다.

```
C:\Dev\my-obsidian-vault
  10-Projects/TypeLog.md              스택 · 데이터 모델 · 결정 사항 · 현황
  30-Patterns/설문지 JSON 작성 지침.md   질문지 JSON 규격과 검증 규칙
```

## 구조

```
app/            App Router
components/     Sheet 등 결쩜사 패턴 조각
lib/            db · schedule · scoring · auth
models/         quizzes · resulttypes · attempts
content/quizzes 질문지 JSON 보관 (등록은 /admin/quizzes 에서)
```
