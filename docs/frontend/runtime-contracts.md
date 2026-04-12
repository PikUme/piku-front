# Runtime Contracts

## 목적
이 문서는 프런트 런타임 계약의 source of truth다.
API 응답 형식, 상태 관리 경계, 인증/알림/URL 처리 규칙이 바뀌면 이 문서를 먼저 갱신한다.

## HTTP 계층 규칙
- 공통 Axios 설정은 `lib/api/api.ts`를 사용한다.
- 도메인별 요청 함수는 `lib/api/*` 아래에 둔다.
- 컴포넌트가 Axios 인스턴스를 직접 생성하지 않는다.

## 응답 계약
- 사용자 메시지를 노출하는 성공 응답은 `MessageResponse` 형태를 우선 기준으로 본다.
- 실패 응답은 `ProblemDetail`을 우선 기준으로 본다.
- 사용자 노출 에러 메시지는 공통 파서를 우선 사용한다.
- 폼 validation 에러는 `fieldErrors`를 필드 단위로 소비한다.
- 일부 성공 응답은 body가 아니라 header 계약을 사용한다. 예: 토큰 재발급 성공은 `Authorization` 헤더에서 새 access token을 읽는다.

## 상태 관리 경계
- 서버 데이터 조회와 캐시는 `React Query`가 담당한다.
- 전역 클라이언트 상태는 `Zustand`가 담당한다.
- 서버 응답을 로컬 전역 스토어에 그대로 복제하지 않는다.
- `authStore`, `notificationStore`처럼 화면 간 공유가 필요한 상태만 스토어에 둔다.

## 인증 계약
- access token은 공통 토큰 관리 모듈을 통해 접근한다.
- 일반 API의 401 응답은 재발급 시도를 거친다.
- `/auth/login`, `/auth/reissue` 요청의 401 응답은 재발급 재시도 대상에서 제외한다.
- 403 응답은 인증 실패로 간주하고 로그인 화면으로 이동한다.
- 로그인/회원가입/비밀번호 재설정은 공통 응답 형식을 기준으로 메시지를 표시한다.

## 알림 및 상호작용 패턴
- 읽음 처리와 unread count는 실패 시 상태가 어긋나지 않도록 함께 설계한다.
- 상세 이동을 수반하는 액션은 URL 계약과 함께 문서화한다.

## URL / 날짜 / 쿼리 파라미터 규칙
- 날짜 쿼리는 `YYYY-MM-DD` 형식을 기본으로 사용한다.
- ISO 전체 문자열을 직접 URL에 쓰지 않는다.
- 특정 상세 진입을 위한 쿼리 파라미터는 화면 초기화 후 정리 여부를 명시적으로 결정한다.

## 관련 문서
- `ARCHITECTURE.md`
- `docs/architecture/runtime-boundaries.md`
- `docs/frontend/testing-and-verification.md`
