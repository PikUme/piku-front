import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelFriendRequest, sendFriendRequest } from '../friend';
import api from '@/lib/api/api';

vi.mock('@/lib/api/api', () => ({
  default: {
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

const mockDelete = vi.mocked(api.delete);
const mockPost = vi.mocked(api.post);

describe('friend API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('같은 사용자에게 친구 요청이 진행 중이면 네트워크 요청은 한 번만 보낸다', async () => {
    const response = {
      isAccepted: false,
      message: '친구 요청을 보냈습니다.',
    };
    let resolveRequest: (value: { data: typeof response }) => void = () => {};
    mockPost.mockReturnValue(
      new Promise(resolve => {
        resolveRequest = resolve;
      }),
    );

    const firstResult = sendFriendRequest('target-user');
    const secondResult = sendFriendRequest('target-user');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/relation', {
      toUserId: 'target-user',
    });

    resolveRequest({ data: response });

    await expect(firstResult).resolves.toEqual(response);
    await expect(secondResult).resolves.toEqual(response);
  });

  it('서로 다른 사용자에게 보내는 친구 요청은 각각 전송한다', async () => {
    mockPost.mockResolvedValue({
      data: {
        isAccepted: false,
        message: '친구 요청을 보냈습니다.',
      },
    });

    await sendFriendRequest('target-user-1');
    await sendFriendRequest('target-user-2');

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenNthCalledWith(1, '/relation', {
      toUserId: 'target-user-1',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/relation', {
      toUserId: 'target-user-2',
    });
  });

  it('친구 요청 실패 후 같은 사용자에게 다시 요청할 수 있다', async () => {
    const failure = new Error('network error');
    const response = {
      isAccepted: false,
      message: '친구 요청을 보냈습니다.',
    };
    mockPost
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ data: response });

    await expect(sendFriendRequest('retry-user')).rejects.toThrow(
      'network error',
    );

    await expect(sendFriendRequest('retry-user')).resolves.toEqual(response);

    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('친구 요청을 취소한 뒤 같은 사용자에게 다시 요청하면 새 네트워크 요청을 보낸다', async () => {
    const response = {
      isAccepted: false,
      message: '친구 요청을 보냈습니다.',
    };
    mockPost.mockResolvedValue({ data: response });
    mockDelete.mockResolvedValue({
      data: {
        isAccepted: false,
        message: '친구 요청을 취소했습니다.',
      },
    });

    await sendFriendRequest('resend-user');
    await cancelFriendRequest('resend-user');
    await sendFriendRequest('resend-user');

    expect(mockDelete).toHaveBeenCalledWith('/relation/cancel/resend-user');
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenNthCalledWith(1, '/relation', {
      toUserId: 'resend-user',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/relation', {
      toUserId: 'resend-user',
    });
  });
});
