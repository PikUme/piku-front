import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiaryCreateForm from '../DiaryCreateForm';
import {
  createDiary,
  generateAiPhotos,
  getMonthlyDiaries,
  getRemainingAiRequests,
} from '@/lib/api/diary';

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

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File) => file),
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
const mockCreateDiary = vi.mocked(createDiary);
const mockGenerateAiPhotos = vi.mocked(generateAiPhotos);

describe('DiaryCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMonthlyDiaries.mockResolvedValue([]);
    mockGetRemainingAiRequests.mockResolvedValue(3);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
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

  it('일기 작성 validation 실패 시 fieldErrors.content를 인라인으로 보여준다', async () => {
    mockCreateDiary.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/validation/invalid-request',
          title: 'Bad Request',
          status: 400,
          detail: '요청 값이 올바르지 않습니다.',
          instance: '/api/diary',
          fieldErrors: {
            content: '일기 내용은 비어 있을 수 없습니다.',
          },
        },
      },
    });

    const { container } = render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.change(
      screen.getByPlaceholderText('오늘의 하루를 기록해보세요...'),
      {
        target: { value: '테스트 일기' },
      },
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;

    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['image'], 'photo.png', { type: 'image/png' })],
      },
    });

    await screen.findByText('(1장)');

    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(
      await screen.findByText('일기 내용은 비어 있을 수 없습니다.'),
    ).toBeInTheDocument();
  });

  it('일기 작성 서버 오류 시 ProblemDetail.detail을 alert로 보여준다', async () => {
    mockCreateDiary.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/common/internal-server-error',
          title: 'Internal Server Error',
          status: 500,
          detail: '서버에 오류가 발생했습니다.',
          instance: '/api/diary',
        },
      },
    });

    const alertSpy = vi.spyOn(window, 'alert');
    const { container } = render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.change(
      screen.getByPlaceholderText('오늘의 하루를 기록해보세요...'),
      {
        target: { value: '테스트 일기' },
      },
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;

    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['image'], 'photo.png', { type: 'image/png' })],
      },
    });

    await screen.findByText('(1장)');

    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('서버에 오류가 발생했습니다.');
    });
  });

  it('내용 validation 메시지와 글자 수를 textarea 아래 같은 줄 양끝에 보여준다', async () => {
    render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    const contentError = await screen.findByText('내용을 입력해주세요.');
    const assistRow = contentError.parentElement;

    expect(assistRow).toHaveClass('flex', 'items-center', 'justify-between');
    expect(assistRow).toHaveTextContent('내용을 입력해주세요.');
    expect(assistRow).toHaveTextContent('0/500');
  });

  it('AI 생성 실패 시 ProblemDetail.detail을 alert로 보여준다', async () => {
    mockGenerateAiPhotos.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/common/rate-limit-exceeded',
          title: 'Too Many Requests',
          status: 429,
          detail: 'AI 생성 한도를 초과했습니다.',
          instance: '/api/diary/ai/generate',
        },
      },
    });

    const alertSpy = vi.spyOn(window, 'alert');

    render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.change(
      screen.getByPlaceholderText('오늘의 하루를 기록해보세요...'),
      {
        target: { value: 'AI 생성 테스트' },
      },
    );

    const aiButton = screen.getByRole('button', { name: /AI 사진/ });

    await waitFor(() => {
      expect(aiButton).toBeEnabled();
    });

    fireEvent.click(aiButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('AI 생성 한도를 초과했습니다.');
    });
  });
});
