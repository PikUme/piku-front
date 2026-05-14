import type { Metadata } from 'next';
import RequireAuth from '@/components/auth/RequireAuth';
import ProfilePageClient from '@/components/profile/ProfilePageClient';

export const metadata: Metadata = {
  title: '프로필 - PikUme',
  description: '사용자의 공개 프로필과 감정 기록',
};

const ProfilePage = async ({ params }: { params: Promise<{ userId: string }> }) => {
  const { userId } = await params;

  return (
    <RequireAuth>
      <ProfilePageClient userId={userId} />
    </RequireAuth>
  );
};

export default ProfilePage;
