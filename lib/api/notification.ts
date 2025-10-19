import api  from './api';
import { Notification } from '@/types/notification';
import { Page } from '@/types/api';

export const getNotifications = async (page: number = 0, size: number = 20): Promise<Page<Notification>> => {
  const response = await api.get('/sse/notifications', {
    params: { page, size }
  });
  return response.data;
};

export const markNotificationAsRead = async (notificationId: number): Promise<void> => {
  await api.patch(`/sse/${notificationId}`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.patch('/sse/notifications');
};

export const deleteNotification = async (notificationId: number): Promise<void> => {
  await api.delete(`/sse/${notificationId}`);
};
