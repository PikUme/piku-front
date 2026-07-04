import SignupClient from '@/components/auth/SignupClient';
import { createPageMetadata } from '@/lib/metadata/createPageMetadata';

export const metadata = createPageMetadata({
  title: '회원가입 - PikUme | 캐릭터 감정 다이어리 시작하기',
  description: '간단한 회원가입으로 PikUme를 시작해보세요. 캐릭터를 선택하고 감정 일기를 작성할 수 있습니다.',
  path: '/signup',
  keywords: ['PikUme 회원가입', '감정 다이어리 가입', '캐릭터 일기 시작', 'PIKU'],
  socialTitle: '회원가입 - PikUme',
  socialDescription:
    '간단한 회원가입으로 PikUme를 시작해보세요. 캐릭터를 선택하고 감정 일기를 작성할 수 있습니다.',
});

export default function SignupPage() {
  return <SignupClient />;
}
