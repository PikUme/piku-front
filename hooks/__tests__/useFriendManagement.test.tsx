import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFriendManagement } from '../useFriendManagement';
import { getFriends, sendFriendRequest } from '@/lib/api/friend';

vi.mock('@/lib/api/friend', () => ({
  cancelFriendRequest: vi.fn(),
  deleteFriend: vi.fn(),
  getFriends: vi.fn(),
  getProfileInfo: vi.fn(),
  sendFriendRequest: vi.fn(),
}));

describe('useFriendManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFriends).mockReturnValue(new Promise(() => {}));
  });

  it('친구 요청 액션을 반복 실행해도 친구 요청은 한 번만 보낸다', () => {
    vi.mocked(sendFriendRequest).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFriendManagement('viewer-id'));

    act(() => {
      void result.current.handleFriendAction('target-user');
      void result.current.handleFriendAction('target-user');
    });

    expect(sendFriendRequest).toHaveBeenCalledTimes(1);
    expect(sendFriendRequest).toHaveBeenCalledWith('target-user');
  });
});
