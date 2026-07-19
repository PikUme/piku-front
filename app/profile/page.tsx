'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/auth/RequireAuth';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';
import useAuthStore from '@/components/store/authStore';

const ProfileRedirectContent = () => {
  const router = useRouter();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user?.id) {
      router.replace(`/profile/${user.id}`);
    }
  }, [user, router]);

  return <ProfileSkeleton />;
};

const ProfileRedirectPage = () => {
  return (
    <RequireAuth>
      <ProfileRedirectContent />
    </RequireAuth>
  );
};

export default ProfileRedirectPage;
