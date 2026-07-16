import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FeedPage from './page';

vi.mock('@/components/feed/FeedClient', () => ({
  default: () => {
    throw new Promise(() => {});
  },
}));

describe('FeedPage', () => {
  it('피드 클라이언트가 준비되는 동안 카드 스켈레톤 2개를 표시한다', () => {
    render(<FeedPage />);

    const loadingStatus = screen.getByRole('status', {
      name: '피드를 불러오는 중',
    });

    expect(screen.getAllByTestId('feed-skeleton-card')).toHaveLength(2);
    expect(loadingStatus.parentElement).toHaveClass('xl:pt-[73px]');
    expect(screen.queryByText('피드를 불러오는 중...')).not.toBeInTheDocument();
  });
});
