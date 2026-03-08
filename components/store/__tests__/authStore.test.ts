import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import useAuthStore from '../authStore';

describe('authStore login', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().logout();
    });
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
