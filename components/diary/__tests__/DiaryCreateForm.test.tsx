import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiaryCreateForm from '../DiaryCreateForm';
import { getMonthlyDiaries, getRemainingAiRequests } from '@/lib/api/diary';

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

vi.mock('@/lib/api/diary', () => ({
  createDiary: vi.fn(),
  generateAiPhotos: vi.fn(),
  getMonthlyDiaries: vi.fn(),
  getRemainingAiRequests: vi.fn(),
}));

vi.mock('@/lib/utils/date', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/date')>(
    '@/lib/utils/date',
  );

  return {
    ...actual,
    getSeoulDate: () => new Date('2026-03-19T12:00:00+09:00'),
  };
});

vi.mock('../../store/authStore', () => ({
  default: () => ({
    isLoggedIn: true,
    user: {
      id: 'user-1',
      nickname: 'tester',
      avatar: '/avatar.png',
    },
  }),
}));

vi.mock('react-textarea-autosize', () => ({
  default: ({
    minRows: _minRows,
    ...props
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) => (
    <textarea {...props} />
  ),
}));

vi.mock('../common/ImagePreviewModal', () => ({
  default: () => null,
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');

  const createMockComponent = (tag: keyof React.JSX.IntrinsicElements) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(
      (
        {
          children,
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          whileDrag: _whileDrag,
          dragTransition: _dragTransition,
          dragElastic: _dragElastic,
          dragListener: _dragListener,
          dragControls: _dragControls,
          onReorder: _onReorder,
          onTap,
          ...props
        },
        ref,
      ) =>
        React.createElement(tag, {
          ...props,
          ref,
          onClick: onTap ?? props.onClick,
          children,
        }),
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: createMockComponent('div'),
    },
    Reorder: {
      Group: createMockComponent('div'),
      Item: createMockComponent('div'),
    },
    useDragControls: () => ({
      start: vi.fn(),
    }),
  };
});

const mockGetMonthlyDiaries = vi.mocked(getMonthlyDiaries);
const mockGetRemainingAiRequests = vi.mocked(getRemainingAiRequests);

describe('DiaryCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRemainingAiRequests.mockResolvedValue(3);
  });

  it('작성된 날짜는 비활성화되고 선택 가능한 날짜를 누르면 작성 날짜가 바뀐다', async () => {
    mockGetMonthlyDiaries.mockResolvedValue([
      {
        diaryId: 1,
        date: '2026-03-17',
        coverPhotoUrl: 'https://example.com/cover.png',
      },
    ]);

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    render(<DiaryCreateForm date="2026-03-18" />);

    await waitFor(() => {
      expect(mockGetMonthlyDiaries).toHaveBeenCalledWith('user-1', 2026, 3);
    });

    fireEvent.click(screen.getByRole('button', { name: /2026년 3월 18일/ }));

    expect(await screen.findByTestId('date-cell-2026-03-17')).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByTestId('date-cell-2026-03-19')).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId('date-cell-2026-03-19'));

    await waitFor(() => {
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/diary/new/2026-03-19');
      expect(
        screen.getByRole('button', { name: /2026년 3월 19일/ }),
      ).toBeInTheDocument();
    });
  });

  it('작성된 날짜 조회에 실패하면 날짜 선택을 막고 재시도 안내를 보여준다', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetMonthlyDiaries.mockRejectedValueOnce(new Error('network error'));

    render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.click(screen.getByRole('button', { name: /2026년 3월 18일/ }));

    expect(await screen.findByRole('button', { name: '다시 불러오기' })).toBeInTheDocument();
    expect(screen.getByTestId('date-cell-2026-03-18')).toBeDisabled();

    consoleErrorSpy.mockRestore();
  });
});
