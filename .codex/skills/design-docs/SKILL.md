---
name: design-docs
description: "Draft, revise, or review Korean design documents for piku-front feature and architecture work. Use when the user asks for a design doc, technical design, architecture plan, feature flow document, or 설계문서. Enforce Korean writing, no implementation code in the document, focus on feature behavior and architecture flow, and require a Korean commit message section."
---

# Design Docs

Use this skill when producing design documents for this repository. The output should help a reader understand what will change, why it changes, and how the feature and architecture flow through the system without prescribing implementation code.

## Context Order

Before writing, read only the documents needed for the requested scope and respect this priority:

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. Relevant `docs/**`
4. `README.md` only for human-facing overview, not as source of truth

For common scopes, check the matching docs:

- Route or page structure: `ARCHITECTURE.md`, `docs/architecture/directory-map.md`
- API response, auth, or state handling: `ARCHITECTURE.md`, `docs/frontend/runtime-contracts.md`
- Browser runtime initialization such as SSE, FCM, PWA, image loading, or browser-only setup: `ARCHITECTURE.md`, `docs/architecture/runtime-boundaries.md`
- Testing or verification strategy: `docs/frontend/testing-and-verification.md`
- Documentation or workflow rule changes: `docs/process/documentation-rules.md`, `docs/process/workflow-conventions.md`

## Required Workflow

1. Clarify the design scope when the request is ambiguous.
2. Identify the affected user flow, route area, state boundary, runtime boundary, and backend/API dependency.
3. Draft the design document in Korean around feature behavior and architecture flow, not implementation details.
4. Include a mandatory commit message section.
5. Save design documents under `docs/superpowers/plans`.
6. Review the document before delivery for code leakage, missing flow, missing validation, missing save location, and missing commit message.

## Writing Rules

- Do not include implementation code, code blocks, diffs, copyable snippets, component or hook bodies, or line-by-line patch instructions.
- Do not turn the document into a task checklist of exact code edits. Describe responsibilities and boundaries instead.
- Mention paths, modules, components, hooks, APIs, and commands only as references when they clarify architecture or verification.
- Prefer flow descriptions, sequence lists, state transition explanations, and interface responsibilities.
- Write design documents in Korean.
- Keep the document scoped to the requested design. Do not add unrelated refactors or broad rewrites.

## Save Location

Save every design document under `docs/superpowers/plans`.

Use a filename that makes the topic clear. If a date prefix is useful for sorting, keep it at the start of the filename. Do not save design documents under `docs/superpowers/specs` or general `docs/` unless the user explicitly overrides the location.

## Document Shape

Use sections that fit the request. For most feature design documents, include:

- 목적: the problem, user value, and non-goals.
- 현재 구조: the relevant existing route, component, hook, API, state, or runtime structure.
- 기능 흐름: the user-facing flow from entry point to completion.
- 아키텍처 흐름: how responsibility moves across page, component, hook, provider, state, API, and backend boundaries.
- 데이터와 상태: key data ownership, cache/state transitions, loading and error states.
- 런타임 경계: browser-only work, server/client boundary, initialization timing, and side effects when relevant.
- 영향 범위: affected routes, shared modules, contracts, and documents.
- 검증 기준: type check, tests, E2E, manual checks, and what each validates.
- 커밋 메시지: one required Korean commit message in `type: summary` form.

For small changes, compress sections, but keep 기능 흐름, 아키텍처 흐름, 검증 기준, and 커밋 메시지.

## Commit Message Requirement

Every design document must include a final `커밋 메시지` section.

The message must:

- Use the repository convention `type: summary`.
- Use a Korean summary.
- Match the document's actual design scope.

Example title text is acceptable as prose, such as `docs: 설계문서 작성 규칙 추가`, but do not add code snippets around it unless the user specifically asks for a reusable template.

## Review Checklist

Before finishing, verify:

- No implementation code, code block, diff, or copyable snippet is present.
- The feature flow explains what the user experiences.
- The architecture flow explains responsibility boundaries and data movement.
- Relevant runtime, API, auth, state, and document impacts are covered or explicitly out of scope.
- Validation criteria are concrete enough to execute later.
- The design document is saved under `docs/superpowers/plans` unless the user explicitly requested a different location.
- The `커밋 메시지` section exists and contains a Korean `type: summary` message.
- There are no placeholder markers or unresolved questions unless the document is explicitly a draft.
