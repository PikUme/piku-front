# Documentation Rules

## 목적
이 문서는 구조나 계약이 바뀌었을 때 어떤 정식 문서를 함께 수정해야 하는지 정의한다.
`docs/process/`는 코드 구조가 아니라 레포 운영 규칙을 다루는 영역이며, 문서 갱신 규칙과 작업 컨벤션을 여기에 둔다.

## 문서 우선순위
1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `docs/**`
4. `README.md`

문서가 충돌하면 상위 문서를 기준으로 판단한다.

## 변경-문서 매핑표

| 변경 유형 | 함께 수정할 문서 |
| --- | --- |
| 라우트 추가/삭제/이동 | `ARCHITECTURE.md` |
| 디렉터리 책임 변경 | `ARCHITECTURE.md`, `docs/architecture/directory-map.md` |
| API 응답 형식 또는 공통 에러 처리 변경 | `docs/frontend/runtime-contracts.md` |
| 상태 관리 경계 변경 | `ARCHITECTURE.md`, `docs/frontend/runtime-contracts.md` |
| SSE / FCM / PWA / 브라우저 초기화 변경 | `docs/architecture/runtime-boundaries.md` |
| 테스트 전략 또는 검증 명령 변경 | `AGENTS.md`, `docs/frontend/testing-and-verification.md` |
| 문서 운영 규칙 변경 | `docs/process/documentation-rules.md` |
| 브랜치 전략 또는 커밋 규칙 변경 | `docs/process/workflow-conventions.md` |
| 설치/실행 방식 변경 | `README.md`, `AGENTS.md` |

## 새 문서 생성 규칙
- 새 문서를 만들기 전에 기존 문서 책임 안에 흡수 가능한지 먼저 판단한다.
- 반복 규칙이 아니라 일회성 설명이면 새 문서를 만들지 않는다.
- 정식 문서는 작업 중 자주 재참조되는 사실만 담는다.

## 정식 문서와 로컬 문서의 경계
- `docs/superpowers/`는 로컬 전용 작업 산출물이다.
- 정식 기록은 루트 문서와 `docs/` 아래 정식 문서만 사용한다.

## 문서화하지 않을 것
- 일회성 디버깅 메모
- 임시 작업 계획
- 코드만 보면 충분한 세부 구현
- 로컬 실험 결과

## 관련 문서
- `docs/process/workflow-conventions.md`
