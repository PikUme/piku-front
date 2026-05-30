import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StoryCommentModal from '../StoryCommentModal';
import type { Comment, CommentPage } from '@/types/comment';
import { deleteComment, getRootComments } from '@/lib/api/comment';

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

vi.mock('@/components/store/authStore', () => ({
  default: () => ({
    isLoggedIn: true,
    user: {
      id: 'user-1',
      email: 'user@example.com',
      nickname: 'tester',
      avatar: '',
    },
  }),
}));

vi.mock('@/lib/api/comment', () => ({
  createComment: vi.fn(),
  getRootComments: vi.fn(),
  getReplies: vi.fn(),
  deleteComment: vi.fn(),
  updateComment: vi.fn(),
}));

vi.mock('../CommentItem', () => ({
  default: ({
    comment,
    onDeleteComment,
  }: {
    comment: Comment;
    onDeleteComment: (commentId: number, parentId: number | null) => void;
  }) => (
    <button
      data-testid={`delete-story-comment-${comment.id}`}
      onClick={() => onDeleteComment(comment.id, comment.parentId)}
    >
      댓글 삭제
    </button>
  ),
}));

vi.mock('../CommentInput', () => ({
  default: () => null,
}));

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 10,
  diaryId: 1,
  userId: 'user-1',
  nickname: 'tester',
  avatar: '',
  content: '댓글',
  parentId: null,
  createdAt: '2026-04-05T10:10:00',
  updatedAt: '2026-04-05T10:10:00',
  replyCount: 0,
  ...overrides,
});

const makePage = (
  content: Comment[],
  totalElements: number,
): CommentPage => ({
  content,
  pageable: {
    pageNumber: 0,
    pageSize: 10,
    sort: { empty: true, sorted: false, unsorted: true },
    offset: 0,
    paged: true,
    unpaged: false,
  },
  totalPages: 1,
  totalElements,
  size: 10,
  number: 0,
  sort: { empty: true, sorted: false, unsorted: true },
  first: true,
  last: true,
  numberOfElements: content.length,
  empty: content.length === 0,
});

describe('StoryCommentModal comment counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 댓글 목록 조회의 루트 댓글 수로 부모 댓글 수를 덮어쓰지 않는다', async () => {
    vi.mocked(getRootComments).mockResolvedValueOnce(makePage([], 2));
    const onUpdateCommentCount = vi.fn();

    render(
      <StoryCommentModal
        diaryId={1}
        initialCommentCount={5}
        onClose={vi.fn()}
        onUpdateCommentCount={onUpdateCommentCount}
      />,
    );

    await waitFor(() => {
      expect(getRootComments).toHaveBeenCalledWith(1, 0, 10);
    });
    expect(onUpdateCommentCount).not.toHaveBeenCalled();
  });

  it('댓글 삭제 실패 시 부모 댓글 수를 원래 값으로 되돌린다', async () => {
    vi.mocked(getRootComments).mockResolvedValueOnce(makePage([makeComment()], 1));
    vi.mocked(deleteComment).mockRejectedValueOnce(new Error('delete failed'));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onUpdateCommentCount = vi.fn();

    render(
      <StoryCommentModal
        diaryId={1}
        initialCommentCount={1}
        onClose={vi.fn()}
        onUpdateCommentCount={onUpdateCommentCount}
      />,
    );

    fireEvent.click(await screen.findByTestId('delete-story-comment-10'));

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith(10);
    });
    await waitFor(() => {
      expect(onUpdateCommentCount).toHaveBeenLastCalledWith(1);
    });
  });
});
