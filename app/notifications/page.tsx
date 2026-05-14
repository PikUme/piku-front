import type { Metadata } from 'next';
import RequireAuth from '@/components/auth/RequireAuth';
import NotificationsClient from '@/components/notifications/NotificationsClient';

export const metadata: Metadata = {
  title: '알림 - PikUme',
  description: 'PikU에서 받은 최신 알림을 확인하세요',
};

const NotificationPage = () => {
  return (
    <RequireAuth>
      <NotificationsClient />
    </RequireAuth>
  );
};

export default NotificationPage;
