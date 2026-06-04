'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Images } from 'lucide-react';
import { CalendarDiaryResponseDTO, getUserGallery } from '@/lib/api/diary';

interface ProfileDiaryPhotoGridProps {
  userId?: string;
}

const ProfileDiaryPhotoGrid = ({ userId }: ProfileDiaryPhotoGridProps) => {
  const router = useRouter();
  const [diaries, setDiaries] = useState<CalendarDiaryResponseDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setDiaries([]);
      setNextCursor(null);
      setHasNext(false);
      setIsLoading(false);
      setIsError(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setIsError(false);

    getUserGallery(userId)
      .then(result => {
        if (!isMounted) return;

        setDiaries(result.items.filter(diary => diary.coverPhotoUrl));
        setNextCursor(result.nextCursor);
        setHasNext(result.hasNext);
      })
      .catch(error => {
        console.error('Failed to fetch profile diary photos:', error);
        if (!isMounted) return;

        setDiaries([]);
        setNextCursor(null);
        setHasNext(false);
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
  }, [userId]);

  const handleLoadMore = async () => {
    if (!userId || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setIsError(false);

    try {
      const result = await getUserGallery(userId, nextCursor);
      setDiaries(prevDiaries => [
        ...prevDiaries,
        ...result.items.filter(diary => diary.coverPhotoUrl),
      ]);
      setNextCursor(result.nextCursor);
      setHasNext(result.hasNext);
    } catch (error) {
      console.error('Failed to fetch more profile diary photos:', error);
      setIsError(true);
    } finally {
      setIsLoadingMore(false);
    }
  };

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
    <div>
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
            {(diary.imageCount ?? 0) > 1 && (
              <span
                aria-label={`복수 사진 ${diary.imageCount}장`}
                className="absolute right-2 top-2 inline-flex text-white"
              >
                <Images aria-hidden="true" className="h-5 w-5" />
              </span>
            )}
          </button>
        ))}
      </div>
      {hasNext && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoadingMore ? '불러오는 중...' : '더 보기'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDiaryPhotoGrid;
