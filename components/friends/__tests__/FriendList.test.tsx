import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaginatedFriendsResponse } from '@/types/friend';
import { getFriends } from '@/lib/api/friend';
import FriendList from '../FriendList';

vi.mock('@/lib/api/friend', () => ({
  getFriends: vi.fn(),
  deleteFriend: vi.fn(),
}));

vi.mock('@/components/common/UserProfile', () => ({
  default: ({ userId, nickname }: { userId: string; nickname: string }) => (
    <div data-testid={`friend-${userId}`}>{nickname}</div>
  ),
}));

vi.mock('@/components/feed/FriendActionConfirmModal', () => ({
  default: () => null,
}));

let intersectionCallback: IntersectionObserverCallback;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [0];
  takeRecords = vi.fn().mockReturnValue([]);
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

const mockGetFriends = vi.mocked(getFriends);

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const firstFriendPage: PaginatedFriendsResponse = {
  friends: [
    {
      userId: 'friend-1',
      nickname: '친구 한 명',
      avatar: '',
    },
  ],
  hasNext: true,
  totalElements: 2,
};

describe('FriendList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('첫 페이지를 불러오는 동안 친구 행 스켈레톤 5개를 표시한다', () => {
    mockGetFriends.mockReturnValue(
      createDeferred<PaginatedFriendsResponse>().promise,
    );

    render(<FriendList />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getAllByTestId('friend-list-skeleton-row')).toHaveLength(5);
    expect(
      screen.queryByText('친구를 불러오는 중...'),
    ).not.toBeInTheDocument();
  });

  it('첫 페이지 조회가 끝나면 스켈레톤을 실제 친구 목록으로 교체한다', async () => {
    mockGetFriends.mockResolvedValue({ ...firstFriendPage, hasNext: false });

    render(<FriendList />);

    expect(await screen.findByTestId('friend-friend-1')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('다음 페이지를 불러오는 동안 기존 목록 아래에 스켈레톤 1개를 표시한다', async () => {
    mockGetFriends
      .mockResolvedValueOnce(firstFriendPage)
      .mockReturnValueOnce(createDeferred<PaginatedFriendsResponse>().promise);

    render(<FriendList />);

    expect(await screen.findByTestId('friend-friend-1')).toBeInTheDocument();

    await act(async () => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        new MockIntersectionObserver(
          () => {},
        ) as unknown as IntersectionObserver,
      );
    });

    await waitFor(() => {
      expect(mockGetFriends).toHaveBeenNthCalledWith(2, 1, 20);
    });
    expect(screen.getByTestId('friend-friend-1')).toBeInTheDocument();
    expect(screen.getAllByTestId('friend-list-skeleton-row')).toHaveLength(1);
  });
});
