import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileEditClient from '../ProfileEditClient';
import type { UserProfileResponseDTO } from '@/types/profile';
import { FriendshipStatus } from '@/types/friend';

const { mockPush, mockBack, mockLogin, checkNicknameAvailability, updateUserProfile } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockBack: vi.fn(),
    mockLogin: vi.fn(),
    checkNicknameAvailability: vi.fn(),
    updateUserProfile: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

vi.mock('@/lib/api/user', () => ({
  checkNicknameAvailability,
  updateUserProfile,
}));

vi.mock('@/lib/api/character', () => ({
  getFixedCharacters: vi.fn().mockResolvedValue([]),
}));

vi.mock('../auth/CharacterSelection', () => ({
  default: () => <div data-testid="character-selection" />,
}));

vi.mock('../../store/authStore', () => ({
  default: () => ({
    user: {
      id: 'user-1',
      email: 'tester@example.com',
      nickname: '기존닉네임',
      avatar: '',
    },
    login: mockLogin,
  }),
}));

const profileData: UserProfileResponseDTO = {
  id: 'profile-1',
  userId: 'user-1',
  nickname: '기존닉네임',
  avatar: '',
  friendCount: 0,
  diaryCount: 0,
  friendStatus: FriendshipStatus.NONE,
  isOwner: true,
  monthlyDiaryCount: [],
};

describe('ProfileEditClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('닉네임 중복 확인 실패 시 ProblemDetail.detail을 노출한다', async () => {
    checkNicknameAvailability.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/user/nickname-conflict',
          title: 'Conflict',
          status: 409,
          detail: '이미 사용 중인 닉네임입니다.',
          instance: '/api/users/nickname/availability',
        },
      },
    });

    render(<ProfileEditClient profileData={profileData} />);

    fireEvent.change(screen.getByLabelText('닉네임'), {
      target: { value: '새닉네임' },
    });
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));

    expect(
      await screen.findByText('이미 사용 중인 닉네임입니다.'),
    ).toBeInTheDocument();
  });

  it('프로필 저장 실패 시 ProblemDetail.detail을 alert로 보여준다', async () => {
    checkNicknameAvailability.mockResolvedValue({
      success: true,
      message: '사용 가능한 닉네임입니다.',
    });
    updateUserProfile.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/user/profile-conflict',
          title: 'Conflict',
          status: 409,
          detail: '프로필 정보를 저장할 수 없습니다.',
          instance: '/api/users/profile',
        },
      },
    });

    const alertSpy = vi.spyOn(window, 'alert');

    render(<ProfileEditClient profileData={profileData} />);

    fireEvent.change(screen.getByLabelText('닉네임'), {
      target: { value: '새닉네임' },
    });
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));

    await screen.findByText('사용 가능한 닉네임입니다.');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '프로필 업데이트 중 오류 발생: 프로필 정보를 저장할 수 없습니다.',
      );
    });
  });
});
