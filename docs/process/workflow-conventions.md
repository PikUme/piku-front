# Workflow Conventions

## 목적
이 문서는 브랜치 이름과 커밋 메시지처럼 레포 작업 방식에 관한 기본 컨벤션을 정의한다.

## 브랜치 전략
- 기능 단위로 브랜치를 생성해 작업한다.
- 기본 브랜치 접두사는 아래를 사용한다.
  - `feature/`
  - `fix/`
  - `docs/`
  - `refactor/`
  - `test/`
  - `chore/`

예:
- `feature/login`
- `fix/notification-routing`
- `docs/harness-structure`

## 커밋 메시지 형식
- 커밋 메시지는 `type: summary` 형식을 기본으로 사용한다.
- `summary`는 변경 의도가 바로 보이게 짧게 적는다.
- 이슈 번호가 필요한 팀 흐름이 있으면 제목 뒤에 추가할 수 있지만, 이 문서는 형식을 강제하지 않는다.

예:
- `feat: add notification routing fallback`
- `fix: validate profile calendar date`
- `docs: add harness documentation structure`

## 타입 기준
- `feat`: 사용자 가치가 생기는 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 동작 변화 없는 표현 수정
- `refactor`: 동작 유지 리팩터링
- `test`: 테스트 추가 또는 정리
- `chore`: 빌드, 설정, 도구 작업

## 관련 문서
- `AGENTS.md`
- `docs/process/documentation-rules.md`
