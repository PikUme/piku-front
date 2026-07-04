import { Suspense } from 'react';
import RequireAuth from '@/components/auth/RequireAuth';
import FriendsClient from '@/components/friends/FriendsClient';
import { createPageMetadata } from '@/lib/metadata/createPageMetadata';

export const metadata = createPageMetadata({
  title: '친구 - PikUme | 친구 추가 및 관리',
  description: 'PikUme에서 친구를 추가하고 친구 요청을 관리하세요. 서로의 감정 다이어리를 공유하고 소통할 수 있습니다.',
  path: '/friends',
  keywords: ['친구 추가', '친구 요청', '친구 관리', '소셜 다이어리', 'PikUme 친구'],
  socialTitle: '친구 - PikUme',
  socialDescription: 'PikUme에서 친구를 추가하고 친구 요청을 관리하세요.',
});

const FriendsPage = () => {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            친구 정보를 불러오는 중...
          </div>
        }
      >
        <FriendsClient />
      </Suspense>
    </RequireAuth>
  );
};

export default FriendsPage;
