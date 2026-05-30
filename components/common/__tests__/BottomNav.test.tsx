import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BottomNav from '../BottomNav';
import GuestBottomNav from '../GuestBottomNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/api/auth', () => ({
  logout: vi.fn(),
}));

vi.mock('../InquiryModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="inquiry-modal">
      <button onClick={onClose}>피드백 닫기</button>
    </div>
  ),
}));

const expectNoFooterLabelText = (footer: HTMLElement, labels: string[]) => {
  labels.forEach(label => {
    expect(within(footer).queryByText(label)).not.toBeInTheDocument();
  });
};

const expectExpandedVerticalPadding = (container: HTMLElement, footer: HTMLElement) => {
  expect(footer).toHaveClass('pt-[0.9rem]');
  expect(container.querySelector('style')?.textContent).toContain(
    'padding-bottom: calc(0.9rem + env(safe-area-inset-bottom))',
  );
};

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('로그인 사용자 하단 네비게이션은 아이콘 전용 상태의 상하 여백을 1.8배로 유지한다', () => {
    const { container } = render(<BottomNav />);
    const footer = container.querySelector('footer');

    expect(footer).not.toBeNull();
    expectExpandedVerticalPadding(container, footer!);
  });

  it('모바일 더보기 메뉴에서 뒤로가기를 하면 메뉴만 닫고 페이지를 유지한다', async () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    render(<BottomNav />);

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));

    expect(screen.getByRole('link', { name: '프로필' })).toBeInTheDocument();
    await waitFor(() => {
      expect(pushStateSpy).toHaveBeenCalledWith({ modal: 'bottom-nav-menu' }, '');
    });

    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: '프로필' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
  });

  it('모바일 더보기에서 연 피드백 모달은 뒤로가기 시 피드백만 닫고 페이지를 유지한다', async () => {
    render(<BottomNav />);

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('button', { name: '피드백' }));

    expect(screen.getByTestId('inquiry-modal')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '프로필' })).not.toBeInTheDocument();

    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.queryByTestId('inquiry-modal')).not.toBeInTheDocument();
    });
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

  it('게스트 하단 네비게이션은 아이콘 전용 상태의 상하 여백을 1.8배로 유지한다', () => {
    const { container } = render(<GuestBottomNav />);
    const footer = container.querySelector('footer');

    expect(footer).not.toBeNull();
    expectExpandedVerticalPadding(container, footer!);
  });
});
