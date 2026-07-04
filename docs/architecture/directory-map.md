# Directory Map

## 목적
이 문서는 `piku-front` 레포의 디렉터리 책임과 새 파일 배치 기준을 정의한다.
코드를 어느 위치에 두어야 하는지 애매할 때 이 문서를 기준으로 판단한다.

## 최상위 디렉터리 책임

### `app/`
- 라우트 진입점
- `page.tsx` 중심의 URL 구조 정의
- 상호작용 로직은 가능한 한 `components/`로 위임

### `components/`
- 도메인별 UI와 상호작용 로직
- `components/<domain>` 구조 유지
- 도메인 내부 테스트는 가능하면 `components/<domain>/__tests__`에 둔다

### `hooks/`
- 재사용 가능한 클라이언트 로직
- 특정 화면 전용이 아니라 둘 이상의 컴포넌트에서 공통으로 쓰는 로직 우선

### `lib/api/`
- HTTP 요청 함수
- 도메인별 API 모듈 분리
- 공통 Axios 설정은 `lib/api/api.ts`

### `lib/auth/`
- 토큰 접근, 재발급, 인증 실패 처리

### `lib/sse/`
- SharedWorker 기반 SSE 연결 관리
- 탭과 worker 사이의 메시지 계약
- SSE unread count 브로드캐스트와 직접 연결 fallback 보조

### `lib/metadata/`
- 페이지별 SEO 메타데이터 생성
- canonical, `og:url`, OG 사이트 정보, Twitter Card 공통 계약
- 모든 공개 페이지가 기본 공유 이미지를 잃지 않도록 공통 OG/Twitter 이미지 URL 정의

### `lib/utils/`
- 순수 유틸리티 또는 프레임워크 비의존 공통 함수

### `components/store/`
- 전역 클라이언트 상태를 위한 `Zustand` 스토어

### `providers/`
- 앱 전역 Provider 구성
- React Query 같은 전역 래퍼를 둔다

### `types/`
- 공통 타입 계약

### `public/`
- 정적 자산
- 빌드 없이 직접 제공되는 이미지와 아이콘 자산

### `e2e/`
- Playwright 브라우저 테스트

### `scripts/`
- 로컬 개발과 빌드 보조 스크립트

## 하위 구조 관례
- 새 도메인 UI는 기존 도메인 폴더 안에 먼저 흡수 가능한지 검토한다.
- 페이지에서만 쓰는 컴포넌트라도 도메인 책임이 명확하면 `components/<domain>` 아래에 둔다.
- 테스트는 대상 코드와 가능한 한 가깝게 둔다.

## 새 파일 추가 기준
- 새 URL이 필요하면 `app/`에 추가한다.
- 새 공개 페이지 메타데이터는 `lib/metadata`의 공통 생성기를 우선 사용한다.
- 새 상호작용 UI는 `components/`에 추가한다.
- 여러 화면이 공유하는 로직만 `hooks/`로 올린다.
- HTTP 통신은 `lib/api/` 외부에서 직접 정의하지 않는다.
- 브라우저 전용 전역 상태만 `components/store/`에 둔다.

## 구조 냄새 신호
- 하나의 파일이 라우트 정의, API 호출, 복잡한 UI 상태를 모두 담당한다.
- `components/`와 `lib/`의 경계가 모호해진다.
- 테스트가 도메인과 멀리 떨어져 유지 비용이 높아진다.
- 새 기능마다 최상위 디렉터리를 습관적으로 추가한다.

## 관련 문서
- `ARCHITECTURE.md`
- `docs/architecture/runtime-boundaries.md`
- `docs/architecture/sse-runtime.md`
- `docs/frontend/runtime-contracts.md`
