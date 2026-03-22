import type { Notification } from '@/types/notification';

export const getNotificationNavigationPath = (
  notification: Notification,
): string | null => {
  if (notification.diaryDate && notification.diaryUserId) {
    const params = new URLSearchParams({ date: notification.diaryDate });

    if (notification.relatedDiaryId !== null) {
      params.set('diaryId', String(notification.relatedDiaryId));
    }

    return `/profile/${notification.diaryUserId}/calendar?${params.toString()}`;
  }

  if (
    (notification.type === 'LIKE' || notification.type === 'COMMENT') &&
    notification.relatedDiaryId !== null
  ) {
    return `/diary/${notification.relatedDiaryId}`;
  }

  return null;
};
