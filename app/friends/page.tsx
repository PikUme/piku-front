import type { Metadata } from 'next';
import RequireAuth from '@/components/auth/RequireAuth';
import FriendsClient from '@/components/friends/FriendsClient';

export const metadata: Metadata = {
  title: '친구 - PikUme | 친구 추가 및 관리',
  description: 'PikUme에서 친구를 추가하고 친구 요청을 관리하세요. 서로의 감정 다이어리를 공유하고 소통할 수 있습니다.',
  keywords: ['친구 추가', '친구 요청', '친구 관리', '소셜 다이어리', 'PikUme 친구'],
  openGraph: {
    title: '친구 - PikUme',
    description: 'PikUme에서 친구를 추가하고 친구 요청을 관리하세요.',
    type: 'website',
    url: '/friends',
  },
};

const FriendsPage = () => {
  return (
    <RequireAuth>
      <FriendsClient />
    </RequireAuth>
  );
};

export default FriendsPage;
