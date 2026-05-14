import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useAuthStore from '../authStore';
import { AUTH_TOKEN_KEY } from '@/lib/constants';

describe('authStore login', () => {
  beforeEach(() => {
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

  it('토큰과 유저가 있으면 authenticated 상태로 확정한다', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'access-token');

    act(() => {
      useAuthStore.setState({
        user: {
          id: 'u1',
          email: 'test@test.com',
          nickname: 'test',
          avatar: 'http://example.com/img.png',
        },
      });
      useAuthStore.getState().checkAuth();
    });

    expect(useAuthStore.getState().authStatus).toBe('authenticated');
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it('토큰이 없으면 anonymous 상태로 확정한다', () => {
    act(() => {
      useAuthStore.getState().checkAuth();
    });

    expect(useAuthStore.getState().authStatus).toBe('anonymous');
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
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
