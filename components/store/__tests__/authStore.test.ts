import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import useAuthStore from '../authStore';
import { AUTH_TOKEN_KEY } from '@/lib/constants';

const { getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
}));

vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: getCurrentUserMock,
}));

describe('authStore login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    act(() => {
      useAuthStore.setState({
        authStatus: 'checking',
        isLoggedIn: false,
        user: null,
      });
    });
  });

  it('AuthStatus 타입으로 인증 확인 상태를 관리한다', () => {
    const status = useAuthStore.getState().authStatus;

    expect(status).toBe('checking');
  });

  it('토큰과 유저가 있으면 authenticated 상태로 확정한다', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'access-token');

    await act(async () => {
      useAuthStore.setState({
        user: {
          id: 'u1',
          email: 'test@test.com',
          nickname: 'test',
          avatar: 'http://example.com/img.png',
        },
      });
      await useAuthStore.getState().checkAuth();
    });

    expect(useAuthStore.getState().authStatus).toBe('authenticated');
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it('토큰이 없으면 anonymous 상태로 확정한다', async () => {
    await act(async () => {
      await useAuthStore.getState().checkAuth();
    });

    expect(useAuthStore.getState().authStatus).toBe('anonymous');
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('토큰은 있지만 유저가 없으면 현재 사용자 API로 인증 상태를 복구한다', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'access-token');
    getCurrentUserMock.mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      nickname: 'test',
      avatar: 'characters/fixed/img.png',
    });

    await act(async () => {
      await useAuthStore.getState().checkAuth();
    });

    const user = useAuthStore.getState().user;
    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().authStatus).toBe('authenticated');
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(user?.id).toBe('u1');
    expect(user?.avatar).toContain('characters/fixed/img.png');
    expect(user?.avatar).toMatch(/^http/);
  });

  it('avatar 필드가 있으면 풀 URL로 변환한다', () => {
    act(() => {
      useAuthStore.getState().login({
        id: 'u1',
        email: 'test@test.com',
        nickname: 'test',
        avatar: 'characters/fixed/img.png',
      });
    });

    const user = useAuthStore.getState().user;
    expect(useAuthStore.getState().authStatus).toBe('authenticated');
    expect(user?.avatar).toContain('characters/fixed/img.png');
    expect(user?.avatar).toMatch(/^http/);
  });

  it('avatarUrl 필드만 있으면 fallback으로 사용한다', () => {
    act(() => {
      useAuthStore.getState().login({
        id: 'u1',
        email: 'test@test.com',
        nickname: 'test',
        avatar: '',
        avatarUrl: 'characters/fixed/img.png',
      } as any);
    });

    const user = useAuthStore.getState().user;
    expect(user?.avatar).toContain('characters/fixed/img.png');
    expect(user?.avatar).toMatch(/^http/);
  });

  it('avatar가 이미 http URL이면 그대로 사용한다', () => {
    act(() => {
      useAuthStore.getState().login({
        id: 'u1',
        email: 'test@test.com',
        nickname: 'test',
        avatar: 'http://example.com/img.png',
      });
    });

    const user = useAuthStore.getState().user;
    expect(user?.avatar).toBe('http://example.com/img.png');
  });
});
