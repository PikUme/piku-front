import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Page } from '@/types/api';
import type { Notification } from '@/types/notification';
import NotificationsClient from '../NotificationsClient';
import { getDiaryById } from '@/lib/api/diary';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/api/notification';

const mockPush = vi.fn();
const mockDecrementUnreadCount = vi.fn();

const mockViewport = vi.hoisted(() => ({
  isDesktop: true,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('react-responsive', () => ({
  useMediaQuery: () => mockViewport.isDesktop,
}));

vi.mock('../../diary/DiaryDetailModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="diary-detail-modal">
      <button data-testid="close-detail-modal" onClick={onClose}>close</button>
    </div>
  ),
}));

vi.mock('../../diary/DiaryStoryModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="diary-story-modal">
      <button data-testid="close-story-modal" onClick={onClose}>close</button>
    </div>
  ),
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

vi.mock('@/lib/api/diary', () => ({
  getDiaryById: vi.fn(),
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
const mockGetDiaryById = vi.mocked(getDiaryById);
const mockDeleteNotification = vi.mocked(deleteNotification);

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
    mockViewport.isDesktop = true;
    mockDeleteNotification.mockResolvedValue(undefined);
    vi.mocked(markAllNotificationsAsRead).mockResolvedValue(undefined);
    mockMarkNotificationAsRead.mockResolvedValue(undefined);
    mockGetDiaryById.mockResolvedValue({
      diaryId: 42,
      content: 'content',
      date: '2026-03-17',
      status: 'PUBLIC',
      createdAt: '2026-03-17T00:00:00',
      updatedAt: '2026-03-17T00:00:00',
      isLiked: false,
      likeCount: 0,
      commentCount: 0,
      imgUrls: [],
      nickname: 'tester',
      avatar: '/avatar.png',
      userId: 'user-1',
      comments: [],
    });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('LIKE 알림 클릭 시 프로필 캘린더 상세 위치로 이동한다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([makeNotification({ message: 'liked your diary' })]),
    );

    renderClient();

    fireEvent.click(await screen.findByText('liked your diary'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/profile/user-1/calendar?date=2026-03-17&diaryId=42',
      );
      expect(mockMarkNotificationAsRead).toHaveBeenCalledWith(1);
      expect(mockDecrementUnreadCount).toHaveBeenCalledTimes(1);
    });
  });

  it('LIKE 알림에 프로필 메타가 없으면 일기 조회 후 프로필 캘린더 상세 위치로 이동한다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([
        makeNotification({
          diaryDate: null,
          diaryUserId: null,
        }),
      ]),
    );

    renderClient();

    fireEvent.click(await screen.findByText('liked your diary'));

    await waitFor(() => {
      expect(mockGetDiaryById).toHaveBeenCalledWith(42);
      expect(mockPush).toHaveBeenCalledWith(
        '/profile/user-1/calendar?date=2026-03-17&diaryId=42',
      );
    });
  });

  it('FRIEND_DIARY 알림 클릭 시 페이지 이동 대신 일기 모달을 연다', async () => {
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

    await act(async () => {
      fireEvent.click(await screen.findByText('posted a new diary'));
    });

    await waitFor(() => {
      expect(mockGetDiaryById).toHaveBeenCalledWith(77);
      expect(screen.getByTestId('diary-detail-modal')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
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
      expect(mockPush).toHaveBeenCalledWith(
        '/profile/user-1/calendar?date=2026-03-17&diaryId=42',
      );
    });
    expect(mockMarkNotificationAsRead).not.toHaveBeenCalled();
    expect(mockDecrementUnreadCount).not.toHaveBeenCalled();
  });

  it('읽음 처리 실패 시 unread count를 줄이지 않고 이동한다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([makeNotification({ message: 'liked your diary' })]),
    );
    mockMarkNotificationAsRead.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/common/resource-not-found',
          title: 'Not Found',
          status: 404,
          detail: '알림을 찾을 수 없습니다.',
          instance: '/api/sse/1',
        },
      },
    });

    renderClient();

    fireEvent.click(await screen.findByText('liked your diary'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/profile/user-1/calendar?date=2026-03-17&diaryId=42',
      );
    });
    expect(mockDecrementUnreadCount).not.toHaveBeenCalled();
  });

  it('알림 삭제 실패 시 ProblemDetail.detail을 alert로 보여준다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([
        makeNotification({
          id: 4,
          isRead: true,
          message: 'delete me',
        }),
      ]),
    );
    mockDeleteNotification.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/common/internal-server-error',
          title: 'Internal Server Error',
          status: 500,
          detail: '알림 삭제에 실패했습니다.',
          instance: '/api/sse/4',
        },
      },
    });

    const alertSpy = vi.spyOn(window, 'alert');

    renderClient();

    fireEvent.click((await screen.findAllByRole('button'))[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('알림 삭제에 실패했습니다.');
    });
  });

  it('REPLY 알림 클릭 시 페이지 이동 대신 일기 모달을 연다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([
        makeNotification({
          type: 'REPLY',
          message: 'replied to your comment',
          relatedDiaryId: 42,
        }),
      ]),
    );

    renderClient();

    await act(async () => {
      fireEvent.click(await screen.findByText('replied to your comment'));
    });

    await waitFor(() => {
      expect(mockGetDiaryById).toHaveBeenCalledWith(42);
      expect(screen.getByTestId('diary-detail-modal')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('REPLY 알림 모달은 뒤로가기 시 알림 페이지로 돌아간다', async () => {
    mockGetNotifications.mockResolvedValue(
      makePage([
        makeNotification({
          type: 'REPLY',
          message: 'replied to your comment',
          relatedDiaryId: 42,
        }),
      ]),
    );
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    renderClient();

    await act(async () => {
      fireEvent.click(await screen.findByText('replied to your comment'));
    });

    expect(await screen.findByTestId('diary-detail-modal')).toBeInTheDocument();
    expect(pushStateSpy).toHaveBeenCalledWith(
      { modal: 'notification-diary-detail' },
      '',
    );

    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.queryByTestId('diary-detail-modal')).not.toBeInTheDocument();
    });
  });

  it('모바일에서 REPLY 알림 클릭 시 DiaryStoryModal을 연다', async () => {
    mockViewport.isDesktop = false;
    mockGetNotifications.mockResolvedValue(
      makePage([
        makeNotification({
          type: 'REPLY',
          message: 'replied to your comment',
          relatedDiaryId: 42,
        }),
      ]),
    );

    renderClient();

    await act(async () => {
      fireEvent.click(await screen.findByText('replied to your comment'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('diary-story-modal')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('diary-detail-modal')).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
