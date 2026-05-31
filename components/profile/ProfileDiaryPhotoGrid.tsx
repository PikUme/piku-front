'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarDiaryResponseDTO,
  getMonthlyDiaries,
} from '@/lib/api/diary';
import type { DiaryMonthCountDTO } from '@/types/profile';

interface ProfileDiaryPhotoGridProps {
  userId?: string;
  monthlyDiaryCount?: DiaryMonthCountDTO[];
}

const ProfileDiaryPhotoGrid = ({
  userId,
  monthlyDiaryCount = [],
}: ProfileDiaryPhotoGridProps) => {
  const router = useRouter();
  const [diaries, setDiaries] = useState<CalendarDiaryResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const monthsWithDiaries = monthlyDiaryCount.filter(stat => stat.count > 0);

    if (!userId || monthsWithDiaries.length === 0) {
      setDiaries([]);
      setIsLoading(false);
      setIsError(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setIsError(false);

    Promise.all(
      monthsWithDiaries.map(stat =>
        getMonthlyDiaries(userId, stat.year, stat.month),
      ),
    )
      .then(results => {
        if (!isMounted) return;

        const nextDiaries = results
          .flat()
          .filter(diary => diary.coverPhotoUrl)
          .sort((a, b) => b.date.localeCompare(a.date));

        setDiaries(nextDiaries);
      })
      .catch(error => {
        console.error('Failed to fetch profile diary photos:', error);
        if (!isMounted) return;

        setDiaries([]);
        setIsError(true);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [monthlyDiaryCount, userId]);

  const handleDiaryClick = (diary: CalendarDiaryResponseDTO) => {
    if (!userId) return;

    const params = new URLSearchParams({
      date: diary.date,
      diaryId: String(diary.diaryId),
    });

    router.push(`/profile/${userId}/calendar?${params.toString()}`);
  };

  if (isLoading) {
    return <p className="py-8 text-center text-gray-500">사진을 불러오는 중...</p>;
  }

  if (isError) {
    return <p className="py-8 text-center text-gray-500">사진을 불러오지 못했어요.</p>;
  }

  if (diaries.length === 0) {
    return <p className="py-8 text-center text-gray-500">사진이 있는 일기가 없어요.</p>;
  }

  return (
    <div
      aria-label="다이어리 사진 목록"
      className="grid grid-cols-3 gap-0.5 md:gap-1"
      data-testid="profile-diary-photo-grid"
    >
      {diaries.map(diary => (
        <button
          key={diary.diaryId}
          type="button"
          onClick={() => handleDiaryClick(diary)}
          className="relative aspect-[4/5] overflow-hidden bg-gray-100"
          data-testid="profile-diary-photo-tile"
        >
          <Image
            src={diary.coverPhotoUrl}
            alt={`${diary.date} 일기 사진`}
            fill
            sizes="33vw"
            className="object-cover transition duration-200 hover:scale-[1.03] hover:brightness-95"
          />
        </button>
      ))}
    </div>
  );
};

export default ProfileDiaryPhotoGrid;
