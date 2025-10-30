# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

PikUme는 사용자가 AI와 함께 일상을 특별한 그림으로 기록하고 친구들과 공유할 수 있는 소셜 다이어리 서비스입니다. Next.js 15, React 19, TypeScript를 사용하여 구축된 PWA(Progressive Web App)입니다.

## 개발 환경 설정

### 필수 환경 변수

`.env.sample`을 참고하여 `.env.local` 파일을 생성하세요:

- `NEXT_PUBLIC_SERVER_URL`: 백엔드 API 서버 URL
- `NEXT_PUBLIC_BASE_URL`: 프론트엔드 기본 URL
- Firebase Cloud Messaging 관련 변수들 (FCM_API_KEY, FCM_PROJECT_ID 등)

### 주요 명령어

- `npm run dev`: Turbopack을 사용한 개발 서버 실행 (http://localhost:3000)
- `npm run build`: 프로덕션 빌드
- `npm start`: 프로덕션 서버 실행
- `npm run lint`: ESLint 코드 검사

참고: `predev`와 `prebuild` 스크립트는 자동으로 Firebase 서비스 워커 환경 변수를 주입합니다 (`scripts/inject-sw-env.cjs`).

## 아키텍처 원칙

### 1. 서버/클라이언트 컴포넌트 분리

- **`app/**/page.tsx`는 반드시 서버 컴포넌트로 유지**: 초기 로딩 성능 최적화를 위해 `'use client'` 지시어 사용 금지
- **클라이언트 로직 분리**: `useState`, `useEffect` 등이 필요한 경우 별도의 클라이언트 컴포넌트로 분리 (예: `components/auth/SignupClient.tsx`)
- 페이지는 서버 컴포넌트로 두고 실제 UI와 상태 관리는 클라이언트 컴포넌트에서 처리

### 2. API 요청 중앙화

- **모든 API 로직은 `lib/api/` 디렉토리에서 관리**
- 도메인별 파일 분리: `api/auth.ts`, `api/diary.ts`, `api/feed.ts`, `api/friend.ts` 등
- 컴포넌트에서 직접 `axios`나 `fetch` 호출 금지 - 반드시 `lib/api`의 함수 사용
- 중앙화된 axios 인스턴스 (`lib/api/api.ts`):
  - 자동 토큰 첨부 (Authorization Bearer)
  - 401 에러 시 자동 토큰 재발급 (`/auth/reissue`)
  - 403 에러 시 로그인 페이지로 리다이렉트
  - 토큰 재발급 중 실패한 요청 큐잉 처리

### 3. 상태 관리

- **Zustand 사용**: `components/store/`에 스토어 정의
  - `authStore.ts`: 인증 상태 (persist 미들웨어로 localStorage 동기화)
  - `notificationStore.ts`: 알림 상태
- **TanStack Query (React Query)**: 서버 상태 관리 (캐싱, 무효화, 백그라운드 동기화)
  - Provider: `providers/ReactQueryProvider.tsx`
  - DevTools는 개발 환경에서만 활성화

### 4. 타입 정의

- `types/` 디렉토리에 도메인별 타입 정의
- 주요 타입: `api.ts`, `auth.ts`, `diary.ts`, `friend.ts`, `notification.ts`, `profile.ts`, `comment.ts`
- `any` 타입 사용 지양, 불가피한 경우 주석으로 사유 명시

## 디렉토리 구조

```
app/              # Next.js App Router 페이지 (서버 컴포넌트)
components/       # 도메인별 UI 컴포넌트
  ├── auth/       # 인증 관련
  ├── diary/      # 일기 작성/관리
  ├── feed/       # 소셜 피드
  ├── friends/    # 친구 관리
  ├── common/     # 공통 컴포넌트
  └── store/      # Zustand 스토어
lib/
  ├── api/        # API 요청 함수들 (도메인별)
  ├── utils/      # 유틸리티 함수
  ├── policies/   # 정책 관련 로직
  └── constants.ts
hooks/            # 커스텀 훅
  ├── useCalendarNavigation.ts
  ├── useDiaryData.ts
  └── useFriendManagement.ts
types/            # TypeScript 타입 정의
providers/        # Context/Query Provider
config/           # Firebase 설정
scripts/          # 빌드/배포 스크립트
```

## 스타일링 가이드

- **Tailwind CSS 우선 사용**: 모든 스타일링은 유틸리티 클래스로 작성
- **반응형 디자인**:
  - CSS 속성 변경: Tailwind 반응형 접두사 (`md:`, `lg:`) 사용
  - 컴포넌트 구조 변경: `react-responsive`의 `useMediaQuery` 훅으로 조건부 렌더링
- **다크 모드 필수 지원**: 모든 UI는 `dark:` 접두사로 다크 모드 스타일 적용

## 인증 플로우

1. 로그인 시 access token은 `localStorage`에 저장 (`AUTH_TOKEN_KEY = 'am'`)
2. Refresh token은 HttpOnly 쿠키로 관리 (클라이언트에서 접근 불가)
3. API 요청 시 인터셉터가 자동으로 Authorization 헤더 첨부
4. 401 에러 발생 시:
   - `/auth/reissue` 엔드포인트로 토큰 재발급 요청
   - 성공 시 새 토큰으로 원래 요청 재시도
   - 실패 시 로그아웃 후 `/login`으로 리다이렉트

## PWA 설정

- `next-pwa`를 사용한 서비스 워커 자동 생성
- 개발 환경에서는 PWA 비활성화
- Firebase Cloud Messaging을 위한 커스텀 서비스 워커 (`firebase-messaging-sw.js`)는 빌드 전 스크립트로 환경 변수 주입

## 커밋 컨벤션

```
타입: 제목 #이슈번호

본문 (선택)
```

**타입**:

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 코드
- `chore`: 빌드/패키지 수정

**브랜치 전략**:

- `feature/기능명`, `fix/수정내용`, `docs/문서내용`, `refactor/리팩토링내용`

## 언어

- 모든 코드 주석, 커밋 메시지, PR 설명은 한국어로 작성
- AI 어시스턴트는 항상 한국어로 응답
