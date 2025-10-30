import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인 - PikUme | 캐릭터 감정 다이어리',
  description:
    'PikUme 계정으로 로그인하고 캐릭터와 함께 오늘의 감정을 기록해보세요. PIKU 캐릭터 일기장.',
  keywords: ['PikUme 로그인', '감정 다이어리 로그인', '캐릭터 일기'],
  openGraph: {
    title: '로그인 - PikUme',
    description: 'PikUme 계정으로 로그인하고 캐릭터와 함께 오늘의 감정을 기록해보세요.',
    type: 'website',
    url: '/login',
  },
};
import LoginClient from '@/components/auth/LoginClient';

const LoginPage = () => {
  return <LoginClient />;
};

export default LoginPage;
