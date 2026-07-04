import { createPageMetadata } from '@/lib/metadata/createPageMetadata';
import SearchClient from '@/components/search/SearchClient';

export const metadata = createPageMetadata({
  title: '검색 - PikUme | 친구와 다이어리 검색',
  description: 'PikUme에서 친구를 찾고 감정 다이어리를 검색해보세요. 키워드로 원하는 컨텐츠를 빠르게 찾을 수 있습니다.',
  path: '/search',
  keywords: ['친구 검색', '다이어리 검색', '감정 검색', 'PikUme 검색', '컨텐츠 검색'],
  socialTitle: '검색 - PikUme',
  socialDescription: 'PikUme에서 친구를 찾고 감정 다이어리를 검색해보세요.',
});

const SearchPage = () => {
  return <SearchClient />;
};

export default SearchPage;
