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
  it('LIKE 알림에 relatedDiaryId가 있으면 모달 처리 대상이므로 이동 경로를 만들지 않는다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({ type: 'LIKE', relatedDiaryId: 42 }),
    );

    expect(path).toBeNull();
  });

  it('COMMENT 알림에 relatedDiaryId가 있으면 모달 처리 대상이므로 이동 경로를 만들지 않는다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({ type: 'COMMENT', relatedDiaryId: 84 }),
    );

    expect(path).toBeNull();
  });

  it('REPLY 알림에 relatedDiaryId가 있으면 모달 처리 대상이므로 이동 경로를 만들지 않는다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({ type: 'REPLY', relatedDiaryId: 10 }),
    );

    expect(path).toBeNull();
  });

  it('FRIEND_DIARY 알림에 relatedDiaryId가 있으면 모달 처리 대상이므로 이동 경로를 만들지 않는다', () => {
    const path = getNotificationNavigationPath(makeNotification());

    expect(path).toBeNull();
  });

  it('relatedDiaryId가 없는 날짜 기반 알림은 캘린더 날짜 위치로 이동한다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({ type: 'FRIEND_DIARY', relatedDiaryId: null }),
    );

    expect(path).toBe('/profile/user-1/calendar?date=2026-03-17');
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

  it('LIKE 알림에서 프로필 정보가 없어도 모달 처리 대상이면 이동 경로를 만들지 않는다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({
        type: 'LIKE',
        relatedDiaryId: 42,
        diaryDate: null,
        diaryUserId: null,
      }),
    );

    expect(path).toBeNull();
  });

  it('FRIEND_REQUEST 알림은 친구 요청 탭으로 이동한다', () => {
    const path = getNotificationNavigationPath(
      makeNotification({
        type: 'FRIEND_REQUEST',
        relatedDiaryId: null,
        diaryDate: null,
        diaryUserId: null,
      }),
    );

    expect(path).toBe('/friends?tab=requests');
  });
});
