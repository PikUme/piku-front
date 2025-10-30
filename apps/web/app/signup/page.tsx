import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '회원가입 - PikUme | 캐릭터 감정 다이어리 시작하기',
  description:
    '간단한 회원가입으로 PikUme를 시작해보세요. 캐릭터를 선택하고 감정 일기를 작성할 수 있습니다.',
  keywords: ['PikUme 회원가입', '감정 다이어리 가입', '캐릭터 일기 시작', 'PIKU'],
  openGraph: {
    title: '회원가입 - PikUme',
    description:
      '간단한 회원가입으로 PikUme를 시작해보세요. 캐릭터를 선택하고 감정 일기를 작성할 수 있습니다.',
    type: 'website',
    url: '/signup',
  },
};
import SignupClient from '@/components/auth/SignupClient';

export default function SignupPage() {
  return <SignupClient />;
}
