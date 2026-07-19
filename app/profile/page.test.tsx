import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileRedirectPage from './page';

const { mockReplace } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/components/auth/RequireAuth', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/store/authStore', () => ({
  default: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'user-1' } }),
}));

describe('ProfileRedirectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('현재 사용자 프로필로 이동하는 동안 같은 스켈레톤을 표시한다', async () => {
    render(<ProfileRedirectPage />);

    expect(
      screen.getByRole('status', { name: '프로필을 불러오는 중' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('프로필 페이지로 이동 중입니다...'),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/profile/user-1'),
    );
  });
});
