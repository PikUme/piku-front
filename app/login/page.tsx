import LoginClient from "@/components/auth/LoginClient";
import { createPageMetadata } from '@/lib/metadata/createPageMetadata';

export const metadata = createPageMetadata({
  title: '로그인 - PikUme | 캐릭터 감정 다이어리',
  description: 'PikUme 계정으로 로그인하고 캐릭터와 함께 오늘의 감정을 기록해보세요. PIKU 캐릭터 일기장.',
  path: '/login',
  keywords: ['PikUme 로그인', '감정 다이어리 로그인', '캐릭터 일기'],
  socialTitle: '로그인 - PikUme',
  socialDescription:
    'PikUme 계정으로 로그인하고 캐릭터와 함께 오늘의 감정을 기록해보세요.',
});

const LoginPage = () => {
  return <LoginClient />;
};

export default LoginPage;
