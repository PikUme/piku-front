export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPT'
  | 'LIKE'
  | 'COMMENT'
  | 'REPLY'
  | 'FRIEND_DIARY';

export interface Notification {
  id: number;
  message: string;
  nickname: string;
  avatarUrl: string | null;
  type: NotificationType;
  relatedDiaryId: number | null;
  thumbnailUrl: string | null;
  isRead: boolean;
  diaryDate: string | null;
  diaryUserId: string | null;
}
