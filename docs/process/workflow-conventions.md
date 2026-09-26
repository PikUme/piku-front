# Workflow Conventions

## 목적
이 문서는 브랜치 이름과 커밋 메시지처럼 레포 작업 방식에 관한 기본 컨벤션을 정의한다.

## 브랜치 전략
- Linear 추적 작업은 `<type>/PIK-번호/<kebab-case-slug>`로 새 브랜치를 만든다.
- 기능 개발은 `feat/`를 사용한다. type은 `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` 중 선택한다.
- 예: `feat/PIK-27/request-id-logging`, `fix/PIK-29/desktop-sidebar-feedback`.
- `dev`·`main` 이름은 유지한다. 기존 브랜치의 자동 이름 변경·강제 푸시는 하지 않는다.
- 명시적으로 Linear 추적 없이 승인된 작업은 `<type>/<slug>`를 사용하고 이슈를 임의 생성하지 않는다.

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

## PR 식별과 Linear 자동 완료

- Linear 추적 PR 제목은 `[PIK-번호] 한국어 변경 요약`을 사용한다. 형식 예: `[PIK-27] 챕터형 회원가입 프론트엔드 디자인 및 구현`.
- 브랜치와 PR 제목의 ID는 실제 확인한 동일 담당 이슈를 가리킨다. PR 본문에는 Linear ID·URL·종료 참조를 넣지 않는다. 다른 담당 이슈를 함께 연결하지 않는다. ID 없는 기존 브랜치는 요청된 PR 제목으로 연결할 수 있지만 잘못된 ID가 있으면 먼저 해결한다.
- 필요한 검증·리뷰는 병합 전에 완료한다. Linear 기본 GitHub 연동의 대상 브랜치 `dev` 규칙에만 병합 시 Done을 설정한다. main·기본 병합 규칙은 No action으로 두고 설계 본문이 자동 댓글로 복제되지 않도록 Linkbacks를 끈다.
- 제출 후 Linear의 실제 PR 연동을 확인하고 완료 보고 전 병합과 이슈 상태를 다시 읽는다. 동일 담당 이슈의 필수 PR이 여러 개면 첫 병합 전에 전부 연결한다. 서로 다른 담당 이슈는 독립적으로 완료한다.
- 별도 동기화 스크립트·Actions workflow·API key secret·완료 JSON 댓글은 사용하지 않는다. 설정 안내 원본은 PM 저장소 `apfp77/pikume-pm`의 `docs/setup/linear-completion.md`다. 기존 CI workflow는 유지한다.
