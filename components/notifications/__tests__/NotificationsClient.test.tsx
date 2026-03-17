import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Page } from '@/types/api';
import type { Notification } from '@/types/notification';
import NotificationsClient from '../NotificationsClient';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/api/notification';

const mockPush = vi.fn();
const mockDecrementUnreadCount = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('@/lib/api/notification', () => ({
  getNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

vi.mock('../../store/notificationStore', () => ({
  default: () => ({
    decrementUnreadCount: mockDecrementUnreadCount,
  }),
}));

vi.mock('../../store/authStore', () => ({
  default: () => ({
    user: null,
  }),
}));

class MockIntersectionObserver implements IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [0];

  constructor(_callback: IntersectionObserverCallback) {}

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
  unobserve = vi.fn();
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

const mockGetNotifications = vi.mocked(getNotifications);
const mockMarkNotificationAsRead = vi.mocked(markNotificationAsRead);

const makeNotification = (
  overrides: Partial<Notification> = {},
): Notification => ({
  id: 1,
  message: 'liked your diary',
  nickname: 'tester',
  avatarUrl: 'https://example.com/avatar.png',
  type: 'LIKE',
  relatedDiaryId: 42,
  thumbnailUrl: null,
  isRead: false,
  diaryDate: '2026-03-17',
  diaryUserId: 'user-1',
  ...overrides,
});

const makePage = (notifications: Notification[]): Page<Notification> => ({
  content: notifications,
  pageable: {
    pageNumber: 0,
    pageSize: 20,
    sort: {
      empty: true,
      sorted: false,
      unsorted: true,
    },
    offset: 0,
    paged: true,
    unpaged: false,
  },
  last: true,
  totalPages: 1,
  totalElements: notifications.length,
  size: 20,
  number: 0,
  sort: {
    empty: true,
    sorted: false,
    unsorted: true,
  },
  first: true,
  numberOfElements: notifications.length,
  empty: notifications.length === 0,
});

const renderClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationsClient />
    </QueryClientProvider>,
  );
};

describe('NotificationsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteNotification).mockResolvedValue(undefined);
    vi.mocked(markAllNotificationsAsRead).mockResolvedValue(undefined);
    mockMarkNotificationAsRead.mockResolvedValue(undefined);
  });

  it('LIKE 알림 클릭 시 일기 상세 페이지로 이동한다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([makeNotification({ message: 'liked your diary' })]),
    );

    renderClient();

    fireEvent.click(await screen.findByText('liked your diary'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/diary/42');
      expect(mockMarkNotificationAsRead).toHaveBeenCalledWith(1);
      expect(mockDecrementUnreadCount).toHaveBeenCalledTimes(1);
    });
  });

  it('FRIEND_DIARY 알림 클릭 시 캘린더 상세 위치로 이동한다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([
        makeNotification({
          id: 2,
          type: 'FRIEND_DIARY',
          message: 'posted a new diary',
          relatedDiaryId: 77,
        }),
      ]),
    );

    renderClient();

    fireEvent.click(await screen.findByText('posted a new diary'));

    expect(mockPush).toHaveBeenCalledWith(
      '/profile/user-1/calendar?date=2026-03-17&diaryId=77',
    );
  });

  it('읽은 알림 클릭 시 읽음 처리 요청 없이 이동만 한다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([
        makeNotification({
          id: 3,
          isRead: true,
          message: 'already read',
        }),
      ]),
    );

    renderClient();

    fireEvent.click(await screen.findByText('already read'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/diary/42');
    });
    expect(mockMarkNotificationAsRead).not.toHaveBeenCalled();
    expect(mockDecrementUnreadCount).not.toHaveBeenCalled();
  });
});
