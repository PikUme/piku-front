import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeCalendar from '../HomeCalendar';
import type { DiaryDetail } from '@/types/diary';

const loadDiaryDetailMock = vi.fn();
let selectedDiaryMock: DiaryDetail | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} />,
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({
        children,
        variants: _variants,
        custom: _custom,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div {...props}>{children}</div>
      ),
    },
  };
});

vi.mock('react-responsive', () => ({
  useMediaQuery: () => true,
}));

vi.mock('@/components/store/authStore', () => ({
  default: () => ({
    user: {
      id: 'user-1',
      email: 'user@example.com',
      nickname: '픽쿠야',
      avatar: '',
    },
  }),
}));

vi.mock('@/hooks/useFriendManagement', () => ({
  useFriendManagement: () => ({
    viewedUser: undefined,
    fetchFriendStatus: vi.fn(),
    nextFriend: vi.fn(),
    prevFriend: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCalendarNavigation', () => ({
  useCalendarNavigation: () => ({
    currentDate: new Date('2026-05-15T00:00:00'),
    setCurrentDate: vi.fn(),
    isPickerOpen: false,
    setIsPickerOpen: vi.fn(),
    direction: 'up',
    containerRef: { current: null },
    swipeHandlers: {},
  }),
}));

vi.mock('@/hooks/useDiaryData', () => ({
  useDiaryData: () => ({
    pikus: {},
    selectedDiary: selectedDiaryMock,
    isLoading: false,
    loadDiaryDetail: loadDiaryDetailMock,
    closeDiaryDetail: vi.fn(),
    removeDiary: vi.fn(),
  }),
}));

vi.mock('@/hooks/useBodyScrollLock', () => ({
  useBodyScrollLock: vi.fn(),
}));

vi.mock('@/components/calendar/PikuCalendar', () => ({
  default: () => <div data-testid="piku-calendar">calendar</div>,
}));

vi.mock('@/components/diary/DiaryDetailModal', () => ({
  default: () => <div data-testid="diary-detail-modal" />,
}));

vi.mock('@/components/diary/DiaryStoryModal', () => ({
  default: () => <div data-testid="diary-story-modal" />,
}));

const diary: DiaryDetail = {
  diaryId: 1,
  content: '테스트 일기',
  date: '2026-05-15',
  status: 'PUBLIC',
  createdAt: '2026-05-15T10:00:00',
  updatedAt: '2026-05-15T10:00:00',
  isLiked: false,
  likeCount: 0,
  commentCount: 0,
  imgUrls: [],
  nickname: '픽쿠야',
  avatar: '',
  userId: 'user-1',
  comments: [],
};

describe('HomeCalendar view switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedDiaryMock = null;
  });

  it('홈 캘린더는 보기 전환 없이 달력만 보여준다', () => {
    render(<HomeCalendar />);

    expect(screen.getByTestId('piku-calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '26년 5월' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '달력' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모아보기' })).not.toBeInTheDocument();
  });

  it('다른 사용자 프로필을 보는 중에도 홈 캘린더에는 보기 전환을 표시하지 않는다', () => {
    render(
      <HomeCalendar
        viewedUser={{
          userId: 'friend-1',
          nickname: '친구',
          avatar: '',
        }}
      />,
    );

    expect(screen.getByTestId('piku-calendar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '달력' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모아보기' })).not.toBeInTheDocument();
  });

  it('선택한 일기가 있으면 캘린더 상세 모달을 보여준다', () => {
    selectedDiaryMock = diary;

    render(<HomeCalendar />);

    expect(screen.getByTestId('diary-detail-modal')).toBeInTheDocument();
  });
});
