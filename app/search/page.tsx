import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '검색 - PikUme | 친구와 다이어리 검색',
  description: 'PikUme에서 친구를 찾고 감정 다이어리를 검색해보세요. 키워드로 원하는 컨텐츠를 빠르게 찾을 수 있습니다.',
  keywords: ['친구 검색', '다이어리 검색', '감정 검색', 'PikUme 검색', '컨텐츠 검색'],
  openGraph: {
    title: '검색 - PikUme',
    description: 'PikUme에서 친구를 찾고 감정 다이어리를 검색해보세요.',
    type: 'website',
    url: '/search',
  },
};
// app/search/page.tsx
import SearchClient from '@/components/search/SearchClient';

const SearchPage = () => {
  return <SearchClient />;
};

export default SearchPage;
