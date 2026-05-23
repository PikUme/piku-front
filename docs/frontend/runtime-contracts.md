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
- 인증 상태는 `checking`, `authenticated`, `anonymous` 상태로 구분한다.
- `checking`은 토큰과 저장된 사용자 상태를 확인하거나, 토큰으로 현재 사용자를 복구하는 중인 상태이며, 이때는 로그인 화면으로 리다이렉트하지 않는다.
- 로그인이 필요한 화면은 공통 `RequireAuth` 가드를 통해 `anonymous`로 확정된 경우에만 로그인 화면으로 이동한다.
- access token은 공통 토큰 관리 모듈을 통해 접근한다.
- access token은 있지만 저장된 `user`가 없으면 `GET /auth/me`로 현재 사용자를 조회해 인증 상태를 복구한다.
- `GET /auth/me` 응답은 로그인 성공 응답의 `user`와 동일한 형태로 소비한다.
- 일반 API의 401 응답은 재발급 시도를 거친다.
- `/auth/login`, `/auth/reissue` 요청의 401 응답은 재발급 재시도 대상에서 제외한다.
- `/auth/me` 요청의 401 응답은 일반 API와 동일하게 재발급 시도 후 원 요청을 재시도한다.
- 토큰 재발급 요청의 네트워크 오류나 5xx 응답은 인증 실패로 간주하지 않으며, 기존 토큰을 즉시 삭제하지 않는다.
- 403 응답은 인증 실패로 간주하고 로그인 화면으로 이동한다.
- 로그인/회원가입/비밀번호 재설정은 공통 응답 형식을 기준으로 메시지를 표시한다.

## 알림 및 상호작용 패턴
- 읽음 처리와 unread count는 실패 시 상태가 어긋나지 않도록 함께 설계한다.
- 상세 이동을 수반하는 액션은 URL 계약과 함께 문서화한다.
- REPLY 알림은 페이지 이동 대신 일기 모달(데스크톱: `DiaryDetailModal`, 모바일: `DiaryStoryModal`)로 상세를 표시한다.
- 브라우저 뒤로가기는 현재 열린 모달 계층만 닫는다. 피드와 알림 페이지 모두 동일한 규칙을 따른다. 예: 피드 댓글은 피드로, 피드 일기 상세는 피드로, 알림 일기 상세는 알림으로 돌아간다.

## URL / 날짜 / 쿼리 파라미터 규칙
- 날짜 쿼리는 `YYYY-MM-DD` 형식을 기본으로 사용한다.
- ISO 전체 문자열을 직접 URL에 쓰지 않는다.
- 특정 상세 진입을 위한 쿼리 파라미터는 화면 초기화 후 정리 여부를 명시적으로 결정한다.

## 관련 문서
- `ARCHITECTURE.md`
- `docs/architecture/runtime-boundaries.md`
- `docs/frontend/testing-and-verification.md`
