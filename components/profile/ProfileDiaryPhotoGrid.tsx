'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Images } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import DiaryDetailModal from '@/components/diary/DiaryDetailModal';
import DiaryStoryModal from '@/components/diary/DiaryStoryModal';
import ProfileDiaryPhotoGridSkeleton from '@/components/profile/ProfileDiaryPhotoGridSkeleton';
import {
  CalendarDiaryResponseDTO,
  getDiaryById,
  getUserGallery,
} from '@/lib/api/diary';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { DiaryDetail } from '@/types/diary';

interface ProfileDiaryPhotoGridProps {
  userId?: string;
}

const ProfileDiaryPhotoGrid = ({ userId }: ProfileDiaryPhotoGridProps) => {
  const [diaries, setDiaries] = useState<CalendarDiaryResponseDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const hasDetailHistoryEntryRef = useRef(false);
  const isDesktop = useMediaQuery({ query: '(min-width: 768px)' });
  useBodyScrollLock(Boolean(selectedDiary || isLoadingDetail));

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

  const handleCloseModal = useCallback(() => {
    hasDetailHistoryEntryRef.current = false;
    setSelectedDiary(null);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.modal === 'profile-diary-detail') {
        return;
      }

      hasDetailHistoryEntryRef.current = false;
      handleCloseModal();
    };

    if (selectedDiary) {
      if (!hasDetailHistoryEntryRef.current) {
        window.history.pushState({ modal: 'profile-diary-detail' }, '');
        hasDetailHistoryEntryRef.current = true;
      }
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedDiary, handleCloseModal]);

  const handleDiaryClick = async (diary: CalendarDiaryResponseDTO) => {
    setIsLoadingDetail(true);
    try {
      const diaryDetail = await getDiaryById(diary.diaryId);
      setSelectedDiary(diaryDetail);
    } catch (error) {
      console.error('Failed to fetch profile diary detail:', error);
      alert(getApiErrorMessage(error, '일기 정보를 불러오는데 실패했습니다.'));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  if (isLoading) {
    return <ProfileDiaryPhotoGridSkeleton count={9} />;
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
        aria-busy={isLoadingMore}
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
        {isLoadingMore && (
          <ProfileDiaryPhotoGridSkeleton count={3} tilesOnly />
        )}
      </div>
      {hasNext && !isLoadingMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            더 보기
          </button>
        </div>
      )}
      {isLoadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <p className="text-white">일기 정보를 불러오는 중...</p>
        </div>
      )}
      {selectedDiary &&
        (isDesktop ? (
          <DiaryDetailModal diary={selectedDiary} onClose={handleCloseModal} />
        ) : (
          <DiaryStoryModal diary={selectedDiary} onClose={handleCloseModal} />
        ))}
    </div>
  );
};

export default ProfileDiaryPhotoGrid;
