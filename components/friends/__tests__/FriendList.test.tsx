import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
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
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('연속 교차 이벤트에도 다음 페이지를 한 번만 조회하고 중복 친구를 제거한 뒤 종료한다', async () => {
    const secondPage = createDeferred<PaginatedFriendsResponse>();
    mockGetFriends.mockResolvedValueOnce(firstFriendPage).mockReturnValueOnce(secondPage.promise);
    render(<FriendList />);
    await screen.findByTestId('friend-friend-1');

    await act(async () => {
      const callback = intersectionCallback;
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(mockGetFriends.mock.calls).toEqual([[0, 20], [1, 20]]);

    await act(async () => secondPage.resolve({
      friends: [...firstFriendPage.friends, { userId: 'friend-2', nickname: '두 번째 친구', avatar: '' }],
      hasNext: false,
      totalElements: 2,
    }));
    expect(screen.getAllByTestId('friend-friend-1')).toHaveLength(1);
    expect(screen.getByTestId('friend-friend-2')).toBeInTheDocument();
    await act(async () => intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(mockGetFriends).toHaveBeenCalledTimes(2);
  });

  it('추가 조회가 실패하면 기존 친구를 유지하고 같은 페이지를 재시도한다', async () => {
    mockGetFriends.mockResolvedValueOnce(firstFriendPage).mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ friends: [{ userId: 'friend-2', nickname: '다음 친구', avatar: '' }], hasNext: false, totalElements: 2 });
    render(<FriendList />);
    await screen.findByTestId('friend-friend-1');
    await act(async () => intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

    expect(screen.getByTestId('friend-friend-1')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    await screen.findByTestId('friend-friend-2');
    expect(mockGetFriends.mock.calls).toEqual([[0, 20], [1, 20], [1, 20]]);
  });

  it('빈 첫 페이지가 마지막이면 빈 목록을 표시하고 요청을 마친다', async () => {
    mockGetFriends.mockResolvedValue({ friends: [], hasNext: false, totalElements: 0 });
    render(<FriendList />);
    await screen.findByText('친구 목록이 비었습니다.');
    expect(mockGetFriends.mock.calls).toEqual([[0, 20]]);
  });

  it('StrictMode에서도 진행 중인 첫 페이지를 중복 요청하지 않는다', async () => {
    const response = createDeferred<PaginatedFriendsResponse>();
    mockGetFriends.mockReturnValue(response.promise);
    render(<StrictMode><FriendList /></StrictMode>);
    expect(mockGetFriends.mock.calls).toEqual([[0, 20]]);
    await act(async () => response.resolve({ ...firstFriendPage, hasNext: false }));
    expect(screen.getByTestId('friend-friend-1')).toBeInTheDocument();
  });

  it('첫 페이지 실패는 빈 목록으로 표시하지 않고 0번 페이지를 재시도한다', async () => {
    mockGetFriends.mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ...firstFriendPage, hasNext: false });
    render(<FriendList />);
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    expect(screen.queryByText('친구 목록이 비었습니다.')).not.toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByTestId('friend-friend-1');
    expect(mockGetFriends.mock.calls).toEqual([[0, 20], [0, 20]]);
  });

  it('화면을 닫은 뒤 이전 교차 이벤트로 후속 페이지를 요청하지 않는다', async () => {
    mockGetFriends.mockResolvedValueOnce(firstFriendPage);
    const { unmount } = render(<FriendList />);
    await screen.findByTestId('friend-friend-1');
    const callback = intersectionCallback;
    unmount();
    await act(async () => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(mockGetFriends.mock.calls).toEqual([[0, 20]]);
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
