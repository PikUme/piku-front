import type { Notification } from '@/types/notification';

const DIARY_MODAL_NOTIFICATION_TYPES = new Set<Notification['type']>([
  'LIKE',
  'COMMENT',
  'REPLY',
  'FRIEND_DIARY',
]);

export const getNotificationNavigationPath = (
  notification: Notification,
): string | null => {
  if (notification.type === 'FRIEND_REQUEST') {
    return '/friends?tab=requests';
  }

  if (
    notification.relatedDiaryId !== null &&
    DIARY_MODAL_NOTIFICATION_TYPES.has(notification.type)
  ) {
    return null;
  }

  if (notification.diaryDate && notification.diaryUserId) {
    const params = new URLSearchParams({ date: notification.diaryDate });

    if (notification.relatedDiaryId !== null) {
      params.set('diaryId', String(notification.relatedDiaryId));
    }

    return `/profile/${notification.diaryUserId}/calendar?${params.toString()}`;
  }

  return null;
};
