---
description: 커밋 메시지를 작성할 때 따라야 할 커밋 컨벤션 규칙
---

# 커밋 컨벤션

## 타입

| 타입       | 설명                                                |
| ---------- | --------------------------------------------------- |
| `feat`     | 새로운 기능 추가                                    |
| `fix`      | 버그 수정                                           |
| `docs`     | 문서 수정                                           |
| `style`    | 코드 포맷팅, 세미콜론 누락 등 코드 변경이 없는 경우 |
| `refactor` | 코드 리팩토링                                       |
| `test`     | 테스트 코드, 리팩토링 테스트 코드 추가              |
| `chore`    | 빌드 업무 수정, 패키지 매니저 수정                  |

## 형식

```
<타입>: <설명>
```

- 스코프(`()`)는 사용하지 않음
- 설명은 반드시 **수행한 작업이 무엇인지** 명확하게 드러나야 함

## 필수 규칙

1. **파일명 나열 금지**: 변경된 파일명을 커밋 메시지에 나열하지 않는다. 변경한 대상이 아니라 **목적과 행위**를 서술한다.
2. **Phase 사용 금지**: `Phase 3`, `Phase 9`처럼 내부 작업 단위 명칭을 사용하지 않는다. 외부에서 봤을 때 의미가 없다.
3. **모호한 주제 표현 금지**: `주제: ~~` 형태의 서술을 하지 않는다. **무엇을 어떻게 했는지** 직접적으로 표현한다.
4. **git add -A 사용 금지**: 커밋 시 전체 변경사항을 추가하는 `git add -A` 또는 `git add .` 사용을 엄격히 금지한다. 반드시 작업한 대상 파일들만 명시적으로 `git add <file>` 형태로 추가해야 한다.

## 예시

```
# ✅ 좋은 예
refactor: Recommendation 모듈을 헥사고날 Port & Adapter 구조로 전환
test: User 모듈 Avatar VO 및 UserSearchService 누락 테스트 보완
feat: 추천 기반 피드 조회 기능 구현
refactor: Social 컨텍스트의 알림 직접 참조를 도메인 이벤트로 전환
fix: SSE 연결 시 Access Denied 발생하는 SecurityContext 전파 오류 수정

# ❌ 나쁜 예 — 파일명 나열
refactor: DiaryMetadata, UserPreference, ScoredDiary를 domain/으로 이동

# ❌ 나쁜 예 — Phase 사용
refactor: Phase 3 Recommendation 헥사고날 전환

# ❌ 나쁜 예 — 주제: 형태
refactor: 추천 모듈: 포트 정의 및 어댑터 구현

# ❌ 나쁜 예 — 의미 파악 불가
feat: DiaryService 추가
refactor: 코드 수정
fix: 버그 수정
```
