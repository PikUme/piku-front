# Runtime Boundaries

## 목적
이 문서는 브라우저 전용 실행 경계와 초기화 위치를 정의한다.
서버/클라이언트 경계가 모호해질 때 이 문서를 기준으로 판단한다.

## 브라우저 전용 런타임 목록
- access token 조회와 저장
- SSE 연결 초기화
- FCM 초기화
- PWA 설치 프롬프트 처리
- `window`, `document`, `localStorage`, `Notification` 접근
- 이미지 로딩 상태와 브라우저 이벤트 처리

## 초기화 위치
- 인증 토큰 접근은 `lib/auth/tokenManager.ts`와 `components/store/authStore.ts` 경계 안에서 처리한다.
- 로그인 필요 화면의 진입 제어는 `components/auth/RequireAuth.tsx`에서 공통 처리한다.
- SSE 초기화는 `components/common/SSEInitializer.tsx`에서 시작한다.
- FCM 초기화는 `components/common/FCMInitializer.tsx`에서 시작한다.
- PWA 관련 UI는 `components/common/PWAInstallPrompt.tsx`, `components/common/PWAInstallButton.tsx`를 통해 노출한다.

## 서버/클라이언트 경계 규칙
- 브라우저 API를 사용하는 로직은 클라이언트 컴포넌트 또는 클라이언트 전용 모듈에 둔다.
- 서버 환경에서도 필요한 값은 브라우저 API 없이 계산 가능해야 한다.
- 브라우저 의존 초기화는 페이지 파일보다 전용 초기화 컴포넌트에 두는 편을 우선한다.

## 장애 시 기대 동작
- 인증 상태가 `checking`인 동안에는 보호 라우트가 로그인 화면으로 이동하지 않아야 한다.
- SSE 실패는 화면 전체를 깨뜨리지 않아야 한다.
- FCM 초기화 실패는 알림 기능 저하로 끝나야 하며, 핵심 화면 진입을 막지 않아야 한다.
- 이미지 로드 실패는 대체 UI 또는 안전한 비표시 상태로 수렴해야 한다.
- 토큰 재발급 실패는 인증 정리 후 로그인 화면으로 이동해야 한다.

## 검증 포인트
- 브라우저 전용 코드가 서버 경로에서 실행되지 않는지 확인한다.
- 초기화 실패 시 화면이 계속 사용 가능한지 확인한다.
- 인증 실패와 재발급 흐름이 깨지지 않는지 확인한다.
- 이미지 로딩 관련 상태가 빠른 새로고침이나 캐시된 이미지에서도 안정적인지 확인한다.

## 관련 문서
- `ARCHITECTURE.md`
- `docs/frontend/runtime-contracts.md`
- `docs/frontend/testing-and-verification.md`
