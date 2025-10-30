import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '피드 - PikUme | 친구들의 감정 다이어리 피드',
  description:
    '친구들의 캐릭터 다이어리와 감정을 한눈에 확인하세요. PikUme에서 친구들과 일상을 공유하고 소통해보세요.',
  keywords: ['친구 피드', '감정 피드', '다이어리 피드', '소셜 다이어리', 'PikUme 피드'],
  openGraph: {
    title: '피드 - PikUme',
    description: '친구들의 캐릭터 다이어리와 감정을 한눈에 확인하세요.',
    type: 'website',
    url: '/feed',
  },
};
import FeedClient from '@/components/feed/FeedClient';
import { Suspense } from 'react';

const FeedPage = () => {
  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center pt-20">
            피드를 불러오는 중...
          </div>
        }
      >
        <FeedClient />
      </Suspense>
    </div>
  );
};

export default FeedPage;
