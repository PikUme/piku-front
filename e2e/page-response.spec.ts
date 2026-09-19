import { expect, test, type Page } from '@playwright/test';
import type { OffsetPageResponse } from '../types/api';
import type { Comment } from '../types/comment';
import type { Friend } from '../types/friend';

// HTTP responses are fixtures. These tests exercise the real UI/API adapters,
// not a running backend or production authentication.
const mockUser = {
  id: 'pagination-tester', email: 'pagination@example.test',
  nickname: '페이징 테스트', avatar: '/globe.svg',
};
const diary = {
  diaryId: 42, status: 'PUBLIC', content: '페이지 연동 테스트 일기',
  imgUrls: ['/globe.svg'], date: '2026-09-13',
  createdAt: '2026-09-13T09:00:00', nickname: mockUser.nickname,
  avatar: mockUser.avatar, userId: mockUser.id, commentCount: 17,
  likeCount: 3, isLiked: false, friendStatus: 'NONE', isOwner: true,
};

type PageCall = { path: string; page: number; size: number; keyword: string | null };
const makePage = <T,>(content: T[], number: number, size: number, totalElements: number): OffsetPageResponse<T> => {
  const sort = { empty: true, sorted: false, unsorted: true };
  const totalPages = Math.ceil(totalElements / size);
  return {
    content,
    pageable: { pageNumber: number, pageSize: size, sort, offset: number * size, paged: true, unpaged: false },
    last: number >= totalPages - 1,
    totalPages, totalElements, size, number, sort,
    first: number === 0, numberOfElements: content.length, empty: content.length === 0,
  };
};
const users = (prefix: string, length: number): Friend[] => Array.from({ length }, (_, index) => ({
  userId: `${prefix}-${index + 1}`, nickname: `${prefix} ${index + 1}`, avatar: '/globe.svg',
}));
const comments: Comment[] = Array.from({ length: 11 }, (_, index) => ({
  id: index + 1, diaryId: 42, userId: `commenter-${index + 1}`, nickname: `댓글 작성자 ${index + 1}`,
  avatar: '/globe.svg', content: `루트 댓글 ${index + 1}`, parentId: null,
  createdAt: '2026-09-13T09:00:00', replyCount: index === 0 ? 6 : 0,
  canReply: true, canEdit: false, canDelete: false,
}));
const replies: Comment[] = Array.from({ length: 6 }, (_, index) => ({
  ...comments[0], id: 101 + index, content: `대댓글 본문 ${index + 1}`,
  parentId: 1, replyCount: 0, canReply: false,
}));

const preparePages = async (page: Page) => {
  const calls: PageCall[] = [];
  await page.addInitScript(user => {
    localStorage.setItem('am', 'test-token');
    localStorage.setItem('auth-storage', JSON.stringify({ state: { isLoggedIn: true, user }, version: 0 }));
  }, mockUser);
  await page.route(url => !['127.0.0.1', 'localhost'].includes(url.hostname), route => route.abort());
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const pageNumber = Number(url.searchParams.get('page') || 0);
    const size = Number(url.searchParams.get('size') || 20);
    const data: Record<string, Friend[] | Comment[]> = {
      '/api/relation': users('친구', 22),
      '/api/relation/requests': users('받은 요청', 12),
      '/api/search': users('검색 결과', 22),
      '/api/comments': comments,
      '/api/comments/1/replies': replies,
    };
    let body: unknown;
    if (path in data) {
      calls.push({ path, page: pageNumber, size, keyword: url.searchParams.get('keyword') });
      const content = data[path];
      body = makePage<Friend | Comment>(content.slice(pageNumber * size, (pageNumber + 1) * size), pageNumber, size, content.length);
    } else if (path === '/api/diary') {
      body = { items: [diary], nextCursor: null, hasNext: false };
    } else if (path === '/api/diary/42') {
      body = diary;
    } else if (path === '/api/auth/me') {
      body = mockUser;
    } else {
      body = { ...makePage([], 0, 20, 0), items: [], count: 0, unreadCount: 0, hasNext: false };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return {
    calls,
    pages: (path: string) => calls.filter(call => call.path === path).map(call => call.page),
  };
};

// Move the last row out of and back into view after last=true. A remaining
// IntersectionObserver must not issue another request on this user scroll.
const scrollAfterLastPage = async (page: Page) => {
  await page.mouse.wheel(0, -10_000);
  await page.mouse.wheel(0, 10_000);
  await page.waitForTimeout(250);
};

test('친구 목록은 0, 1페이지를 추가하고 마지막 페이지 뒤에는 조회하지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const api = await preparePages(page);
  await page.goto('/friends');
  await expect(page.getByText('친구 1', { exact: true })).toBeVisible();
  expect(api.pages('/api/relation')).toEqual([0]);
  await page.getByText('친구 20', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText('친구 22', { exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: '친구 끊기', exact: true })).toHaveCount(22);
  await scrollAfterLastPage(page);
  expect(api.pages('/api/relation')).toEqual([0, 1]);
  expect(api.calls.filter(call => call.path === '/api/relation').map(call => call.size)).toEqual([20, 20]);
});

