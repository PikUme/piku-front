# PikUme 모노레포

PikUme는 사용자가 AI와 함께 일상을 특별한 그림으로 기록하고 친구들과 공유할 수 있는 소셜 다이어리 서비스입니다.

## 프로젝트 구조

```
piku-front/
├── apps/
│   ├── web/          # Next.js 웹 애플리케이션
│   └── mobile/       # Expo 모바일 애플리케이션
├── packages/
│   ├── shared/       # 공통 타입 및 유틸리티
│   ├── config/       # ESLint, Tailwind 등 공통 설정
│   └── tsconfig/     # TypeScript 설정
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## 기술 스택

- **패키지 관리**: pnpm
- **빌드 시스템**: Turborepo
- **웹**: Next.js 15, React 19, TypeScript
- **모바일**: Expo, React Native
- **코드 품질**: ESLint, Prettier, Husky, lint-staged

## 시작하기

### 필수 요구사항

- Node.js >= 20
- pnpm >= 10

### 설치

```bash
pnpm install
```

### 개발 서버 실행

모든 앱을 동시에 실행:

```bash
pnpm dev
```

웹만 실행:

```bash
pnpm dev:web
```

모바일만 실행:

```bash
pnpm dev:mobile
```

### 빌드

모든 앱 빌드:

```bash
pnpm build
```

웹만 빌드:

```bash
pnpm build:web
```

### 기타 명령어

```bash
pnpm lint          # 린트 검사
pnpm format        # 코드 포맷팅
pnpm clean         # 빌드 파일 및 node_modules 삭제
```

## 워크스페이스

이 프로젝트는 pnpm 워크스페이스를 사용하여 여러 패키지를 관리합니다.

- `@piku/web` - Next.js 웹 앱
- `@piku/mobile` - Expo 모바일 앱
- `@piku/shared` - 공통 타입 및 유틸리티
- `@piku/config` - 공통 설정 파일
- `@piku/tsconfig` - TypeScript 설정

## 자세한 정보

각 앱의 자세한 정보는 해당 디렉토리의 README를 참조하세요:

- [웹 앱 README](./apps/web/README.md)
- [모바일 앱 README](./apps/mobile/README.md)
