import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BottomNav from '../BottomNav';
import GuestBottomNav from '../GuestBottomNav';

const { pathnameState } = vi.hoisted(() => ({
  pathnameState: { value: '/' },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameState.value,
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
    pathnameState.value = '/';
  });

  it('로그인 사용자 하단 네비게이션은 홈, 피드, 오늘의 일기, 검색, 더보기 순서로 표시한다', () => {
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

    const controls = Array.from(footer!.querySelectorAll('a, button')).map(
      element => element.getAttribute('aria-label'),
    );
    expect(controls).toEqual(['홈', '피드', '오늘의 일기', '검색', '더보기']);

    const diaryLink = screen.getByRole('link', { name: '오늘의 일기' });
    expect(diaryLink).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/diary\/new\/\d{4}-\d{2}-\d{2}$/),
    );
    expect(diaryLink.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('fox-navi.png'),
    );
    expect(diaryLink.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.queryByRole('link', { name: '친구' })).not.toBeInTheDocument();
    expect(within(footer!).getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
  });

  it('로그인 사용자 하단 네비게이션은 84px 표면과 58px 여우 이미지를 사용한다', () => {
    render(<BottomNav />);

    const navigation = screen.getByRole('navigation', {
      name: '모바일 하단 네비게이션',
    });
    const diaryLink = screen.getByRole('link', { name: '오늘의 일기' });
    const curve = screen.getByTestId('bottom-nav-curve');

    expect(navigation.parentElement).toHaveClass(
      'h-[calc(84px_+_env(safe-area-inset-bottom))]',
    );
    expect(diaryLink).toHaveClass('top-[6px]', 'h-[58px]', 'w-[58px]');
    expect(curve).toHaveAttribute('viewBox', '0 0 96 84');
    expect(curve.querySelector('path')).toHaveAttribute(
      'd',
      'M0 35 C4 35 8.2 33.9 9.59 41.77 C12.88 60.4 29.07 74 48 74 C66.93 74 83.12 60.4 86.41 41.77 C87.8 33.9 92 35 96 35 V84 H0 Z',
    );
  });

  it('현재 경로에 해당하는 링크는 현재 페이지로 표시한다', () => {
    pathnameState.value = '/feed';

    render(<BottomNav />);

    expect(screen.getByRole('link', { name: '피드' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: '홈' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('친구 페이지에서는 더보기 그룹이 활성 상태로 표시된다', () => {
    pathnameState.value = '/friends';

    render(<BottomNav />);

    expect(screen.getByRole('button', { name: '더보기' })).not.toHaveClass(
      'text-gray-400',
    );
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

  it('게스트 하단 네비게이션은 피드를 제외하고 프로필 아이콘으로 로그인 링크를 보여준다', () => {
    const { container } = render(<GuestBottomNav />);
    const footer = container.querySelector('footer');

    expect(footer).not.toBeNull();
    expectNoFooterLabelText(footer!, ['홈', '피드', '검색', '로그인']);
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: '피드' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '검색' })).toHaveAttribute('href', '/search');
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
    expect(within(footer!).getAllByRole('link')).toHaveLength(3);
    expect(footer!.querySelector('.lucide-user')).toBeInTheDocument();
  });

  it('게스트 하단 네비게이션은 아이콘 전용 상태의 상하 여백을 1.8배로 유지한다', () => {
    const { container } = render(<GuestBottomNav />);
    const footer = container.querySelector('footer');

    expect(footer).not.toBeNull();
    expectExpandedVerticalPadding(container, footer!);
  });
});
