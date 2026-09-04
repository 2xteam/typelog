# 작업 전에 읽을 것

이 프로젝트의 배경 지식은 별도의 옵시디언 볼트에 정리되어 있다.

```
로컬:   C:\Dev\my-obsidian-vault
저장소: https://github.com/2xteam/my-obsidian-vault
```

## 먼저 읽기

1. `10-Projects/TypeLog.md` — 이 프로젝트의 스택·데이터 모델·결정 사항·현황
2. `30-Patterns/설문지 JSON 작성 지침.md` — 질문지 JSON 규격과 검증 규칙
3. `00-Meta/AI 협업 규칙.md` — 볼트를 읽고 갱신하는 방법

작업 성격에 따라 추가로:

| 작업 | 노트 |
|---|---|
| 페이지 디자인 | `20-Design/` 전체 (특히 결쩜사 페이지 패턴·카피 톤앤매너) |
| 로그인·회원·세션 | `30-Patterns/인증과 세션 공유.md` |
| admin | `30-Patterns/통합 admin.md` |
| 배포·환경 변수·도메인 | `30-Patterns/Vercel 배포 패턴.md`, `40-Infra/도메인과 DNS.md` |
| DB 연결 | `40-Infra/MongoDB Atlas.md` |

## 이 프로젝트 메모

- 로컬 포트 **3005**. 전체 포트 표는 볼트 `Home.md`
- DB는 `type`. `lib/db.ts`에서 이름을 코드에 못 박는다 (URI 경로를 믿지 않는다)
- 회원은 `user` DB 공유. `users.adminRole`(`master`/`operator`)로 admin 접근을 가른다
- **API는 쿠키의 `id`를 믿지 않는다.** 세션의 서명 토큰을 검증한다 (2hbk `lib/auth.ts` 방식)
- 문항은 `published` 후 잠긴다. `draft`에서는 JSON으로 통째로 교체한다
- 화면 문장은 전부 **해요체**. "검사·진단"이라 하지 않고 "놀이·성향"이라 한다
- 상단 메뉴는 `Home` `Types` `Records`. `Tests`라고 쓰지 않는다

## 작업이 끝나면

바뀐 사실(도메인·DB·진행 상황·새로 발견한 함정)을 볼트의 해당 노트에 반영하고
`updated` 날짜를 올린다. 볼트 수정은 코드와 **별도 커밋**으로 남긴다.

비밀값은 볼트에 쓰지 않는다. 공개 저장소다.
