import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BottomNav from '../BottomNav';
import GuestBottomNav from '../GuestBottomNav';

const { pathnameState, authState } = vi.hoisted(() => ({
  pathnameState: { value: '/' },
  authState: {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      nickname: '픽쿠',
      avatar: 'https://example.com/characters/base_image_1.webp',
      avatarUrl: 'https://example.com/characters/base_image_1.webp' as
        | string
        | null
        | undefined,
    },
  },
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

vi.mock('@/components/store/authStore', () => ({
  default: (selector: (state: typeof authState) => unknown) =>
    selector(authState),
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

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameState.value = '/';
    authState.user.avatar = 'https://example.com/characters/base_image_1.webp';
    authState.user.avatarUrl = 'https://example.com/characters/base_image_1.webp';
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
    const diaryImage = diaryLink.querySelector('img');
    expect(decodeURIComponent(diaryImage?.getAttribute('src') ?? '')).toContain(
      '/bottom-nav/fox.webp',
    );
    expect(diaryImage).toHaveAttribute('alt', '');
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

  it.each([
    ['base_image_1.webp', 'fox.webp'],
    ['base_image_2.webp', 'pencil.webp'],
    ['base_image_3.webp', 'bread.webp'],
    ['base_image_4.webp', 'cat.webp'],
  ])(
    'avatarUrl의 %s 파일명을 중앙 %s 이미지로 표시한다',
    (avatarFilename, bottomNavFilename) => {
      authState.user.avatarUrl =
        `https://cdn.example.com/characters/${avatarFilename}?version=2#preview`;

      render(<BottomNav />);

      const diaryImage = screen
        .getByRole('link', { name: '오늘의 일기' })
        .querySelector('img');
      expect(decodeURIComponent(diaryImage?.getAttribute('src') ?? '')).toContain(
        `/bottom-nav/${bottomNavFilename}`,
      );
    },
  );

  it('알 수 없는 avatarUrl은 여우 이미지를 기본값으로 표시한다', () => {
    authState.user.avatarUrl = 'https://cdn.example.com/characters/custom.webp';

    render(<BottomNav />);

    const diaryImage = screen
      .getByRole('link', { name: '오늘의 일기' })
      .querySelector('img');
    expect(decodeURIComponent(diaryImage?.getAttribute('src') ?? '')).toContain(
      '/bottom-nav/fox.webp',
    );
  });

  it('avatarUrl이 없으면 avatar 값과 무관하게 여우 이미지를 표시한다', () => {
    authState.user.avatar = 'https://cdn.example.com/characters/base_image_2.webp';
    authState.user.avatarUrl = undefined;

    render(<BottomNav />);

    const diaryImage = screen
      .getByRole('link', { name: '오늘의 일기' })
      .querySelector('img');
    expect(decodeURIComponent(diaryImage?.getAttribute('src') ?? '')).toContain(
      '/bottom-nav/fox.webp',
    );
  });

  it('하단 네비게이션 상단 윤곽선은 하나의 SVG 레이어에서 이어서 표시한다', () => {
    render(<BottomNav />);

    expect(screen.getByTestId('bottom-nav-surface-left')).not.toHaveClass(
      'border-t',
    );
    expect(screen.getByTestId('bottom-nav-surface-right')).not.toHaveClass(
      'border-t',
    );

    const outlineLayer = screen.getByTestId('bottom-nav-outline-layer');
    const straightSegments = outlineLayer.querySelectorAll('line');
    const outline = screen.getByTestId('bottom-nav-outline');

    expect(straightSegments).toHaveLength(2);
    expect(straightSegments[0]).toHaveAttribute('y1', '35');
    expect(straightSegments[0]).toHaveAttribute('y2', '35');
    expect(straightSegments[1]).toHaveAttribute('y1', '35');
    expect(straightSegments[1]).toHaveAttribute('y2', '35');
    expect(outlineLayer).toContainElement(outline);
    expect(outlineLayer).toHaveClass(
      'stroke-gray-200',
      'dark:stroke-gray-700',
    );
    expect(outline).toHaveAttribute('fill', 'none');
    expect(outline).toHaveAttribute('stroke-width', '1');
    expect(outline).toHaveAttribute(
      'd',
      'M0 35 C4 35 8.2 33.9 9.59 41.77 C12.88 60.4 29.07 74 48 74 C66.93 74 83.12 60.4 86.41 41.77 C87.8 33.9 92 35 96 35',
    );
    expect(outline).toHaveClass('stroke-gray-200', 'dark:stroke-gray-700');
  });

  it('중앙 윤곽선 이동은 Safari가 지원하는 g transform에 적용한다', () => {
    render(<BottomNav />);

    const outline = screen.getByTestId('bottom-nav-outline');
    const outlineGroup = outline.parentElement;
    const outlineViewport = outlineGroup?.parentElement;

    expect(outlineGroup?.tagName.toLowerCase()).toBe('g');
    expect(outlineGroup).toHaveAttribute('transform', 'translate(-48 0)');
    expect(outlineViewport?.tagName.toLowerCase()).toBe('svg');
    expect(outlineViewport).toHaveAttribute('x', '50%');
    expect(outlineViewport).not.toHaveAttribute('transform');
  });

  it('하단 네비게이션 배경 전체에 중간 강도의 그림자를 한 번만 적용한다', () => {
    render(<BottomNav />);

    expect(screen.getByTestId('bottom-nav-surface')).toHaveClass(
      'drop-shadow-[0_-4px_7px_rgba(0,0,0,0.17)]',
      'dark:drop-shadow-[0_-4px_7px_rgba(148,163,184,0.12)]',
    );
    expect(screen.getByTestId('bottom-nav-curve')).not.toHaveClass(
      'drop-shadow-[0_-5px_11px_rgba(69,43,20,0.12)]',
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

  it('로그인 사용자 측면 컨트롤은 터치 누름 상태를 표시한다', () => {
    render(<BottomNav />);

    ['홈', '피드', '검색', '더보기'].forEach(name => {
      expect(screen.getByRole(name === '더보기' ? 'button' : 'link', { name }))
        .toHaveClass('active:opacity-70');
    });
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

  it('게스트 하단 네비게이션은 피드, 이미지 로그인, 검색 순서로 표시한다', () => {
    const { container } = render(<GuestBottomNav />);
    const footer = container.querySelector('footer');

    expect(footer).not.toBeNull();
    expectNoFooterLabelText(footer!, ['피드', '검색', '로그인']);
    const controls = Array.from(footer!.querySelectorAll('a')).map(
      element => element.getAttribute('aria-label'),
    );
    expect(controls).toEqual(['피드', '로그인', '검색']);
    expect(screen.getByRole('link', { name: '피드' })).toHaveAttribute(
      'href',
      '/feed',
    );
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: '검색' })).toHaveAttribute(
      'href',
      '/search',
    );
    expect(within(footer!).getAllByRole('link')).toHaveLength(3);
    const loginImage = screen
      .getByRole('link', { name: '로그인' })
      .querySelector('img');
    expect(decodeURIComponent(loginImage?.getAttribute('src') ?? '')).toContain(
      '/bottom-nav/fox.webp',
    );
    expect(loginImage).toHaveAttribute('alt', '');
  });

  it('게스트 하단 네비게이션은 로그인 사용자용과 같은 곡선 표면을 사용한다', () => {
    render(<GuestBottomNav />);

    const navigation = screen.getByRole('navigation', {
      name: '모바일 게스트 하단 네비게이션',
    });
    const loginLink = screen.getByRole('link', { name: '로그인' });
    const surface = screen.getByTestId('guest-bottom-nav-surface');
    const curve = screen.getByTestId('guest-bottom-nav-curve');
    const outlineLayer = screen.getByTestId('guest-bottom-nav-outline-layer');

    expect(navigation.parentElement).toHaveClass(
      'h-[calc(84px_+_env(safe-area-inset-bottom))]',
    );
    expect(loginLink).toHaveClass('top-[6px]', 'h-[58px]', 'w-[58px]');
    expect(surface).toHaveClass(
      'drop-shadow-[0_-4px_7px_rgba(0,0,0,0.17)]',
      'dark:drop-shadow-[0_-4px_7px_rgba(148,163,184,0.12)]',
    );
    expect(curve).toHaveAttribute('viewBox', '0 0 96 84');
    expect(outlineLayer).toHaveClass(
      'stroke-gray-200',
      'dark:stroke-gray-700',
    );
  });

  it('게스트 측면 링크는 터치 누름 상태를 표시한다', () => {
    render(<GuestBottomNav />);

    ['피드', '검색'].forEach(name => {
      expect(screen.getByRole('link', { name })).toHaveClass(
        'active:opacity-70',
      );
    });
  });
});
