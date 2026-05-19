import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiaryStoryModal from '../DiaryStoryModal';
import type { DiaryDetail } from '@/types/diary';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} />
  ),
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
        drag: _drag,
        dragConstraints: _dragConstraints,
        dragElastic: _dragElastic,
        onDragEnd: _onDragEnd,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div {...props}>{children}</div>
      ),
    },
  };
});

vi.mock('react-swipeable', () => ({
  useSwipeable: () => ({}),
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

vi.mock('@/lib/api/diary', () => ({
  deleteDiary: vi.fn(),
}));

vi.mock('../StoryCommentModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="story-comment-modal">
      <button onClick={onClose}>댓글 닫기</button>
    </div>
  ),
}));

const diary: DiaryDetail = {
  diaryId: 1,
  content: '테스트 일기',
  date: '2026-04-05',
  status: 'PUBLIC',
  createdAt: '2026-04-05T10:00:00',
  updatedAt: '2026-04-05T10:00:00',
  isLiked: false,
  likeCount: 0,
  commentCount: 3,
  imgUrls: ['https://example.com/image.png'],
  nickname: 'tester',
  avatar: '',
  userId: 'user-1',
  comments: [],
};

describe('DiaryStoryModal history navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('댓글 화면에서 뒤로가기를 하면 댓글만 닫고 일기 상세를 유지한다', async () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    render(<DiaryStoryModal diary={diary} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('댓글 보기'));

    expect(await screen.findByTestId('story-comment-modal')).toBeInTheDocument();
    expect(pushStateSpy).toHaveBeenCalledWith({ modal: 'diary-comment' }, '');

    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.queryByTestId('story-comment-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByText('댓글 보기')).toBeInTheDocument();
  });

  it('댓글 화면을 수동으로 닫으면 댓글 히스토리 엔트리를 되돌린다', async () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    render(<DiaryStoryModal diary={diary} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('댓글 보기'));

    expect(await screen.findByTestId('story-comment-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('댓글 닫기'));

    await waitFor(() => {
      expect(screen.queryByTestId('story-comment-modal')).not.toBeInTheDocument();
    });
    expect(backSpy).toHaveBeenCalledOnce();
  });
});
