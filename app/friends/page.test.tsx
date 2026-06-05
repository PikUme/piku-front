import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FriendsPage from './page';

vi.mock('@/components/auth/RequireAuth', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="require-auth">{children}</div>
  ),
}));

vi.mock('@/components/friends/FriendsClient', () => ({
  default: () => {
    throw new Promise(() => {});
  },
}));

describe('FriendsPage', () => {
  it('친구 클라이언트가 준비될 때까지 로딩 fallback을 보여준다', () => {
    render(<FriendsPage />);

    expect(screen.getByTestId('require-auth')).toBeInTheDocument();
    expect(screen.getByText('친구 정보를 불러오는 중...')).toBeInTheDocument();
  });
});
