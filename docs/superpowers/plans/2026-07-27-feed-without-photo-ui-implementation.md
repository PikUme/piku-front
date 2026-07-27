# 사진 없는 피드 카드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사진 URL이 없는 피드 일기를 placeholder 이미지 없이 `15px` 텍스트 중심 카드로 표시하고, 긴 본문을 다섯 줄에서 접어 같은 카드 안에서 펼칠 수 있게 한다.

**Architecture:** `FeedClient`의 데이터와 이벤트 흐름은 유지하고 `FeedCard`가 현재 이미지 URL의 존재 여부로 이미지형과 텍스트형 주 콘텐츠를 선택한다. 사진 없는 본문의 줄 넘침과 펼침 여부는 `FeedCard`의 로컬 상태로 관리하며, 실제 렌더링 높이는 클라이언트에서 측정한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Vitest 4, Testing Library

## Global Constraints

- 모든 구현은 별도 git worktree와 `feature/feed-without-photo-card` 브랜치에서 수행한다.
- 모든 `npm`, `npx`, Node 기반 검증 명령은 `PATH=/Users/yk/.nvm/versions/node/v24.12.0/bin:$PATH`를 앞에 두고 Node 24.12.0으로 실행한다. 시스템 기본 Node 26은 Vitest의 JSDOM `localStorage`를 덮어써 기준선 테스트를 실패시킨다.
- production code를 작성하기 전에 해당 동작을 검증하는 테스트를 먼저 추가하고 예상한 이유로 실패하는지 확인한다.
- 사진 없는 본문의 글자 크기는 `15px`, 기본 최대 노출은 다섯 줄이다.
- 사진이 없으면 외부 placeholder URL, 빈 이미지, 캐러셀 화살표와 페이지 점을 렌더링하지 않는다.
- 긴 본문의 `더 보기`는 상세 모달을 열지 않고 같은 카드 안에서 전문을 펼친다.
- 사진이 있는 카드의 이미지, 캐러셀, 기존 한 줄 본문과 `더 보기` 동작은 유지한다.
- 작성자, 익명 작성자, 친구 액션, 좋아요, 댓글, 댓글 입력 흐름은 변경하지 않는다.
- API, `FeedDiary` 타입, React Query, Zustand, URL 구조와 정식 아키텍처 문서는 변경하지 않는다.
- 각 task가 green이 된 뒤 요구사항 리뷰와 코드 품질 리뷰를 순서대로 수행하고, 리뷰 수정은 회귀 테스트를 먼저 추가한 뒤 반영한다.

---

### Task 1: 사진 유무에 따른 피드 카드 주 콘텐츠 분기

**Files:**
- Modify: `components/feed/FeedCard.tsx`
- Test: `components/feed/__tests__/FeedCard.test.tsx`

**Interfaces:**
- Consumes: `FeedDiary.imgUrls: string[]`, 기존 `FeedCardProps.onContentClick: () => void`
- Produces: 사진이 있으면 기존 이미지형 영역, 사진이 없으면 `오늘의 일기` 라벨과 텍스트형 상세 보기 영역

- [ ] **Step 1: 사진 없는 카드와 사진 카드 회귀 테스트를 먼저 작성한다**

`components/feed/__tests__/FeedCard.test.tsx`에 피드 카드 공통 렌더 helper와 다음 테스트를 추가한다.

