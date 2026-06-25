# Runtime Contracts

## 목적
이 문서는 프런트 런타임 계약의 source of truth다.
API 응답 형식, 상태 관리 경계, 인증/알림/URL 처리 규칙이 바뀌면 이 문서를 먼저 갱신한다.

## HTTP 계층 규칙
- 공통 Axios 설정은 `lib/api/api.ts`를 사용한다.
- 도메인별 요청 함수는 `lib/api/*` 아래에 둔다.
- 컴포넌트가 Axios 인스턴스를 직접 생성하지 않는다.
- 브라우저에서 보내는 백엔드 요청은 `localStorage`의 `vid`를 `vid` 헤더에 포함한다.
- `vid`가 없으면 최초 요청 시 UUID를 생성해 저장하며, 로그인이나 로그아웃과 무관하게 같은 값을 재사용한다.
- 공통 Axios 인스턴스를 우회하는 토큰 재발급, 인증 실패 로그아웃, SSE 요청에도 같은 `vid`를 포함한다.

## 응답 계약
- 사용자 메시지를 노출하는 성공 응답은 `MessageResponse` 형태를 우선 기준으로 본다.
- 실패 응답은 `ProblemDetail`을 우선 기준으로 본다.
- 사용자 노출 에러 메시지는 공통 파서를 우선 사용한다.
- 폼 validation 에러는 `fieldErrors`를 필드 단위로 소비한다.
- 일부 성공 응답은 body가 아니라 header 계약을 사용한다. 예: 토큰 재발급 성공은 `Authorization` 헤더에서 새 access token을 읽는다.

## 익명 일기 계약
- 일기 공개 범위는 `PUBLIC`, `FRIENDS`, `PRIVATE`, `ANONYMOUS`를 사용한다.
- 피드 목록과 일기 상세 응답은 모두 `isOwner`를 포함한다. 작성자 권한 판단은 `userId` 비교보다 `isOwner`를 우선한다.
- 익명 일기의 작성자 식별 필드는 생략되지 않고 `null`로 내려올 수 있다. 프런트 타입은 `userId`, `avatar`, `avatarUrl`, `diaryUserId`처럼 익명 정책의 영향을 받는 필드를 nullable로 둔다.
- 익명 일기에서 `friendStatus`가 `ANONYMOUS`이면 실제 친구 상태가 아니라 관계 상태 비노출 정책을 의미한다. 친구 추가, 요청 취소, 프로필 hover 같은 친구 관계 액션 분기와 분리해서 처리한다.
- 익명 작성자 영역은 프로필 링크, 프로필 hover card, 친구 액션을 만들지 않는다. 특히 `/profile/null` URL이 생성되면 안 된다.
- 댓글과 답글 응답은 `canReply`, `canEdit`, `canDelete`를 항상 포함한다. 댓글 액션 노출은 로그인 사용자와 `userId`를 비교한 결과가 아니라 서버 권한 필드를 우선한다.
- 댓글 낙관적 UI는 서버 응답으로 실제 작성 시각을 받기 전까지 작성 시간 대신 `게시중`을 표시한다.
- 익명 일기 댓글의 낙관적 UI는 서버 응답 전에도 작성자를 `익명`, 식별 필드를 `null`로 표시한다.
- 익명 LIKE/COMMENT 알림처럼 작성자 메타가 숨겨진 알림은 가능한 경우 `/diary/{diaryId}`로 이동하고, 프로필 캘린더 경로를 만들기 위한 작성자 조회를 하지 않는다.
- 프로필 preview의 `diaryCount`는 서버 값을 그대로 표시한다. 다른 사용자가 조회한 값에는 익명 일기가 제외되고, 본인이 본인 프로필을 조회한 값에는 익명 일기가 포함된다.

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
- FRIEND_REQUEST 알림은 `/friends?tab=requests`로 이동해 친구 요청 탭을 연다.
- REPLY와 FRIEND_DIARY 알림은 페이지 이동 대신 일기 모달(데스크톱: `DiaryDetailModal`, 모바일: `DiaryStoryModal`)로 상세를 표시한다.
- 브라우저 뒤로가기는 현재 열린 모달 계층만 닫는다. 피드와 알림 페이지 모두 동일한 규칙을 따른다. 예: 피드 댓글은 피드로, 피드 일기 상세는 피드로, 알림 일기 상세는 알림으로 돌아간다.

## 피드 정렬 계약
- `GET /api/diary`에 선택 쿼리 파라미터 `sort`를 보낸다.
- 피드 화면의 기본 정렬은 `latest`이며 `sort=latest`를 보낸다. `recommended`는 `sort` 파라미터를 생략한다.
- 다음 페이지 요청은 같은 `sort` 값에서 응답의 `nextCursor`를 전달한다.
- 정렬 변경 시 기존 `cursor`를 버리고 새 정렬 모드의 첫 페이지부터 요청한다. `feed`, `nextCursor`, `hasMore`, `error` 상태를 모두 초기화한다.
- 이미 선택된 정렬을 다시 선택하면 상태, URL 파라미터, 쿼리를 갱신하지 않는다.
- 알 수 없는 `sort` 값은 `400 Bad Request`(`type: feed/invalid-sort`)로 반환된다.
- 다른 정렬 모드의 cursor 재사용은 `400 Bad Request`(`type: feed/invalid-cursor`)로 반환된다.

## URL / 날짜 / 쿼리 파라미터 규칙
- 날짜 쿼리는 `YYYY-MM-DD` 형식을 기본으로 사용한다.
- ISO 전체 문자열을 직접 URL에 쓰지 않는다.
- 특정 상세 진입을 위한 쿼리 파라미터는 화면 초기화 후 정리 여부를 명시적으로 결정한다.

## 관련 문서
- `ARCHITECTURE.md`
- `docs/architecture/runtime-boundaries.md`
- `docs/frontend/testing-and-verification.md`
