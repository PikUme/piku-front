import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '../auth';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCurrentUser는 GET /auth/me의 user를 반환한다', async () => {
    const user = {
      id: 'u1',
      email: 'test@test.com',
      nickname: 'test',
      avatar: 'http://example.com/avatar.png',
    };
    mockGet.mockResolvedValue({ data: { user } });

    const result = await getCurrentUser();

    expect(mockGet).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(user);
  });

  it('회원가입 인증·가입 요청은 응답을 캐시하지 않도록 no-store를 지정한다', async () => {
    mockPost.mockResolvedValue({ data: { message: 'ok', expiresAt: '2026-09-28T09:05:00' } });
    const { sendSignUpVerificationEmail, verifyCode, signup } = await import('../auth');

    await sendSignUpVerificationEmail('test@example.com');
    await verifyCode({ email: 'test@example.com', code: '123456', type: 'SIGN_UP' });
    await signup({ email: 'test@example.com', password: 'Password1!', nickname: 'tester', character: '1', emailVerificationToken: 'token' });

    expect(mockPost).toHaveBeenNthCalledWith(1, '/auth/send-verification/sign-up', { email: 'test@example.com' }, { headers: { 'Cache-Control': 'no-store' } });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/auth/verify-code', { email: 'test@example.com', code: '123456', type: 'SIGN_UP' }, { headers: { 'Cache-Control': 'no-store' } });
    expect(mockPost).toHaveBeenNthCalledWith(3, '/auth/signup', { email: 'test@example.com', password: 'Password1!', nickname: 'tester', emailVerificationToken: 'token', fixedCharacterId: 1 }, { headers: { 'Cache-Control': 'no-store' } });
  });
});
