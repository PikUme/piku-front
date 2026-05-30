import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BottomNav from '../BottomNav';
import GuestBottomNav from '../GuestBottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const expectNoFooterLabelText = (footer: HTMLElement, labels: string[]) => {
  labels.forEach(label => {
    expect(within(footer).queryByText(label)).not.toBeInTheDocument();
  });
};

describe('BottomNav', () => {
  it('로그인 사용자 하단 네비게이션은 아이콘 라벨 텍스트를 보이지 않는다', () => {
    const { container } = render(<BottomNav />);
    const footer = container.querySelector('footer');

    expect(footer).not.toBeNull();
    expectNoFooterLabelText(footer!, [
      '홈',
      '피드',
      '검색',
      '오늘의 일기',
      '일기',
      '친구',
      '더보기',
    ]);
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '피드' })).toHaveAttribute('href', '/feed');
    expect(screen.getByRole('link', { name: '검색' })).toHaveAttribute('href', '/search');
    expect(screen.getByRole('link', { name: '오늘의 일기' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/diary\/new\/\d{4}-\d{2}-\d{2}$/),
    );
    expect(screen.getByRole('link', { name: '친구' })).toHaveAttribute('href', '/friends');
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
  });

  it('게스트 하단 네비게이션은 아이콘 라벨 텍스트를 보이지 않는다', () => {
    const { container } = render(<GuestBottomNav />);
    const footer = container.querySelector('footer');

    expect(footer).not.toBeNull();
    expectNoFooterLabelText(footer!, ['홈', '피드', '검색', '로그인']);
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '피드' })).toHaveAttribute('href', '/feed');
    expect(screen.getByRole('link', { name: '검색' })).toHaveAttribute('href', '/search');
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  });
});
