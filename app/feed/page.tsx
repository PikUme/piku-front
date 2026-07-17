import FeedClient from '@/components/feed/FeedClient';
import FeedSkeleton from '@/components/feed/FeedSkeleton';
import { createPageMetadata } from '@/lib/metadata/createPageMetadata';
import { Suspense } from 'react';

export const metadata = createPageMetadata({
  title: '피드 - PikUme | 친구들의 감정 다이어리 피드',
  description: '친구들의 캐릭터 다이어리와 감정을 한눈에 확인하세요. PikUme에서 친구들과 일상을 공유하고 소통해보세요.',
  path: '/feed',
  keywords: ['친구 피드', '감정 피드', '다이어리 피드', '소셜 다이어리', 'PikUme 피드'],
  socialTitle: '피드 - PikUme',
  socialDescription: '친구들의 캐릭터 다이어리와 감정을 한눈에 확인하세요.',
});

const FeedPage = () => {
  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="mx-auto max-w-[600px] pt-[3.75rem] xl:pt-[calc(4.5rem+1px)]">
            <FeedSkeleton count={2} />
          </div>
        }
      >
        <FeedClient />
      </Suspense>
    </div>
  );
};

export default FeedPage;
