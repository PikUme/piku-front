import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileClient from '../ProfileClient';
import { FriendshipStatus } from '@/types/friend';
import type { UserProfileResponseDTO } from '@/types/profile';

const { mockPush, mockRefresh, getMonthlyDiaries } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  getMonthlyDiaries: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
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

vi.mock('@/components/store/authStore', () => ({
  default: () => ({
    user: {
      id: 'user-1',
      email: 'tester@example.com',
      nickname: '픽쿠',
      avatar: '',
    },
  }),
}));

vi.mock('@/lib/api/friend', () => ({
  acceptFriendRequest: vi.fn(),
  cancelFriendRequest: vi.fn(),
  deleteFriend: vi.fn(),
  rejectFriendRequest: vi.fn(),
  sendFriendRequest: vi.fn(),
}));

vi.mock('@/lib/api/diary', () => ({
  getMonthlyDiaries,
}));

vi.mock('@/components/feed/FriendActionConfirmModal', () => ({
  default: () => null,
}));

const profileData: UserProfileResponseDTO = {
  id: 'profile-1',
  userId: 'user-1',
  nickname: '픽쿠',
  avatar: '',
  friendCount: 7,
  diaryCount: 3,
  friendStatus: FriendshipStatus.NONE,
  isOwner: true,
  monthlyDiaryCount: [],
};

describe('ProfileClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('내 프로필의 friend 항목을 클릭하면 친구 페이지로 이동한다', () => {
    render(<ProfileClient profileData={profileData} />);

    fireEvent.click(screen.getByRole('button', { name: /7\s*friend/i }));

    expect(mockPush).toHaveBeenCalledWith('/friends');
  });

  it('다른 사용자 프로필의 friend 항목은 친구 페이지로 이동하지 않는다', () => {
    render(
      <ProfileClient
        profileData={{
          ...profileData,
          id: 'profile-2',
          userId: 'user-2',
          nickname: '다른사용자',
          friendCount: 4,
          isOwner: false,
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /4\s*friend/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('friend'));

    expect(mockPush).not.toHaveBeenCalledWith('/friends');
  });

  it('Diary 섹션 선택 UI에서 사진을 선택하면 아래 영역을 사진 그리드로 전환한다', async () => {
    getMonthlyDiaries.mockResolvedValue([
      {
        diaryId: 101,
        date: '2026-05-02',
        coverPhotoUrl: '/diary-cover.png',
      },
    ]);

    render(
      <ProfileClient
        profileData={{
          ...profileData,
          diaryCount: 1,
          monthlyDiaryCount: [
            {
              year: 2026,
              month: 5,
              count: 1,
              daysInMonth: 31,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('5월')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /1\s*diary/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '월별' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '사진' }));

    const grid = await screen.findByTestId('profile-diary-photo-grid');

    expect(grid).toBeInTheDocument();
    expect(screen.queryByText('5월')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '사진' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: '2026-05-02 일기 사진' })).toHaveAttribute(
      'src',
      '/diary-cover.png',
    );
    expect(getMonthlyDiaries).toHaveBeenCalledWith('user-1', 2026, 5);

    fireEvent.click(screen.getByRole('button', { name: '월별' }));

    expect(screen.getByText('5월')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-diary-photo-grid')).not.toBeInTheDocument();
  });
});
