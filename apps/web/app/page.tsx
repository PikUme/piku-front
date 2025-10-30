import HomeRoot from '@/components/home/HomeRoot';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PikUme - 캐릭터로 기록하는 감정 다이어리',
  description:
    '선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성해보세요. 친구들과 소통하며 감정을 공유하는 새로운 다이어리 경험.',
  keywords: ['감정 다이어리', '캐릭터 일기', '일기 앱', '감정 기록', '친구 다이어리', 'PIKU'],
  openGraph: {
    title: 'PikUme - 캐릭터 감정 다이어리',
    description: '선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성해보세요.',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PikUme - 캐릭터 감정 다이어리',
    description: '선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성해보세요.',
  },
};

export default function Home() {
  return <HomeRoot />;
}