```tsx
const renderFeedCard = (
  post: FeedDiary,
  overrides: Partial<React.ComponentProps<typeof FeedCard>> = {},
) => {
  const props: React.ComponentProps<typeof FeedCard> = {
    post,
    onFriendshipStatusChange: vi.fn(),
    onContentClick: vi.fn(),
    onCommentClick: vi.fn(),
    onLikeToggle: vi.fn(),
    isMobile: false,
    ...overrides,
  };

  return {
    ...render(<FeedCard {...props} />),
    props,
  };
};

describe('FeedCard 사진 없는 일기', () => {
  it('사진이 없으면 이미지 대신 텍스트 본문을 표시한다', () => {
    renderFeedCard(
      makePost({
        imgUrls: [],
        content: '사진 없이 남기는 오늘의 기록',
      }),
    );

    expect(
      screen.queryByRole('img', { name: 'Diary image' }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('img[src="https://via.placeholder.com/600"]'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('오늘의 일기')).toBeInTheDocument();
    expect(
      screen.getByText('사진 없이 남기는 오늘의 기록'),
    ).toBeInTheDocument();
  });

  it('사진 없는 본문에서 일기 상세 보기를 선택할 수 있다', () => {
    const onContentClick = vi.fn();
    renderFeedCard(makePost({ imgUrls: [] }), { onContentClick });

    fireEvent.click(screen.getByRole('button', { name: '일기 상세 보기' }));

    expect(onContentClick).toHaveBeenCalledTimes(1);
  });

  it('사진이 있으면 기존 이미지 카드를 유지한다', () => {
    renderFeedCard(
      makePost({ imgUrls: ['https://example.com/original.png'] }),
    );

    expect(screen.getByRole('img', { name: 'Diary image' })).toHaveAttribute(
      'src',
      'https://example.com/original.png',
    );
    expect(screen.queryByText('오늘의 일기')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 신규 테스트가 기능 부재로 실패하는지 확인한다**

Run:

```bash
npm run test:run -- components/feed/__tests__/FeedCard.test.tsx
```

Expected:

- 사진 없는 fixture에서도 `Diary image`가 렌더링되어 첫 테스트가 실패한다.
- `오늘의 일기`와 `일기 상세 보기`가 없어 텍스트 카드 테스트가 실패한다.
- 기존 사진 카드 회귀 테스트는 통과한다.

- [ ] **Step 3: 사진 유무 분기를 최소 구현한다**

`FeedCard`의 fallback URL을 제거하고 현재 이미지 URL을 다음 책임으로 해석한다.

```tsx
const photoUrl =
  post.imgUrls[currentImageIndex] ?? post.imgUrls[0];
