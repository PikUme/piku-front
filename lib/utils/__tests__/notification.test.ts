import { describe, expect, it } from 'vitest';
import type { Notification } from '@/types/notification';
import { getNotificationNavigationPath } from '../notification';

const makeNotification = (
  overrides: Partial<Notification> = {},
): Notification => ({
  id: 1,
  message: '알림입니다.',
  nickname: 'tester',
  avatarUrl: 'https://example.com/avatar.png',
  type: 'FRIEND_DIARY',
  relatedDiaryId: 10,
  thumbnailUrl: null,
  isRead: false,
  diaryDate: '2026-03-17',
  diaryUserId: 'user-1',
  ...overrides,
});

describe('getNotificationNavigationPath', () => {
  it('LIKE 알림은 일기 상세 페이지로 이동한다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({ type: 'LIKE', relatedDiaryId: 42 }),
    );

    expect(path).toBe('/diary/42');
  });

  it('COMMENT 알림은 일기 상세 페이지로 이동한다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({ type: 'COMMENT', relatedDiaryId: 84 }),
    );

    expect(path).toBe('/diary/84');
  });

  it('그 외 일기 알림은 캘린더 위치로 이동한다', () => {
    const path = getNotificationNavigationPath(makeNotification());

    expect(path).toBe('/profile/user-1/calendar?date=2026-03-17&diaryId=10');
  });

  it('이동 정보가 없으면 null을 반환한다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({
        relatedDiaryId: null,
        diaryDate: null,
        diaryUserId: null,
      }),
    );

    expect(path).toBeNull();
  });
});
