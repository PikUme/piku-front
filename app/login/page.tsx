import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로그인 - PikUme',
  description: 'PikUme 계정으로 로그인하고 감정을 기록하세요',
};
import LoginClient from "@/components/auth/LoginClient";

const LoginPage = () => {
  return <LoginClient />;
};

export default LoginPage; 