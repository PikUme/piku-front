import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CommentItem from '../CommentItem';
import type { Comment } from '@/types/comment';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/store/authStore', () => ({
  default: () => ({
    user: {
      id: 'viewer-id',
      email: 'viewer@example.com',
      nickname: 'viewer',
      avatar: '',
    },
  }),
}));

vi.mock('@/components/feed/ProfileHoverCard', () => ({
  default: () => null,
}));

vi.mock('@/components/common/NotReadyModal', () => ({
  default: () => null,
}));

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 10,
  diaryId: 1,
  userId: 'writer-id',
  nickname: 'writer',
  avatar: '',
  content: '댓글',
  parentId: null,
  createdAt: '2026-04-05T10:10:00',
  updatedAt: '2026-04-05T10:10:00',
  replyCount: 0,
  ...overrides,
  canReply: overrides.canReply ?? true,
  canEdit: overrides.canEdit ?? false,
  canDelete: overrides.canDelete ?? false,
});

describe('CommentItem', () => {
  it('서버 권한 필드로 답글, 수정, 삭제 액션을 노출한다', () => {
    const onSetReplyTo = vi.fn();
    const onStartEdit = vi.fn();
    const onDeleteComment = vi.fn();

    const { container } = render(
      <CommentItem
        comment={makeComment({
          userId: null,
          nickname: '익명',
          avatar: null,
          content: '비공개 댓글',
          canReply: false,
          canEdit: true,
          canDelete: true,
        })}
        diaryId={1}
        onSetReplyTo={onSetReplyTo}
        replies={[]}
        onToggleReplies={vi.fn()}
        onFetchMoreReplies={vi.fn()}
        onDeleteComment={onDeleteComment}
        onStartEdit={onStartEdit}
      />,
    );

    expect(screen.getByText('익명')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '익명 프로필 아이콘' }),
    ).toBeInTheDocument();
    expect(screen.getByText('비공개 댓글')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '답글 달기' })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/profile/null"]')).not.toBeInTheDocument();

    fireEvent.mouseEnter(container.querySelector('#comment-10')!);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    expect(onStartEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, content: '비공개 댓글' }),
    );

    fireEvent.mouseEnter(container.querySelector('#comment-10')!);
    fireEvent.click(screen.getAllByRole('button').at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onDeleteComment).toHaveBeenCalledWith(10, null);
  });
});
