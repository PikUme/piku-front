import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import HomeRoot from '../HomeRoot';

vi.mock('@/components/store/authStore', () => ({
  default: () => ({ user: null }),
}));

vi.mock('@/components/home/HomeCalendar', () => ({
  default: () => <div data-testid="home-calendar" />,
}));

vi.mock('@/components/feed/FeedClient', () => ({
  default: () => <div data-testid="feed-client" />,
}));

describe('HomeRoot', () => {
  it('인증 확인 전에는 피드 로딩 UI를 표시하지 않는다', () => {
    const markup = renderToStaticMarkup(<HomeRoot />);

    expect(markup).toBe('');
    expect(markup).not.toContain('data-testid="feed-skeleton-card"');
    expect(markup).not.toContain('피드를 불러오는 중...');
  });
});
