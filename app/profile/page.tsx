'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/auth/RequireAuth';
import useAuthStore from '@/components/store/authStore';

const ProfileRedirectContent = () => {
  const router = useRouter();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user?.id) {
      router.replace(`/profile/${user.id}`);
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>프로필 페이지로 이동 중입니다...</p>
    </div>
  );
};

const ProfileRedirectPage = () => {
  return (
    <RequireAuth>
      <ProfileRedirectContent />
    </RequireAuth>
  );
};

export default ProfileRedirectPage;
