import { expect, test, type Page } from '@playwright/test';

const mockUser = {
  id: 'test-user',
  email: 'tester@example.com',
  nickname: 'Tester',
  avatar: '/globe.svg',
};

const createFeedItem = (diaryId: number) => ({
  diaryId,
  status: 'PUBLIC',
  content: `피드 카드 ${diaryId}`,
  imgUrls: ['/globe.svg'],
  date: '2026-07-18',
  nickname: '익명',
  avatar: null,
  userId: null,
  createdAt: '2026-07-18T12:00:00',
  commentCount: 0,
  likeCount: 0,
  isLiked: false,
  friendStatus: 'NONE',
  isOwner: false,
});

const prepareLoggedInFeed = async (page: Page) => {
  await page.addInitScript(user => {
    localStorage.setItem('am', 'test-token');
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          isLoggedIn: true,
          user,
        },
        version: 0,
      }),
    );
  }, mockUser);

  let releaseResponse = () => {};
  const responseGate = new Promise<void>(resolve => {
    releaseResponse = resolve;
  });

  await page.route('**/api/diary**', async route => {
    await responseGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [createFeedItem(1), createFeedItem(2)],
        nextCursor: null,
        hasNext: false,
      }),
    });
  });

  return releaseResponse;
};

for (const testCase of [
  { name: '데스크톱', viewport: { width: 1280, height: 900 } },
  { name: '모바일', viewport: { width: 390, height: 844 } },
]) {
  test(`로그인 사용자의 ${testCase.name} 피드에서 스켈레톤과 실제 카드 크기가 같다`, async ({
    page,
  }) => {
    await page.setViewportSize(testCase.viewport);
    const releaseResponse = await prepareLoggedInFeed(page);

    await page.goto('/feed');
    await expect(page.getByTestId('feed-sort-subheader')).toBeVisible();

    const skeletons = page.getByTestId('feed-skeleton-card');
    await expect(skeletons).toHaveCount(2);
    const skeleton = skeletons.first();
    await expect(skeleton).toBeVisible();
    const skeletonBox = await skeleton.boundingBox();
    expect(skeletonBox).not.toBeNull();

    releaseResponse();

    const feedCard = page.getByTestId('feed-card').first();
    await expect(feedCard).toBeVisible();
    await expect(skeletons).toHaveCount(0);
    const feedCardBox = await feedCard.boundingBox();
    expect(feedCardBox).not.toBeNull();

    expect(feedCardBox!.width).toBeCloseTo(skeletonBox!.width, 1);
    expect(feedCardBox!.height).toBeCloseTo(skeletonBox!.height, 1);
  });
}
