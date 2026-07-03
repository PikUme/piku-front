# ARCHITECTURE.md

## 개요
이 레포는 `Next.js App Router` 기반의 프런트엔드 애플리케이션이다.
주요 사용자 흐름은 로그인/회원가입, 피드, 일기 작성 및 조회, 프로필, 알림으로 구성된다.
이 문서는 레포의 구조와 런타임 경계를 빠르게 이해하기 위한 요약 문서이며, 상세 계약은 `docs/`를 따른다.

## 최상위 구조

### `app/`
라우트 진입점을 둔다.
페이지 파일은 URL 구조를 정의하고, 실제 상호작용 로직은 가능한 한 `components/`로 위임한다.

### `components/`
도메인별 UI와 상호작용 로직을 둔다.
현재 주요 축은 `auth`, `diary`, `feed`, `notifications`, `profile`, `common`이다.

### `hooks/`
여러 화면에서 재사용 가능한 클라이언트 로직을 둔다.

### `lib/`
런타임 공통 모듈을 둔다.
`lib/api`는 HTTP 계약, `lib/auth`는 토큰/재발급 로직, `lib/sse`는 SharedWorker 기반 SSE 연결 경계, `lib/utils`는 공통 유틸리티를 담당한다.

### `types/`
공통 타입 계약을 둔다.

### `providers/`
앱 전역 Provider 구성을 둔다.

### `public/`
정적 자산을 둔다.

## 라우팅과 렌더링 원칙
- 라우트 진입점은 `app/`에 둔다.
- 페이지는 가능하면 얇게 유지하고, 실제 상호작용은 `components/`로 이동한다.
- 브라우저 전용 동작이 필요한 경우 클라이언트 컴포넌트 경계를 명시한다.
- 라우트 구조를 변경하면 URL 체계뿐 아니라 진입 책임과 연결 문서도 함께 점검한다.

## 상태와 데이터 흐름
- 서버 데이터 조회와 캐시는 주로 `React Query`가 담당한다.
- 앱 전역의 클라이언트 상태는 `Zustand`가 담당한다.
- HTTP 요청은 `lib/api/api.ts`와 각 도메인별 `lib/api/*`를 통해 수행한다.
- 인증 토큰과 재발급 흐름은 `lib/auth/tokenManager.ts`와 Axios 인터셉터가 함께 처리한다.
- SSE 서버 연결은 `lib/sse`의 SharedWorker 경계가 소유하고, 화면 상태 반영은 각 탭의 `notificationStore`가 담당한다.

대표 흐름:

`UI -> components/hooks -> lib/api -> backend`

`backend response -> React Query/Zustand -> UI`

## 런타임 경계
이 레포에는 브라우저 환경에 의존하는 초기화가 존재한다.

예:
- 인증 토큰 접근
- SSE 초기화
- FCM 초기화
- PWA 관련 처리
- 이미지 로딩 상태 처리

이런 로직은 브라우저 전용 실행 시점과 초기화 위치를 명확히 구분해야 하며, 상세 기준은 `docs/architecture/runtime-boundaries.md`를 따른다.

## 검증 진입점
- 정적 안정성 검증: `npx tsc --noEmit`
- 단위/컴포넌트 테스트: `npm run test:run`
- 브라우저 E2E: `npm run test:e2e`

어떤 변경에 어떤 검증이 필요한지는 `docs/frontend/testing-and-verification.md`를 따른다.

## 상세 문서
- `docs/architecture/directory-map.md`
- `docs/architecture/runtime-boundaries.md`
- `docs/architecture/sse-runtime.md`
- `docs/frontend/runtime-contracts.md`
- `docs/frontend/testing-and-verification.md`
- `docs/process/documentation-rules.md`
