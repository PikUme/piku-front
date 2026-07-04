import HomeRoot from '@/components/home/HomeRoot';
import { createPageMetadata } from '@/lib/metadata/createPageMetadata';

export const metadata = createPageMetadata({
  title: 'PikUme(피쿠미) - 캐릭터로 기록하는 감정 다이어리',
  description: 'PikUme(피쿠미)는 선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성하고 친구들과 감정을 공유하는 다이어리 서비스입니다.',
  path: '/',
  keywords: [
    '감정 다이어리',
    '캐릭터 일기',
    '일기 앱',
    '감정 기록',
    '친구 다이어리',
    'PIKU',
    'PikUme',
    'pikume',
    '피쿠미',
    '피쿠미 일기',
    '피쿠미 다이어리',
  ],
  socialTitle: 'PikUme(피쿠미) - 캐릭터 감정 다이어리',
  socialDescription:
    'PikUme(피쿠미)에서 선택한 캐릭터와 함께 하루 한 장 감정 일기를 작성해보세요.',
});

export default function Home() {
  return <HomeRoot />;
}
