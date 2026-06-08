'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { deleteNotification, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api/notification';
import { getDiaryById } from '@/lib/api/diary';
import { Notification } from '@/types/notification';
import type { DiaryDetail } from '@/types/diary';
import DiaryDetailModal from '../diary/DiaryDetailModal';
import DiaryStoryModal from '../diary/DiaryStoryModal';
import { getNotificationNavigationPath } from '@/lib/utils/notification';
import { getApiErrorMessage, hasProblemType } from '@/lib/utils/apiError';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Trash2, Loader2, Check } from 'lucide-react';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import AnonymousProfileIcon from '@/components/common/AnonymousProfileIcon';

const RESOURCE_NOT_FOUND =
  'https://api.pikume.com/problems/common/resource-not-found';

const DIARY_MODAL_NOTIFICATION_TYPES = new Set<Notification['type']>([
  'REPLY',
  'FRIEND_DIARY',
]);

const isAnonymousDiaryNotification = (notification: Notification) =>
  notification.relatedDiaryId !== null &&
  notification.diaryUserId === null &&
  notification.avatarUrl === null &&
  notification.nickname === '익명';

const NotificationsClient = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const { decrementUnreadCount } = useNotificationStore();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [selectedDiary, setSelectedDiary] = useState<DiaryDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const isDesktop = useMediaQuery({ query: '(min-width: 768px)' });
  useBodyScrollLock(Boolean(selectedDiary || isLoadingDetail));

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 0 }) => getNotifications(pageParam, 20),
    getNextPageParam: (lastPage) => {
      return lastPage.last ? undefined : lastPage.number + 1;
    },
    initialPageParam: 0,
  });

  const notifications = data?.pages.flatMap((page) => page.content) || [];

  const readMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // 모든 알림을 읽음 처리했으므로 unread count를 0으로 설정
      const unreadCount = notifications.filter(n => !n.isRead).length;
      for (let i = 0; i < unreadCount; i++) {
        decrementUnreadCount();
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const buildDiaryCalendarPath = (userId: string, date: string, diaryId: number) => {
    const params = new URLSearchParams({
      date,
      diaryId: String(diaryId),
    });

    return `/profile/${userId}/calendar?${params.toString()}`;
  };

  const resolveNotificationNavigationPath = async (notification: Notification) => {
    const path = getNotificationNavigationPath(notification);
    if (path && !path.startsWith('/diary/')) {
      return path;
    }

    if (isAnonymousDiaryNotification(notification) && path) {
      return path;
    }

    if (
      (notification.type === 'LIKE' || notification.type === 'COMMENT') &&
      notification.relatedDiaryId !== null
    ) {
      try {
        const diary = await getDiaryById(notification.relatedDiaryId);
        if (diary.userId) {
          return buildDiaryCalendarPath(diary.userId, diary.date, diary.diaryId);
        }
      } catch (error) {
        console.error('알림 경로용 일기 정보 조회 실패:', error);
      }
    }

    return path;
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await readMutation.mutateAsync(notification.id);
        decrementUnreadCount();
      } catch (error) {
        if (hasProblemType(error, RESOURCE_NOT_FOUND)) {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } else {
          alert(getApiErrorMessage(error, '알림 읽음 처리에 실패했습니다.'));
        }
      }
    }

    // 일부 일기 알림은 페이지 이동 대신 모달로 상세를 보여준다.
    if (
      DIARY_MODAL_NOTIFICATION_TYPES.has(notification.type) &&
      notification.relatedDiaryId !== null
    ) {
      setIsLoadingDetail(true);
      try {
        const diary = await getDiaryById(notification.relatedDiaryId);
        setSelectedDiary(diary);
      } catch (error) {
        console.error('일기 정보를 불러오는데 실패했습니다:', error);
        alert(getApiErrorMessage(error, '일기 정보를 불러오는데 실패했습니다.'));
      } finally {
        setIsLoadingDetail(false);
      }
      return;
    }

    const url = await resolveNotificationNavigationPath(notification);
    if (url) {
      router.push(url);
    }
  };

  const hasDetailHistoryEntryRef = useRef(false);

  const handleCloseModal = useCallback(() => {
    hasDetailHistoryEntryRef.current = false;
    setSelectedDiary(null);
  }, []);

  // 모달 열림 시 history 관리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.modal === 'notification-diary-detail') {
        return;
      }

      hasDetailHistoryEntryRef.current = false;
      handleCloseModal();
    };

    if (selectedDiary) {
      if (!hasDetailHistoryEntryRef.current) {
        window.history.pushState({ modal: 'notification-diary-detail' }, '');
        hasDetailHistoryEntryRef.current = true;
      }
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedDiary, handleCloseModal]);

  const handleDeleteClick = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    deleteMutation.mutate(notification.id, {
      onSuccess: () => {
        if (!notification.isRead) {
          decrementUnreadCount();
        }
      },
      onError: (error) => {
        if (hasProblemType(error, RESOURCE_NOT_FOUND)) {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          return;
        }

        alert(getApiErrorMessage(error, '알림 삭제에 실패했습니다.'));
      },
    });
  };

  const handleMarkAllAsRead = () => {
    readAllMutation.mutate();
  };

  // Intersection Observer를 사용한 무한스크롤
  const lastNotificationRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const hasUnreadNotifications = notifications.some(n => !n.isRead);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">알림</h1>
        {hasUnreadNotifications && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={readAllMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check size={18} />
            모두 읽기
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          모든 알림을 확인 완료했어요.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                ref={index === notifications.length - 1 ? lastNotificationRef : null}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${
                  notification.isRead
                    ? 'bg-white dark:bg-gray-800'
                    : 'bg-blue-50 dark:bg-blue-900/50'
                } hover:bg-gray-100 dark:hover:bg-gray-700`}
                onClick={() => {
                  void handleNotificationClick(notification);
                }}
              >
                <div className="flex items-center flex-1">
                  {notification.avatarUrl ? (
                    <Image
                      src={notification.avatarUrl}
                      alt={`${notification.nickname}'s avatar`}
                      width={40}
                      height={40}
                      className="rounded-full mr-4"
                    />
                  ) : isAnonymousDiaryNotification(notification) ? (
                    <AnonymousProfileIcon
                      className="mr-4 h-10 w-10"
                      iconSize={22}
                    />
                  ) : null}
                  <div className="flex-1">
                    <p>
                      <span className="font-semibold">{notification.nickname}</span>
                      {` ${notification.message}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {notification.thumbnailUrl && (
                    <Image
                      src={notification.thumbnailUrl}
                      alt="thumbnail"
                      width={40}
                      height={40}
                      className="rounded-md"
                    />
                  )}
                  <button
                    onClick={(e) => handleDeleteClick(e, notification)}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* 로딩 인디케이터 */}
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}
        </>
      )}
      {isLoadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <p className="text-white">일기 정보를 불러오는 중...</p>
        </div>
      )}
      {selectedDiary &&
        (isDesktop ? (
          <DiaryDetailModal
            diary={selectedDiary}
            onClose={handleCloseModal}
          />
        ) : (
          <DiaryStoryModal
            diary={selectedDiary}
            onClose={handleCloseModal}
          />
        ))}
    </div>
  );
};

export default NotificationsClient;
