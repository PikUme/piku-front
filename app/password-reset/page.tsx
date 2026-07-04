import PasswordResetClient from '@/components/auth/PasswordResetClient';
import { createPageMetadata } from '@/lib/metadata/createPageMetadata';

export const metadata = createPageMetadata({
  title: '비밀번호 재설정 - PikUme',
  description: '계정 비밀번호를 안전하게 재설정하세요',
  path: '/password-reset',
});

const PasswordResetPage = () => {
  return <PasswordResetClient />;
};

export default PasswordResetPage;
