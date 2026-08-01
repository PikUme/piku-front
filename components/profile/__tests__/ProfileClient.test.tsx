import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileClient from '../ProfileClient';
import { FriendshipStatus } from '@/types/friend';
import type { UserProfileResponseDTO } from '@/types/profile';
import { sendFriendRequest } from '@/lib/api/friend';

const {
  mockPush,
  mockRefresh,
  getMonthlyDiaries,
  getUserGallery,
  getDiaryById,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  getMonthlyDiaries: vi.fn(),
  getUserGallery: vi.fn(),
  getDiaryById: vi.fn(),
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
  getUserGallery,
  getDiaryById,
}));

vi.mock('@/components/feed/FriendActionConfirmModal', () => ({
  default: () => null,
}));

vi.mock('react-responsive', () => ({
  useMediaQuery: () => true,
}));

vi.mock('@/components/diary/DiaryDetailModal', () => ({
  default: ({ diary, onClose }: { diary: { diaryId: number }; onClose: () => void }) => (
    <div data-testid="profile-diary-detail-modal">
      <span>{diary.diaryId}</span>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

vi.mock('@/components/diary/DiaryStoryModal', () => ({
  default: ({ diary, onClose }: { diary: { diaryId: number }; onClose: () => void }) => (
    <div data-testid="profile-diary-story-modal">
      <span>{diary.diaryId}</span>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ),
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

  it('친구 추가 버튼을 반복 클릭해도 친구 요청은 한 번만 보낸다', () => {
    vi.mocked(sendFriendRequest).mockReturnValue(new Promise(() => {}));

    render(
      <ProfileClient
        profileData={{
          ...profileData,
          id: 'profile-2',
          userId: 'user-2',
          nickname: '다른사용자',
          isOwner: false,
        }}
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
    expect(sendFriendRequest).toHaveBeenCalledWith('user-2');
  });

  it('사진 탭 최초 로딩 중 9개의 사진 스켈레톤을 표시한다', async () => {
    getUserGallery.mockReturnValueOnce(new Promise(() => {}));

    render(<ProfileClient profileData={profileData} />);

    fireEvent.click(screen.getByRole('button', { name: '사진' }));

    const loadingStatus = await screen.findByRole('status');

    expect(loadingStatus).toHaveTextContent('사진을 불러오는 중');
    expect(
      screen.getAllByTestId('profile-diary-photo-skeleton-tile'),
    ).toHaveLength(9);
    expect(
      screen.queryByText('사진을 불러오는 중...'),
    ).not.toBeInTheDocument();
  });

  it('사진 더 보기 로딩 중 기존 사진 뒤에 3개의 스켈레톤을 표시한다', async () => {
    getUserGallery
      .mockResolvedValueOnce({
        items: [
          {
            diaryId: 101,
            date: '2026-05-02',
            coverPhotoUrl: '/diary-cover.png',
            imageCount: 1,
            status: 'PUBLIC',
          },
        ],
        nextCursor: 'next-cursor',
        hasNext: true,
      })
      .mockReturnValueOnce(new Promise(() => {}));

    render(<ProfileClient profileData={profileData} />);

    fireEvent.click(screen.getByRole('button', { name: '사진' }));
    fireEvent.click(await screen.findByRole('button', { name: '더 보기' }));

    expect(
      screen.getByRole('img', { name: '2026-05-02 일기 사진' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('profile-diary-photo-grid')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(
      screen.getAllByTestId('profile-diary-photo-skeleton-tile'),
    ).toHaveLength(3);
    expect(
      screen.queryByRole('button', { name: '더 보기' }),
    ).not.toBeInTheDocument();
  });

  it('Diary 섹션 선택 UI에서 사진을 선택하면 갤러리 API로 사진 그리드를 불러온다', async () => {
    getUserGallery.mockResolvedValueOnce({
      items: [
        {
          diaryId: 101,
          date: '2026-05-02',
          coverPhotoUrl: '/diary-cover.png',
          imageCount: 2,
          status: 'PUBLIC',
        },
      ],
      nextCursor: 'next-cursor',
      hasNext: true,
    });
    getUserGallery.mockResolvedValueOnce({
      items: [
        {
          diaryId: 102,
          date: '2026-05-01',
          coverPhotoUrl: '/diary-cover-2.png',
          imageCount: 1,
          status: 'PUBLIC',
        },
      ],
      nextCursor: null,
      hasNext: false,
    });

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
    expect(screen.getByLabelText('복수 사진 2장')).toBeInTheDocument();
    expect(getUserGallery).toHaveBeenCalledWith('user-1');
    expect(getMonthlyDiaries).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));

    expect(await screen.findByRole('img', { name: '2026-05-01 일기 사진' })).toHaveAttribute(
      'src',
      '/diary-cover-2.png',
    );
    expect(screen.queryByLabelText('복수 사진 1장')).not.toBeInTheDocument();
    expect(getUserGallery).toHaveBeenLastCalledWith('user-1', 'next-cursor');

    fireEvent.click(screen.getByRole('button', { name: '월별' }));

    expect(screen.getByText('5월')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-diary-photo-grid')).not.toBeInTheDocument();
  });

  it('사진 그리드의 사진을 클릭하면 캘린더로 이동하지 않고 일기 상세 모달을 연다', async () => {
    getUserGallery.mockResolvedValueOnce({
      items: [
        {
          diaryId: 101,
          date: '2026-05-02',
          coverPhotoUrl: '/diary-cover.png',
          imageCount: 2,
          status: 'PUBLIC',
        },
      ],
      nextCursor: null,
      hasNext: false,
    });
    getDiaryById.mockResolvedValueOnce({
      diaryId: 101,
      content: '사진 일기',
      date: '2026-05-02',
      status: 'PUBLIC',
      createdAt: '2026-05-02T10:00:00',
      updatedAt: '2026-05-02T10:00:00',
      isLiked: false,
      likeCount: 0,
      commentCount: 0,
      imgUrls: ['/diary-cover.png'],
      nickname: '픽쿠',
      avatar: null,
      userId: 'user-1',
      isOwner: true,
      comments: [],
    });

    render(<ProfileClient profileData={profileData} />);

    fireEvent.click(screen.getByRole('button', { name: '사진' }));

    const photoTile = await screen.findByTestId('profile-diary-photo-tile');
    fireEvent.click(photoTile);

    await waitFor(() => expect(getDiaryById).toHaveBeenCalledWith(101));
    expect(await screen.findByTestId('profile-diary-detail-modal')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith(
      '/profile/user-1/calendar?date=2026-05-02&diaryId=101',
    );
  });

  it('월별 일기 기록을 연도별로 나누어 표시한다', () => {
    render(
      <ProfileClient
        profileData={{
          ...profileData,
          monthlyDiaryCount: [
            {
              year: 2026,
              month: 1,
              count: 2,
              daysInMonth: 31,
            },
            {
              year: 2025,
              month: 12,
              count: 1,
              daysInMonth: 31,
            },
            {
              year: 2025,
              month: 11,
              count: 3,
              daysInMonth: 30,
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: '2026년' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2025년' })).toBeInTheDocument();
    expect(screen.getByText('1월')).toBeInTheDocument();
    expect(screen.getByText('12월')).toBeInTheDocument();
    expect(screen.getByText('11월')).toBeInTheDocument();
  });
});
