import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedCard from '../FeedCard';
import { createComment } from '@/lib/api/comment';
import useAuthStore from '@/components/store/authStore';
import { FriendshipStatus } from '@/types/friend';
import type { FeedDiary } from '@/types/diary';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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

vi.mock('react-swipeable', () => ({
  useSwipeable: () => ({}),
}));

vi.mock('@/lib/api/comment', () => ({
  createComment: vi.fn(),
}));

vi.mock('@/lib/api/friend', () => ({
  cancelFriendRequest: vi.fn(),
  deleteFriend: vi.fn(),
  sendFriendRequest: vi.fn(),
}));

const makePost = (overrides: Partial<FeedDiary> = {}): FeedDiary => ({
  diaryId: 1,
  status: 'PUBLIC',
  content: '피드 일기',
  imgUrls: ['https://example.com/image.png'],
  date: '2026-05-24',
  nickname: 'writer',
  avatar: '',
  userId: 'writer-id',
  createdAt: '2026-05-24T00:00:00',
  commentCount: 4,
  likeCount: 0,
  isLiked: false,
  friendStatus: FriendshipStatus.NONE,
  ...overrides,
});

describe('FeedCard comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useAuthStore.setState({
        authStatus: 'authenticated',
        isLoggedIn: true,
        user: {
          id: 'viewer-id',
          email: 'viewer@example.com',
          nickname: 'viewer',
          avatar: '',
        },
      });
    });
  });

  it('직접 댓글 작성 성공 시 부모 피드에 댓글 생성을 알린다', async () => {
    const onCommentCreated = vi.fn();
    vi.mocked(createComment).mockResolvedValue({
      id: 10,
      content: '새 댓글',
      createdAt: '2026-05-24T10:00:00',
    });

    render(
      <FeedCard
        post={makePost()}
        onFriendshipStatusChange={vi.fn()}
        onContentClick={vi.fn()}
        onCommentClick={vi.fn()}
        onLikeToggle={vi.fn()}
        onCommentCreated={onCommentCreated}
        isMobile={false}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Add a comment...'), {
      target: { value: '  새 댓글  ' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '게시' }));
    });

    await waitFor(() => {
      expect(createComment).toHaveBeenCalledWith({
        diaryId: 1,
        content: '새 댓글',
      });
      expect(onCommentCreated).toHaveBeenCalledWith(1);
    });
  });
});
