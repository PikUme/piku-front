# AGENTS.md

## 목적
이 문서는 `piku-front` 레포에서 작업을 시작할 때 읽는 운영 맵이다.
구조 설명은 `ARCHITECTURE.md`, 상세 규칙은 `docs/`를 따른다.
`README.md`는 사람용 소개 문서이며, 작업 기준 문서가 아니다.

## 문서 우선순위
다음 우선순위로 해석한다.

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `docs/**`
4. `README.md`

문서가 충돌하면 상위 문서를 기준으로 판단한다.

## 빠른 시작
- 개발 서버: `npm run dev`
- 타입 검사: `npx tsc --noEmit`
- 단위/컴포넌트 테스트: `npm run test:run`
- 브라우저 E2E: `npm run test:e2e`

작업 완료를 주장하기 전에, 변경 범위에 맞는 검증을 수행한다.

## 작업 유형별 읽기 순서

### 라우트 또는 페이지 구조 변경
먼저 읽기:
- `ARCHITECTURE.md`
- `docs/architecture/directory-map.md`

### API 응답 형식, 인증, 상태 처리 변경
먼저 읽기:
- `ARCHITECTURE.md`
- `docs/frontend/runtime-contracts.md`

### 브라우저 런타임 초기화 변경
대상 예시:
- SSE
- FCM
- PWA
- 이미지 로딩
- 브라우저 전용 초기화

먼저 읽기:
- `ARCHITECTURE.md`
- `docs/architecture/runtime-boundaries.md`

### 테스트 추가 또는 검증 방식 변경
먼저 읽기:
- `docs/frontend/testing-and-verification.md`

### 문서 구조 또는 운영 규칙 변경
먼저 읽기:
- `docs/process/documentation-rules.md`
- `docs/process/workflow-conventions.md`

## 레포 작업 원칙
- 정식 기록은 `ARCHITECTURE.md`와 `docs/`에 남긴다.
- `AGENTS.md`에는 상세 구현 사실을 누적하지 않는다.
- `docs/superpowers/`는 로컬 전용 작업 산출물이며 정식 문서가 아니다.
- 구조나 계약이 바뀌면 대응 문서를 같은 작업 안에서 함께 수정한다.
- 새 문서를 만들기 전에 기존 문서 책임 안에 흡수할 수 있는지 먼저 판단한다.

## 문서 갱신 규칙
- 라우트 구조가 바뀌면 `ARCHITECTURE.md`를 갱신한다.
- 디렉터리 책임이 바뀌면 `docs/architecture/directory-map.md`를 갱신한다.
- API 응답 규칙이나 공통 에러 처리 규칙이 바뀌면 `docs/frontend/runtime-contracts.md`를 갱신한다.
- 검증 명령이나 테스트 전략이 바뀌면 `docs/frontend/testing-and-verification.md`를 갱신한다.
- 런타임 초기화 경계가 바뀌면 `docs/architecture/runtime-boundaries.md`를 갱신한다.

## 하지 말아야 할 것
- `AGENTS.md`에 기능 상세 설명을 길게 적지 않는다.
- 임시 작업 계획을 정식 문서처럼 남기지 않는다.
- `README.md`를 source of truth로 사용하지 않는다.
- 같은 규칙을 여러 문서에 중복 작성하지 않는다.

## 정식 문서 맵
- `ARCHITECTURE.md`: 레포 구조와 시스템 큰 그림
- `docs/architecture/directory-map.md`: 디렉터리 책임과 탐색 기준
- `docs/architecture/runtime-boundaries.md`: 브라우저 런타임 경계
- `docs/frontend/runtime-contracts.md`: API/상태/공통 응답 계약
- `docs/frontend/testing-and-verification.md`: 검증 전략과 실행 기준
- `docs/process/documentation-rules.md`: 변경 시 함께 갱신할 문서 규칙
- `docs/process/workflow-conventions.md`: 브랜치/커밋 등 작업 컨벤션
