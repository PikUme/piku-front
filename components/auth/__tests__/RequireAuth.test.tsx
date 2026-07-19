import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RequireAuth from '../RequireAuth';
import useAuthStore from '@/components/store/authStore';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

const user = {
  id: 'u1',
  email: 'test@test.com',
  nickname: 'tester',
  avatar: 'http://example.com/avatar.png',
};

describe('RequireAuth', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    useAuthStore.setState({
      authStatus: 'checking',
      isLoggedIn: false,
      user: null,
    });
  });

  it('인증 확인 중에는 화면 문구 없이 접근 가능한 스피너를 표시한다', () => {
    render(
      <RequireAuth>
        <p>protected content</p>
      </RequireAuth>,
    );

    const status = screen.getByRole('status');
    const spinner = status.querySelector('svg');

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(status).toHaveClass(
      'flex',
      'h-screen',
      'items-center',
      'justify-center',
    );
    expect(status).not.toHaveAttribute('aria-label');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
    expect(spinner).toHaveClass('h-8', 'w-8', 'motion-safe:animate-spin');
    expect(
      screen.getByText('인증 상태를 확인하는 중입니다…'),
    ).toHaveClass('sr-only');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('anonymous로 확정되면 로그인 페이지로 보낸다', async () => {
    useAuthStore.setState({
      authStatus: 'anonymous',
      isLoggedIn: false,
      user: null,
    });

    render(
      <RequireAuth>
        <p>protected content</p>
      </RequireAuth>,
    );

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
  });

  it('authenticated이고 user가 있으면 children을 렌더링한다', () => {
    useAuthStore.setState({
      authStatus: 'authenticated',
      isLoggedIn: true,
      user,
    });

    render(
      <RequireAuth>
        <p>protected content</p>
      </RequireAuth>,
    );

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