```

현재 이미지·캐러셀 영역을 `photoUrl`이 존재할 때만 렌더링하고, 반대 분기에는 다음 텍스트형 주 콘텐츠를 배치한다.

```tsx
{photoUrl ? (
  <div {...swipeHandlers} className="relative aspect-square w-full">
    <div
      className="h-full w-full cursor-pointer"
      onClick={onContentClick}
    >
      <Image
        src={photoUrl}
        alt="Diary image"
        fill
        className="rounded"
        style={{ objectFit: 'cover' }}
        priority
      />
    </div>
    {post.imgUrls.length > 1 && (
      <>
        {currentImageIndex > 0 && (
          <button
            onClick={handlePrevImage}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/75"
          >
            <ChevronLeft size={20} className="cursor-pointer" />
          </button>
        )}
        {currentImageIndex < post.imgUrls.length - 1 && (
          <button
            onClick={handleNextImage}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/75"
          >
            <ChevronRight size={20} className="cursor-pointer" />
          </button>
        )}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 space-x-1.5">
          {post.imgUrls.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentImageIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </>
    )}
  </div>
) : (
  <div className="border-y border-gray-100 px-5 py-6 dark:border-gray-700">
    <button
      type="button"
      aria-label="일기 상세 보기"
      onClick={onContentClick}
      className="block w-full text-left"
    >
      <span className="flex items-center gap-2 text-[10px] font-semibold tracking-wide text-amber-700 dark:text-yellow-300">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-yellow-400"
        />
        오늘의 일기
      </span>
      <span className="mt-3 block whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-gray-900 dark:text-gray-100">
        {post.content}
      </span>
    </button>
  </div>
)}
```

기존 작성자 닉네임과 한 줄 본문 영역은 사진 카드에서만 렌더링해 사진 없는 본문이 중복되지 않게 한다.

```tsx
{photoUrl && (
  <div className="px-3">
    {isContentExpanded ? (
      <p className="whitespace-pre-wrap text-sm">
        {isAnonymousPost ? (
          <span className="mr-1 font-semibold">{displayNickname}</span>
        ) : (
          <Link
            href={`/profile/${post.userId}`}
            className="mr-1 font-semibold hover:underline"
            onClick={event => event.stopPropagation()}
          >
            {displayNickname}
          </Link>
        )}{' '}
        {post.content}
      </p>
    ) : (
      <div className="flex items-baseline text-sm">
        <p className="truncate">
          {isAnonymousPost ? (
            <span className="mr-1 font-semibold">{displayNickname}</span>
          ) : (
            <Link
              href={`/profile/${post.userId}`}
              className="mr-1 font-semibold hover:underline"
              onClick={event => event.stopPropagation()}
            >
              {displayNickname}
            </Link>
          )}{' '}
          <span>{post.content}</span>
        </p>
        {post.content.length > 30 && (
          <button
            onClick={event => {
              event.stopPropagation();
              setIsContentExpanded(true);
            }}
            className="ml-1 flex-shrink-0 cursor-pointer text-gray-500"
          >
            더 보기
          </button>
        )}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: targeted 테스트를 다시 실행해 green을 확인한다**

Run:

```bash
npm run test:run -- components/feed/__tests__/FeedCard.test.tsx
```

Expected: `FeedCard.test.tsx`의 기존 테스트와 신규 사진 유무 테스트가 모두 PASS한다.

- [ ] **Step 5: Task 1 요구사항 리뷰를 수행한다**

다음 항목을 `git diff -- components/feed/FeedCard.tsx components/feed/__tests__/FeedCard.test.tsx`로 대조한다.

- 빈 `imgUrls`에서 이미지 요소와 `https://via.placeholder.com/600` 요청 경로가 제거되었다.
- 사진 카드의 `next/image`, swipe handler, 이전/다음 버튼, 페이지 점 조건이 유지되었다.
- 사진 없는 카드 본문은 한 번만 표시된다.
- 좋아요·댓글·친구·익명 처리 코드는 변경되지 않았다.

Run:

```bash
git diff --check
npm run test:run -- components/feed/__tests__/FeedCard.test.tsx
```

Expected: 공백 오류가 없고 targeted 테스트가 모두 PASS한다.

- [ ] **Step 6: Task 1을 커밋한다**

```bash
git add components/feed/FeedCard.tsx components/feed/__tests__/FeedCard.test.tsx
git commit -m "feat: 사진 없는 피드에 텍스트 카드 표시"
```

---

### Task 2: 다섯 줄 넘침 판별과 카드 내부 펼치기

**Files:**
- Modify: `components/feed/FeedCard.tsx`
- Test: `components/feed/__tests__/FeedCard.test.tsx`

**Interfaces:**
- Consumes: 사진 없는 본문 요소의 `scrollHeight`, `clientHeight`, 브라우저 `resize` 이벤트
- Produces: 실제 다섯 줄을 넘는 경우에만 노출되는 `더 보기`, 카드 내부 전문 펼침, 접근성 상태 안내

- [ ] **Step 1: 넘침 여부와 펼침 동작의 실패 테스트를 작성한다**

`FeedCard.test.tsx`의 사진 없는 일기 describe에 다음 테스트를 추가한다. DOM 높이는 실제 본문 요소에만 지정하고, resize 이벤트로 사용자가 폭을 변경한 것과 같은 재측정을 실행한다.

```tsx
it('다섯 줄을 넘는 본문만 더 보기로 카드 안에서 펼친다', async () => {
  const longContent =
    '아무 약속도 없는 하루를 천천히 보냈다. '.repeat(20).trim();
  const onContentClick = vi.fn();
  renderFeedCard(makePost({ imgUrls: [], content: longContent }), {
    onContentClick,
  });

  const content = screen.getByText(longContent);
  Object.defineProperty(content, 'scrollHeight', {
    configurable: true,
    value: 140,
  });
  Object.defineProperty(content, 'clientHeight', {
    configurable: true,
    value: 100,
  });

  fireEvent.resize(window);

  const moreButton = await screen.findByRole('button', { name: '더 보기' });
  expect(content).toHaveClass('text-[15px]', 'line-clamp-5');
  expect(moreButton).toHaveAttribute(
    'aria-controls',
    'feed-text-content-1',
  );
  expect(moreButton).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(moreButton);

  expect(onContentClick).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('button', { name: '더 보기' }),
  ).not.toBeInTheDocument();
  expect(content).not.toHaveClass('line-clamp-5');
  expect(
    screen.getByRole('status', { name: '일기 전체 내용이 펼쳐졌습니다.' }),
  ).toBeInTheDocument();
});

it('다섯 줄을 넘지 않는 본문에는 더 보기를 표시하지 않는다', () => {
  const contentText = '짧은 일기';
  renderFeedCard(makePost({ imgUrls: [], content: contentText }));

  const content = screen.getByText(contentText);
  Object.defineProperty(content, 'scrollHeight', {
    configurable: true,
    value: 80,
  });
  Object.defineProperty(content, 'clientHeight', {
    configurable: true,
    value: 80,
  });

  fireEvent.resize(window);

  expect(
    screen.queryByRole('button', { name: '더 보기' }),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 신규 테스트가 더 보기 기능 부재로 실패하는지 확인한다**

Run:

```bash
npm run test:run -- components/feed/__tests__/FeedCard.test.tsx
```

Expected: 긴 사진 없는 본문에서 `더 보기` 버튼을 찾지 못해 첫 신규 테스트가 FAIL한다.

- [ ] **Step 3: 본문 측정과 펼침 상태를 최소 구현한다**

React import에 `useEffect`를 추가하고 텍스트 본문용 ref와 상태를 `FeedCard` 내부에 둔다.

```tsx
const textContentRef = useRef<HTMLSpanElement>(null);
const [isTextOverflowing, setIsTextOverflowing] = useState(false);
```

사진 없는 접힌 본문의 실제 높이를 최초 렌더링과 resize 때 측정한다. 펼친 뒤에는 측정 listener를 제거한다.

```tsx
useEffect(() => {
  if (photoUrl || isContentExpanded) {
    return;
  }

  const updateTextOverflow = () => {
    const element = textContentRef.current;
    if (!element) return;
    setIsTextOverflowing(element.scrollHeight > element.clientHeight);
  };

  updateTextOverflow();
  window.addEventListener('resize', updateTextOverflow);
  return () => window.removeEventListener('resize', updateTextOverflow);
}, [photoUrl, post.content, isContentExpanded]);
```

사진 없는 본문 요소에는 안정적인 id, ref, 다섯 줄 clamp를 연결한다.

```tsx
<span
  id={`feed-text-content-${post.diaryId}`}
  ref={textContentRef}
  className={`mt-3 block whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-gray-900 dark:text-gray-100 ${
    isContentExpanded ? '' : 'line-clamp-5'
  }`}
>
  {post.content}
</span>
```

텍스트 상세 보기 버튼의 형제 요소로 `더 보기`를 배치해 상세 열기 click과 중첩되지 않게 한다.

```tsx
{isTextOverflowing && !isContentExpanded && (
  <button
    type="button"
    aria-controls={`feed-text-content-${post.diaryId}`}
    aria-expanded={isContentExpanded}
    onClick={() => setIsContentExpanded(true)}
    className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
  >
    더 보기
  </button>
)}
{isContentExpanded && !photoUrl && (
  <span
    role="status"
    aria-label="일기 전체 내용이 펼쳐졌습니다."
    className="sr-only"
  >
    일기 전체 내용이 펼쳐졌습니다.
  </span>
)}
```

- [ ] **Step 4: targeted 테스트를 실행해 green을 확인한다**

Run:

```bash
npm run test:run -- components/feed/__tests__/FeedCard.test.tsx
```

Expected: 사진 없는 본문의 긴 글, 짧은 글, 사진 카드 회귀와 기존 `FeedCard` 테스트가 모두 PASS한다.

- [ ] **Step 5: Task 2 요구사항과 코드 품질 리뷰를 수행한다**

요구사항 리뷰:

- 사진 없는 본문만 `15px`와 최대 다섯 줄을 적용한다.
- 실제 `scrollHeight > clientHeight`인 경우에만 `더 보기`가 보인다.
- `더 보기`는 상세 모달을 열지 않고 같은 카드에서 clamp를 제거한다.
- 사진 카드의 기존 30자 기준 `더 보기`는 그대로 유지한다.

코드 품질 리뷰:

- window resize listener가 unmount와 펼침 전환 때 정리된다.
- id가 `diaryId`를 포함해 피드 안에서 충돌하지 않는다.
- ref와 넘침 상태가 API나 전역 store로 이동하지 않는다.
- `더 보기`와 일기 상세 보기 버튼이 중첩되지 않는다.
- 테스트는 실제 `FeedCard`를 렌더링하고 사용자에게 보이는 요소와 callback을 검증한다.

Run:

```bash
git diff --check
npm run test:run -- components/feed/__tests__/FeedCard.test.tsx
```

Expected: 공백 오류가 없고 targeted 테스트가 모두 PASS한다.

- [ ] **Step 6: Task 2를 커밋한다**

```bash
git add components/feed/FeedCard.tsx components/feed/__tests__/FeedCard.test.tsx
git commit -m "feat: 사진 없는 피드 긴 글 펼치기 추가"
```

---

### Task 3: 반복 리뷰와 전체 회귀 검증

**Files:**
- Review: `components/feed/FeedCard.tsx`
- Review: `components/feed/__tests__/FeedCard.test.tsx`
- Reference: `docs/superpowers/plans/2026-07-27-feed-without-photo-ui-design.md`

**Interfaces:**
- Consumes: Task 1과 Task 2의 두 기능 커밋
- Produces: 설계 대비 누락이 없고 전체 테스트와 타입 검사를 통과한 최종 브랜치

- [ ] **Step 1: 첫 번째 최종 리뷰로 설계 요구사항을 역추적한다**

Run:

```bash
git diff dev...HEAD -- components/feed/FeedCard.tsx components/feed/__tests__/FeedCard.test.tsx
```

다음 mutation을 각 테스트가 잡는지 확인한다.

- 사진 유무 분기가 반대로 바뀌면 사진 없는 카드 테스트가 실패한다.
- placeholder fallback이 다시 추가되면 이미지 부재 테스트가 실패한다.
- 텍스트 카드가 다시 한 줄 또는 정사각형 높이가 되면 다섯 줄·이미지 부재 검증이 실패한다.
- `더 보기`가 상세 callback까지 호출하면 callback 미호출 검증이 실패한다.
- 사진 카드 분기를 제거하면 기존 이미지 회귀 테스트가 실패한다.

- [ ] **Step 2: targeted 테스트와 타입 검사를 실행한다**

Run:

```bash
npm run test:run -- components/feed/__tests__/FeedCard.test.tsx
npx tsc --noEmit
```

Expected: 모든 `FeedCard` 테스트가 PASS하고 TypeScript 오류가 0개다.

- [ ] **Step 3: 두 번째 리뷰로 렌더링·접근성·회귀 위험을 점검한다**

다음 항목을 실제 코드와 테스트에서 확인한다.

- 사진 없는 카드에 작성자 헤더, 좋아요, 댓글, 댓글 입력이 모두 남아 있다.
- 익명 작성자와 친구 버튼 조건이 기존 테스트를 계속 통과한다.
- `더 보기`가 실제 button이고 `aria-controls`, `aria-expanded`를 제공한다.
- 펼침 완료 상태가 보조기기에 전달된다.
- 다크 모드 class가 텍스트, 라벨, 경계에 존재한다.
- 외부 placeholder는 친구 확인 모달의 avatar fallback 외에는 남아 있지 않다.

리뷰에서 동작 결함을 발견하면 해당 결함을 재현하는 실패 테스트를 먼저 추가하고, 예상 실패를 확인한 뒤 최소 수정과 targeted 테스트를 반복한다. 리뷰 수정 커밋이 필요하면 다음 메시지를 사용한다.

```bash
git add components/feed/FeedCard.tsx components/feed/__tests__/FeedCard.test.tsx
git commit -m "fix: 사진 없는 피드 카드 리뷰 반영"
```

- [ ] **Step 4: 전체 컴포넌트 회귀 테스트를 실행한다**

Run:

```bash
npm run test:run
git diff --check
git status --short
```

Expected:

- 전체 Vitest suite가 PASS한다.
- `git diff --check`가 출력 없이 종료된다.
- 구현 브랜치의 작업 트리가 깨끗하다.

- [ ] **Step 5: 최종 커밋 범위와 브랜치 상태를 확인한다**

Run:

```bash
git log --oneline --decorate dev..HEAD
git diff --stat dev...HEAD
```

Expected:

- 구현 계획 문서 이후 기능 커밋 2개와 필요한 경우 리뷰 수정 커밋 1개만 존재한다.
- 변경 범위는 `FeedCard`, 인접 테스트, 승인된 설계·구현 계획 문서에 한정된다.