test('받은 요청은 서버의 전체 개수를 표시하고 0, 1페이지 뒤에 종료한다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  const api = await preparePages(page);
  await page.goto('/friends?tab=requests');
  await expect(page.getByRole('button', { name: '친구 요청 12', exact: true })).toBeVisible();
  await expect(page.getByText('받은 요청 1', { exact: true })).toBeVisible();
  expect(api.pages('/api/relation/requests')).toEqual([0]);
  await page.getByText('받은 요청 10', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText('받은 요청 12', { exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: '수락', exact: true })).toHaveCount(12);
  await scrollAfterLastPage(page);
  expect(api.pages('/api/relation/requests')).toEqual([0, 1]);
  expect(api.calls.filter(call => call.path === '/api/relation/requests').map(call => call.size)).toEqual([10, 10]);
});

test('검색은 0, 1페이지 뒤에 종료하며 검색어를 비우면 결과와 추가 조회를 지운다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const api = await preparePages(page);
  await page.goto('/search');
  const input = page.getByPlaceholder('닉네임을 입력하세요...');
  await input.fill('검색');
  await expect(page.getByText('검색 결과 1', { exact: true })).toBeVisible();
  expect(api.pages('/api/search')).toEqual([0]);
  await page.getByText('검색 결과 20', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText('검색 결과 22', { exact: true })).toBeAttached();
  await expect(page.getByRole('link').filter({ hasText: /^검색 결과 \d+$/ })).toHaveCount(22);
  await scrollAfterLastPage(page);
  expect(api.pages('/api/search')).toEqual([0, 1]);
  expect(api.calls.filter(call => call.path === '/api/search').map(call => call.keyword)).toEqual(['검색', '검색']);
  await input.fill('');
  await expect(page.getByText('검색어를 입력해주세요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: /^검색 결과 \d+$/ })).toHaveCount(0);
  await page.waitForTimeout(600); // longer than the search debounce
  expect(api.pages('/api/search')).toEqual([0, 1]);
});

for (const surface of ['모바일 직접 상세', '데스크톱 상세 모달', '모바일 스토리'] as const) {
  test(`${surface}에서 댓글과 답글을 다음 페이지까지 읽고 마지막에서 종료한다`, async ({ page }) => {
    await page.setViewportSize(surface === '데스크톱 상세 모달'
      ? { width: 1280, height: 900 } : { width: 360, height: 800 });
    const api = await preparePages(page);
    if (surface === '모바일 직접 상세') {
      await page.goto('/diary/42');
      await page.getByRole('article').getByRole('button', { name: '17', exact: true }).click();
    } else {
      await page.goto('/feed');
      await page.getByTestId('feed-card').getByRole('img', { name: 'Diary image', exact: true }).click();
      if (surface === '모바일 스토리') {
        await page.getByTestId('story-action-rail').getByRole('button', { name: '댓글 17개 보기', exact: true }).click();
      }
    }
    await expect(page.getByText('루트 댓글 1', { exact: true })).toBeVisible();
    expect(api.pages('/api/comments')).toEqual([0]);
    await page.getByRole('button', { name: /^(이전|다음) 댓글 더 보기$/ }).click();
    await expect(page.getByText('루트 댓글 11', { exact: true })).toBeAttached();
    await expect(page.getByText(/^루트 댓글 \d+$/, { exact: true })).toHaveCount(11);
    await expect(page.getByRole('button', { name: /^(이전|다음) 댓글 더 보기$/ })).toHaveCount(0);
    expect(api.pages('/api/comments')).toEqual([0, 1]);
    await page.getByRole('button', { name: '━━ 답글 보기 (6개)', exact: true }).click();
    await expect(page.getByText('대댓글 본문 1', { exact: true })).toBeVisible();
    expect(api.pages('/api/comments/1/replies')).toEqual([0]);
    await page.getByRole('button', { name: '답글 더 보기', exact: true }).click();
    await expect(page.getByText('대댓글 본문 6', { exact: true })).toBeAttached();
    await expect(page.getByRole('button', { name: '답글 더 보기', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '━━ 답글 숨기기', exact: true }).click();
    await page.getByRole('button', { name: '━━ 답글 보기 (6개)', exact: true }).click();
    await expect(page.getByText('대댓글 본문 6', { exact: true })).toBeAttached();
    await expect(page.getByText(/^대댓글 본문 \d+$/, { exact: true })).toHaveCount(6);
    expect(api.pages('/api/comments')).toEqual([0, 1]);
    expect(api.pages('/api/comments/1/replies')).toEqual([0, 1]);
  });
}
