import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileHoverCard from '../ProfileHoverCard';
import { FriendshipStatus } from '@/types/friend';
import {
  cancelFriendRequest,
  getProfileInfo,
  sendFriendRequest,
} from '@/lib/api/friend';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} />
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('../../store/authStore', () => ({
  default: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'viewer-id' } }),
}));

vi.mock('@/lib/api/friend', () => ({
  cancelFriendRequest: vi.fn(),
  deleteFriend: vi.fn(),
  getProfileInfo: vi.fn(),
  sendFriendRequest: vi.fn(),
}));

describe('ProfileHoverCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProfileInfo).mockResolvedValue({
      userId: 'writer-id',
      nickname: 'writer',
      avatar: '',
      diaryCount: 3,
      friendCount: 2,
      friendStatus: FriendshipStatus.NONE,
    });
  });

  it('친구 추가 버튼을 반복 클릭해도 친구 요청은 한 번만 보낸다', async () => {
    vi.mocked(sendFriendRequest).mockReturnValue(new Promise(() => {}));

    render(
      <ProfileHoverCard
        userId="writer-id"
        nickname="writer"
        avatar=""
        onStatusChange={vi.fn()}
      />,
    );

    const addFriendButton = await screen.findByRole('button', {
      name: '친구 추가',
    });

    fireEvent.click(addFriendButton);
    fireEvent.click(addFriendButton);

    expect(screen.getByLabelText('친구 요청 처리 중')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '친구 요청 취소' }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(sendFriendRequest).toHaveBeenCalledTimes(1);
    });
    expect(sendFriendRequest).toHaveBeenCalledWith('writer-id');
  });

  it('친구 요청 취소 처리 중에도 버튼의 접근 가능한 이름을 유지한다', async () => {
    vi.mocked(getProfileInfo).mockResolvedValue({
      userId: 'writer-id',
      nickname: 'writer',
      avatar: '',
      diaryCount: 3,
      friendCount: 2,
      friendStatus: FriendshipStatus.SENT,
    });
    vi.mocked(cancelFriendRequest).mockReturnValue(new Promise(() => {}));

    render(
      <ProfileHoverCard
        userId="writer-id"
        nickname="writer"
        avatar=""
        onStatusChange={vi.fn()}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: '친구 요청 취소' }),
    );
    fireEvent.click(screen.getByRole('button', { name: '요청 취소' }));

    expect(
      screen.getByLabelText('친구 요청 취소 처리 중'),
    ).toBeInTheDocument();
  });
});
