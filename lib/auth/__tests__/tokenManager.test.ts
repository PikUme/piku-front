import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TOKEN_KEY } from '@/lib/constants';
import { refreshAccessToken } from '../tokenManager';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockPost = vi.mocked(axios.post);

describe('tokenManager refreshAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('네트워크 오류로 재발급 요청이 실패하면 기존 토큰을 유지한다', async () => {
    const networkError = new Error('Network Error');
    localStorage.setItem(AUTH_TOKEN_KEY, 'existing-access-token');
    mockPost.mockRejectedValueOnce(networkError);

    await expect(refreshAccessToken()).rejects.toBe(networkError);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('existing-access-token');
  });

  it('서버 일시 장애로 재발급 요청이 실패하면 기존 토큰을 유지한다', async () => {
    const serverError = { response: { status: 503 } };
    localStorage.setItem(AUTH_TOKEN_KEY, 'existing-access-token');
    mockPost.mockRejectedValueOnce(serverError);

    await expect(refreshAccessToken()).rejects.toBe(serverError);

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('existing-access-token');
  });
});
