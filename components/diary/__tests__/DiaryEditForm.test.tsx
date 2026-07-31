import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiaryEditForm from '../DiaryEditForm';
import { getDiaryById, updateDiary } from '@/lib/api/diary';
import type { DiaryDetail } from '@/types/diary';

const mockBack = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
  }),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('@/lib/api/diary', () => ({
  getDiaryById: vi.fn(),
  updateDiary: vi.fn(),
}));

vi.mock('@/components/store/authStore', () => ({
  default: () => ({
    user: {
      id: 'user-1',
      email: 'user@example.com',
      nickname: 'tester',
      avatar: '',
    },
  }),
}));

vi.mock('@/components/common/ImagePreviewModal', () => ({
  default: ({
    isOpen,
    imageUrl,
  }: {
    isOpen: boolean;
    imageUrl: string | null;
  }) => (isOpen ? <div data-testid="image-preview">{imageUrl}</div> : null),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({
        children,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div {...props}>{children}</div>
      ),
    },
  };
});

const diary: DiaryDetail = {
  diaryId: 1,
  content: '원래 일기',
  date: '2026-04-05',
  status: 'PUBLIC',
  createdAt: '2026-04-05T10:00:00',
  updatedAt: '2026-04-05T10:00:00',
  isLiked: false,
  likeCount: 0,
  commentCount: 0,
  imgUrls: ['/photo-1.png', '/photo-2.png'],
  nickname: 'tester',
  avatar: '',
  userId: 'user-1',
  isOwner: true,
  comments: [],
};

const mockGetDiaryById = vi.mocked(getDiaryById);
const mockUpdateDiary = vi.mocked(updateDiary);

describe('DiaryEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDiaryById.mockResolvedValue(diary);
  });

  it('일기 등록 페이지와 같은 구조로 글 작성, 공개 범위만 수정 가능하게 보여준다', async () => {
    render(<DiaryEditForm diaryId={1} />);

    expect(await screen.findByRole('heading', { name: '일기 수정' })).toBeInTheDocument();
    expect(screen.getAllByAltText(/기존 일기 사진/)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /AI 사진/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /사진 추가/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('일기 내용')).toHaveValue('원래 일기');
    expect(screen.getByRole('button', { name: /전체 공개/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('날짜')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('작성자')).not.toBeInTheDocument();
  });

  it('공개 범위 바텀시트에서 상태를 바꾸고 status와 content만 PATCH 저장한다', async () => {
    mockUpdateDiary.mockResolvedValue({
      diaryId: 1,
      status: 'PRIVATE',
      content: '수정한 일기',
      updatedAt: '2026-06-02T06:20:00',
    });

    render(<DiaryEditForm diaryId={1} />);

    await screen.findByLabelText('일기 내용');
    fireEvent.click(screen.getByRole('button', { name: /전체 공개/ }));
    fireEvent.click(screen.getByRole('button', { name: /나만 보기/ }));
    fireEvent.change(screen.getByLabelText('일기 내용'), {
      target: { value: '수정한 일기' },
    });
    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => {
      expect(mockUpdateDiary).toHaveBeenCalledWith(1, {
        status: 'PRIVATE',
        content: '수정한 일기',
      });
    });
    expect(mockReplace).toHaveBeenCalledWith('/diary/1');
  });

  it('공개 범위를 익명으로 바꾸면 작성자 프로필 사진 대신 익명 아이콘을 보여준다', async () => {
    render(<DiaryEditForm diaryId={1} />);

    await screen.findByLabelText('일기 내용');
    expect(screen.getByAltText('user avatar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /전체 공개/ }));
    fireEvent.click(screen.getByRole('button', { name: /익명/ }));

    expect(
      screen.getByRole('img', { name: '익명 프로필 아이콘' }),
    ).toBeInTheDocument();
    expect(screen.queryByAltText('user avatar')).not.toBeInTheDocument();
  });

  it('저장 실패 시 페이지를 이동하지 않고 기존 수정 내용을 유지한 채 에러를 보여준다', async () => {
    mockUpdateDiary.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/diary/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: '본인 일기만 수정할 수 있습니다.',
          instance: '/api/diary/1',
        },
      },
    });

    render(<DiaryEditForm diaryId={1} />);

    await screen.findByLabelText('일기 내용');
    fireEvent.change(screen.getByLabelText('일기 내용'), {
      target: { value: '실패할 수정본' },
    });
    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(await screen.findByText('본인 일기만 수정할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('일기 내용')).toHaveValue('실패할 수정본');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('존재하지 않는 일기를 조회하면 404 이미지를 보여준다', async () => {
    mockGetDiaryById.mockRejectedValue({
      response: {
        status: 404,
        data: {
          detail: '존재하지 않는 일기입니다.',
        },
      },
    });

    render(<DiaryEditForm diaryId={404} />);

    expect(
      await screen.findByRole('img', { name: '일기를 찾을 수 없습니다.' }),
    ).toHaveAttribute('src', '/404.png');
  });

  it('일기 조회가 404가 아닌 오류로 실패하면 오류 문구를 보여준다', async () => {
    mockGetDiaryById.mockRejectedValue(new Error('Network error'));

    render(<DiaryEditForm diaryId={1} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Network error');
    expect(
      screen.queryByRole('img', { name: '일기를 찾을 수 없습니다.' }),
    ).not.toBeInTheDocument();
  });

  it('취소하면 저장 API를 호출하지 않고 이전 페이지로 돌아간다', async () => {
    render(<DiaryEditForm diaryId={1} />);

    await screen.findByLabelText('일기 내용');
    fireEvent.change(screen.getByLabelText('일기 내용'), {
      target: { value: '취소할 수정본' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정 취소' }));

    expect(mockUpdateDiary).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledOnce();
  });

  it('익명 일기는 userId가 null이어도 isOwner가 true이면 수정할 수 있다', async () => {
    mockGetDiaryById.mockResolvedValue({
      ...diary,
      status: 'ANONYMOUS',
      userId: null,
      nickname: '익명',
      avatar: null,
      isOwner: true,
    } as DiaryDetail);

    render(<DiaryEditForm diaryId={1} />);

    expect(await screen.findByRole('heading', { name: '일기 수정' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '익명 프로필 아이콘' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /익명/ })).toBeInTheDocument();
    expect(screen.queryByText('본인 일기만 수정할 수 있습니다.')).not.toBeInTheDocument();
  });
});
