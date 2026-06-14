import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FeedCard from '../FeedCard';
import { createComment } from '@/lib/api/comment';
import { cancelFriendRequest, sendFriendRequest } from '@/lib/api/friend';
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
  isOwner: false,
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

  it('친구 추가 버튼을 반복 클릭해도 친구 요청은 한 번만 보낸다', () => {
    const onFriendshipStatusChange = vi.fn();
    vi.mocked(sendFriendRequest).mockReturnValue(new Promise(() => {}));

    render(
      <FeedCard
        post={makePost()}
        onFriendshipStatusChange={onFriendshipStatusChange}
        onContentClick={vi.fn()}
        onCommentClick={vi.fn()}
        onLikeToggle={vi.fn()}
        isMobile={false}
      />,
    );

    const addFriendButton = screen.getByRole('button', { name: '친구 추가' });

    fireEvent.click(addFriendButton);
    fireEvent.click(addFriendButton);

    expect(screen.getByLabelText('친구 요청 처리 중')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '요청 취소' }),
    ).not.toBeInTheDocument();
    expect(sendFriendRequest).toHaveBeenCalledTimes(1);
    expect(sendFriendRequest).toHaveBeenCalledWith('writer-id');
  });

  it('친구 요청 성공 시 부모 피드에 SENT 상태를 알린다', async () => {
    const onFriendshipStatusChange = vi.fn();
    vi.mocked(sendFriendRequest).mockResolvedValue({
      isAccepted: false,
      message: '친구 요청을 보냈습니다.',
    });

    render(
      <FeedCard
        post={makePost()}
        onFriendshipStatusChange={onFriendshipStatusChange}
        onContentClick={vi.fn()}
        onCommentClick={vi.fn()}
        onLikeToggle={vi.fn()}
        isMobile={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '친구 추가' }));

    await waitFor(() => {
      expect(onFriendshipStatusChange).toHaveBeenCalledWith(
        1,
        FriendshipStatus.SENT,
      );
    });
  });

  it('친구 요청 취소 처리 중에도 버튼의 접근 가능한 이름을 유지한다', () => {
    vi.mocked(cancelFriendRequest).mockReturnValue(new Promise(() => {}));

    render(
      <FeedCard
        post={makePost({ friendStatus: FriendshipStatus.SENT })}
        onFriendshipStatusChange={vi.fn()}
        onContentClick={vi.fn()}
        onCommentClick={vi.fn()}
        onLikeToggle={vi.fn()}
        isMobile={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '요청 취소' }));
    fireEvent.click(screen.getAllByRole('button', { name: '요청 취소' })[1]);

    expect(
      screen.getByLabelText('친구 요청 취소 처리 중'),
    ).toBeInTheDocument();
  });

  it('익명 일기는 작성자 프로필 링크와 친구 액션을 노출하지 않는다', () => {
    render(
      <FeedCard
        post={makePost({
          status: 'ANONYMOUS',
          nickname: '익명',
          avatar: null,
          userId: null,
          friendStatus: FriendshipStatus.ANONYMOUS,
          isOwner: false,
        })}
        onFriendshipStatusChange={vi.fn()}
        onContentClick={vi.fn()}
        onCommentClick={vi.fn()}
        onLikeToggle={vi.fn()}
        isMobile={false}
      />,
    );

    expect(screen.getAllByText('익명')).not.toHaveLength(0);
    expect(
      screen.getByRole('img', { name: '익명 프로필 아이콘' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '친구 추가' })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/profile/null"]')).not.toBeInTheDocument();
  });
});
