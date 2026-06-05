import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FriendsClient from '../FriendsClient';
import { getFriendRequests } from '@/lib/api/friend';

const { searchParamsState } = vi.hoisted(() => ({
  searchParamsState: { value: '' },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock('../FriendList', () => ({
  default: () => <div data-testid="friend-list">친구 목록</div>,
}));

vi.mock('../FriendRequestList', () => ({
  default: () => <div data-testid="request-list">친구 요청 목록</div>,
}));

vi.mock('@/lib/api/friend', () => ({
  getFriendRequests: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
}));

const mockGetFriendRequests = vi.mocked(getFriendRequests);

describe('FriendsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = '';
    mockGetFriendRequests.mockResolvedValue({
      requests: [],
      hasNext: false,
      totalElements: 0,
    });
  });

  it('기본 진입 시 친구 목록 탭을 보여준다', async () => {
    render(<FriendsClient />);

    expect(screen.getByTestId('friend-list')).toBeInTheDocument();
    expect(screen.queryByTestId('request-list')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetFriendRequests).toHaveBeenCalledWith(0, 10);
    });
  });

  it('tab=requests 쿼리로 진입하면 친구 요청 탭을 보여준다', async () => {
    searchParamsState.value = 'tab=requests';

    render(<FriendsClient />);

    expect(screen.getByTestId('request-list')).toBeInTheDocument();
    expect(screen.queryByTestId('friend-list')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetFriendRequests).toHaveBeenCalledWith(0, 10);
    });
  });
});
