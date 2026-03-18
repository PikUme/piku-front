import { expect, test } from '@playwright/test';

const mockUser = {
  id: 'test-user',
  email: 'tester@example.com',
  nickname: 'Tester',
  avatar: '/globe.svg',
};

const mockProfile = {
  id: 'test-user',
  userId: 'test-user',
  nickname: 'Tester',
  avatar: '/globe.svg',
  friendCount: 0,
  diaryCount: 1,
  friendStatus: 'NONE',
  isOwner: true,
  monthlyDiaryCount: [],
};

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnXlMsAAAAASUVORK5CYII=',
  'base64',
);

test.beforeEach(async ({ page }) => {
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

    Object.defineProperty(Notification, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('denied'),
    });
  }, mockUser);

  await page.route('**/api/users/test-user', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockProfile),
    }),
  );

  await page.route('**/api/relation**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [],
        last: true,
        totalElements: 0,
      }),
    }),
  );

  await page.route('**/api/diary/user/test-user/monthly**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          diaryId: 77,
          coverPhotoUrl: 'http://localhost:8080/mock/calendar-cover.png',
          date: '2026-03-15',
        },
      ]),
    }),
  );

  await page.route('http://localhost:8080/mock/calendar-cover.png', async route => {
    await new Promise(resolve => setTimeout(resolve, 1_200));
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: transparentPng,
    });
  });
});

test('calendar image shows a skeleton until the cover photo loads', async ({
  page,
}) => {
  await page.goto('/profile/test-user/calendar?date=2026-03-15');

  await expect(page.getByTestId('calendar-skeleton-2026-03-15')).toBeVisible();
  await expect(page.getByTestId('calendar-image-2026-03-15')).toBeAttached();
  await expect(page.getByTestId('calendar-skeleton-2026-03-15')).toHaveCount(0, {
    timeout: 5_000,
  });
});
