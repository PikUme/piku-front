import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiaryCreateForm from '../DiaryCreateForm';
import {
  createDiary,
  generateAiPhotos,
  getMonthlyDiaries,
  getRemainingAiRequests,
} from '@/lib/api/diary';
import { getFixedCharacters } from '@/lib/api/character';
import imageCompression from 'browser-image-compression';

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockHeaderVisibility = vi.hoisted(() => ({
  isVisible: true,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

vi.mock('@/hooks/useHeaderVisibility', () => ({
  useHeaderVisibility: () => mockHeaderVisibility.isVisible,
}));

vi.mock('@/lib/api/diary', () => ({
  createDiary: vi.fn(),
  generateAiPhotos: vi.fn(),
  getMonthlyDiaries: vi.fn(),
  getRemainingAiRequests: vi.fn(),
}));

vi.mock('@/lib/api/character', () => ({
  getFixedCharacters: vi.fn(),
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
const mockGetFixedCharacters = vi.mocked(getFixedCharacters);
const mockImageCompression = vi.mocked(imageCompression);

describe('DiaryCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaderVisibility.isVisible = true;
    mockGetMonthlyDiaries.mockResolvedValue([]);
    mockGetRemainingAiRequests.mockResolvedValue(3);
    mockGetFixedCharacters.mockResolvedValue([
      { id: 3, displayImageUrl: '/rabbit.png', type: 'RABBIT' },
    ]);
    mockImageCompression.mockImplementation(async file => file);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('모바일에서 작성 헤더를 피드 서브헤더처럼 스크롤 방향에 맞춰 노출한다', () => {
    const { rerender } = render(<DiaryCreateForm date="2026-03-18" />);

    const header = screen.getByTestId('diary-create-header');

    expect(header).toHaveClass('max-xl:fixed');
    expect(header).toHaveClass('max-xl:top-14');
    expect(header).toHaveClass('max-xl:translate-y-0');
    expect(screen.getByRole('button', { name: '완료' })).toBeInTheDocument();

    mockHeaderVisibility.isVisible = false;
    rerender(<DiaryCreateForm date="2026-03-18" />);

    expect(header).toHaveClass('max-xl:-translate-y-[calc(100%+3.5rem)]');
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

  it('AI 사진 버튼은 모달을 열고 선택 확정 후에만 생성 요청한다', async () => {
    mockGenerateAiPhotos.mockResolvedValue({
      id: 12,
      url: '/generated.png',
    });

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

    expect(mockGenerateAiPhotos).not.toHaveBeenCalled();
    fireEvent.click(
      await screen.findByRole('button', { name: 'RABBIT 캐릭터 선택' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'AI 사진 생성' }));

    await waitFor(() => {
      expect(mockGenerateAiPhotos).toHaveBeenCalledWith('AI 생성 테스트', 3);
    });
    expect(await screen.findByAltText('selected photo')).toHaveAttribute(
      'src',
      '/generated.png',
    );
    expect(
      screen.queryByRole('dialog', { name: '캐릭터 선택' }),
    ).not.toBeInTheDocument();
  });

  it('생성 성공으로 AI 버튼이 비활성화되면 완료 버튼으로 포커스를 복구한다', async () => {
    mockGetRemainingAiRequests.mockResolvedValue(1);
    mockGenerateAiPhotos.mockResolvedValue({
      id: 14,
      url: '/last-generated.png',
    });

    render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.change(
      screen.getByPlaceholderText('오늘의 하루를 기록해보세요...'),
      {
        target: { value: '마지막 AI 생성 테스트' },
      },
    );

    const aiButton = screen.getByRole('button', { name: /AI 사진/ });
    await waitFor(() => {
      expect(aiButton).toBeEnabled();
    });
    fireEvent.click(aiButton);
    fireEvent.click(
      await screen.findByRole('button', { name: 'RABBIT 캐릭터 선택' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'AI 사진 생성' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '캐릭터 선택' }),
      ).not.toBeInTheDocument();
    });
    expect(aiButton).toBeDisabled();
    expect(screen.getByRole('button', { name: '완료' })).toHaveFocus();
  });

  it('AI 캐릭터 선택을 취소하면 생성하지 않고 배경 스크롤을 복구한다', async () => {
    render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.change(
      screen.getByPlaceholderText('오늘의 하루를 기록해보세요...'),
      {
        target: { value: '취소 테스트' },
      },
    );

    const aiButton = screen.getByRole('button', { name: /AI 사진/ });
    await waitFor(() => {
      expect(aiButton).toBeEnabled();
    });
    fireEvent.click(aiButton);

    expect(
      await screen.findByRole('dialog', { name: '캐릭터 선택' }),
    ).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: '캐릭터 선택' }),
      ).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');
    });
    expect(mockGenerateAiPhotos).not.toHaveBeenCalled();
  });

  it('일기 내용이 비어 있으면 캐릭터를 조회하지 않는다', async () => {
    const alertSpy = vi.spyOn(window, 'alert');
    render(<DiaryCreateForm date="2026-03-18" />);

    const aiButton = screen.getByRole('button', { name: /AI 사진/ });
    await waitFor(() => {
      expect(aiButton).toBeEnabled();
    });
    fireEvent.click(aiButton);

    expect(alertSpy).toHaveBeenCalledWith('일기 내용을 먼저 입력해주세요.');
    expect(mockGetFixedCharacters).not.toHaveBeenCalled();
    expect(mockGenerateAiPhotos).not.toHaveBeenCalled();
  });

  it('사진 업로드 중에는 AI 캐릭터 모달을 열 수 없다', async () => {
    let resolveCompression: ((file: File) => void) | undefined;
    mockImageCompression.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCompression = resolve;
        }),
    );
    const uploadFile = new File(['image'], 'pending.png', {
      type: 'image/png',
    });
    const { container } = render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.change(
      screen.getByPlaceholderText('오늘의 하루를 기록해보세요...'),
      {
        target: { value: '업로드 중 AI 생성 테스트' },
      },
    );
    const aiButton = screen.getByRole('button', { name: /AI 사진/ });
    await waitFor(() => {
      expect(aiButton).toBeEnabled();
    });
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [uploadFile] },
    });

    expect(aiButton).toBeDisabled();
    fireEvent.click(aiButton);
    expect(
      screen.queryByRole('dialog', { name: '캐릭터 선택' }),
    ).not.toBeInTheDocument();

    resolveCompression?.(uploadFile);
    expect(await screen.findByText('(1장)')).toBeInTheDocument();
  });

  it('캐릭터 선택 중 사진이 최대 수량에 도달하면 생성 요청을 막는다', async () => {
    const alertSpy = vi.mocked(window.alert);
    mockGenerateAiPhotos.mockResolvedValue({
      id: 15,
      url: '/overflow-generated.png',
    });
    const { container } = render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.change(
      screen.getByPlaceholderText('오늘의 하루를 기록해보세요...'),
      {
        target: { value: '사진 제한 재검사 테스트' },
      },
    );
    const aiButton = screen.getByRole('button', { name: /AI 사진/ });
    await waitFor(() => {
      expect(aiButton).toBeEnabled();
    });
    fireEvent.click(aiButton);
    fireEvent.click(
      await screen.findByRole('button', { name: 'RABBIT 캐릭터 선택' }),
    );

    const files = Array.from(
      { length: 5 },
      (_, index) =>
        new File(['image'], `photo-${index}.png`, { type: 'image/png' }),
    );
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files } });
    await waitFor(() => {
      expect(screen.getAllByAltText('selected photo')).toHaveLength(5);
    });

    fireEvent.click(screen.getByRole('button', { name: 'AI 사진 생성' }));

    expect(mockGenerateAiPhotos).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      '사진은 최대 5장까지 추가할 수 있습니다.',
    );
  });

  it('AI 생성 실패 시 횟수를 복구하고 모달의 선택 상태를 유지한다', async () => {
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

    const characterButton = await screen.findByRole('button', {
      name: 'RABBIT 캐릭터 선택',
    });
    fireEvent.click(characterButton);
    fireEvent.click(screen.getByRole('button', { name: 'AI 사진 생성' }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('AI 생성 한도를 초과했습니다.');
    });
    expect(mockGenerateAiPhotos).toHaveBeenCalledWith('AI 생성 테스트', 3);
    expect(
      screen.getByRole('dialog', { name: '캐릭터 선택' }),
    ).toBeInTheDocument();
    expect(characterButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('(횟수: 3)')).toBeInTheDocument();
  });

  it('AI 생성 중에는 중복 요청과 모달 닫기를 막는다', async () => {
    let resolveGeneration:
      | ((photo: { id: number; url: string }) => void)
      | undefined;
    mockGenerateAiPhotos.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveGeneration = resolve;
        }),
    );

    render(<DiaryCreateForm date="2026-03-18" />);

    fireEvent.change(
      screen.getByPlaceholderText('오늘의 하루를 기록해보세요...'),
      {
        target: { value: '중복 요청 테스트' },
      },
    );

    const aiButton = screen.getByRole('button', { name: /AI 사진/ });
    await waitFor(() => {
      expect(aiButton).toBeEnabled();
    });
    fireEvent.click(aiButton);
    fireEvent.click(
      await screen.findByRole('button', { name: 'RABBIT 캐릭터 선택' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'AI 사진 생성' }));

    expect(
      await screen.findByRole('button', { name: 'AI 사진 생성 중...' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.getByRole('dialog', { name: '캐릭터 선택' }),
    ).toBeInTheDocument();
    expect(mockGenerateAiPhotos).toHaveBeenCalledTimes(1);

    resolveGeneration?.({ id: 13, url: '/generated-pending.png' });

    expect(await screen.findByAltText('selected photo')).toHaveAttribute(
      'src',
      '/generated-pending.png',
    );
  });
});
