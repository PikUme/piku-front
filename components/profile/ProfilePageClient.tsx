'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import ProfileClient from '@/components/profile/ProfileClient';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';
import Header from '@/components/profile/Header';
import { UserProfileResponseDTO } from '@/types/profile';
import { getUserProfile } from '@/lib/api/user';
import { getDaysInMonth } from '@/lib/utils/date';
import useAuthStore from '@/components/store/authStore';

interface ProfilePageClientProps {
  userId: string;
}

const ProfilePageClient = ({ userId }: ProfilePageClientProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [profileData, setProfileData] = useState<UserProfileResponseDTO | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    const fetchProfileData = async () => {
      if (
        !currentUser ||
        (pathname === '/profile' && userId !== currentUser.id)
      ) {
        if (currentUser?.id) {
          router.replace(`/profile/${currentUser.id}`);
        } else {
          router.replace('/login');
        }
        return;
      }

      try {
        setIsLoading(true);
        const data = await getUserProfile(userId);

        const monthlyDiaryCountWithDays = data.monthlyDiaryCount.map(item => ({
          ...item,
          daysInMonth: getDaysInMonth(item.year, item.month),
        }));

        setProfileData({
          ...data,
          monthlyDiaryCount: monthlyDiaryCountWithDays,
          userId: data.id,
        });
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchProfileData();
    }
  }, [userId, currentUser, router, pathname]);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!profileData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-black">
        <Image
          src="/404.png"
          alt="프로필 정보를 찾을 수 없습니다."
          width={1536}
          height={1024}
          className="h-auto w-full max-w-2xl"
        />
      </div>
    );
  }

  return (
    <>
      <Header nickname={profileData.nickname} isOwner={profileData.isOwner} />
      <ProfileClient profileData={profileData} />
    </>
  );
};

export default ProfilePageClient;
