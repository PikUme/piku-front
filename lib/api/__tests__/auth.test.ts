import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '../auth';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockGet = vi.mocked(api.get);

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCurrentUser는 GET /auth/me의 user를 반환한다', async () => {
    const user = {
      id: 'u1',
      nickname: 'test',
      avatar: 'http://example.com/avatar.png',
    };
    mockGet.mockResolvedValue({ data: { user } });

    const result = await getCurrentUser();

    expect(mockGet).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(user);
  });
});
