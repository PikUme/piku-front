'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';
import { deleteNotification, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api/notification';
import { Notification } from '@/types/notification';
import { getNotificationNavigationPath } from '@/lib/utils/notification';
import { Trash2, Loader2, Check } from 'lucide-react';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';

const NotificationsClient = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const { decrementUnreadCount } = useNotificationStore();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      readMutation.mutate(notification.id);
      decrementUnreadCount();
    }

    const url = getNotificationNavigationPath(notification);
    if (url) {
      router.push(url);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    deleteMutation.mutate(notification.id, {
      onSuccess: () => {
        if (!notification.isRead) {
          decrementUnreadCount();
        }
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
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-center flex-1">
                  {notification.avatarUrl && (
                    <Image
                      src={notification.avatarUrl}
                      alt={`${notification.nickname}'s avatar`}
                      width={40}
                      height={40}
                      className="rounded-full mr-4"
                    />
                  )}
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
    </div>
  );
};

export default NotificationsClient;
