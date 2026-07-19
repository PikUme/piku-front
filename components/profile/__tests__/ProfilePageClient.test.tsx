import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FriendshipStatus } from '@/types/friend';
import ProfilePageClient from '../ProfilePageClient';

const { getUserProfile, mockReplace } = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/profile/user-1',
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: mockReplace,
  }),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('@/components/store/authStore', () => ({
  default: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/lib/api/user', () => ({ getUserProfile }));

describe('ProfilePageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('프로필 API가 대기 중일 때 스켈레톤을 표시한다', () => {
    getUserProfile.mockReturnValue(new Promise(() => {}));

    render(<ProfilePageClient userId="user-1" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.queryByText('프로필을 불러오는 중...'),
    ).not.toBeInTheDocument();
  });

  it('프로필 API 성공 후 스켈레톤을 실제 프로필로 교체한다', async () => {
    getUserProfile.mockResolvedValue({
      id: 'user-1',
      userId: 'user-1',
      nickname: '픽쿠',
      avatar: '',
      friendCount: 7,
      diaryCount: 3,
      friendStatus: FriendshipStatus.NONE,
      isOwner: true,
      monthlyDiaryCount: [],
    });

    render(<ProfilePageClient userId="user-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Profile' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '픽쿠' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '프로필 편집' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('프로필 API 실패 후 스켈레톤을 404 이미지로 교체한다', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    getUserProfile.mockRejectedValue(new Error('network error'));

    render(<ProfilePageClient userId="user-1" />);

    const notFoundImage = await screen.findByRole('img', {
      name: '프로필 정보를 찾을 수 없습니다.',
    });

    expect(notFoundImage).toHaveAttribute('src', '/404.png');
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to fetch profile data:',
      expect.any(Error),
    );
  });
});
