import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NETWORK_ERROR_MESSAGE } from '@/lib/utils/apiError';
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

  it('닉네임 중복 확인 네트워크 오류 메시지는 줄바꿈을 보존해 보여준다', async () => {
    checkNicknameAvailability.mockRejectedValue(new Error('Network Error'));

    render(<ProfileEditClient profileData={profileData} />);

    fireEvent.change(screen.getByLabelText('닉네임'), {
      target: { value: '새닉네임' },
    });
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));

    const messages = await screen.findAllByText(
      (_, element) => element?.textContent === NETWORK_ERROR_MESSAGE,
    );
    const message = messages.find(element => element.tagName === 'P');

    expect(message).toHaveClass('whitespace-pre-line');
  });

  it('예약 보호 503은 닉네임 사용 중으로 단정하지 않고 재시도 안내를 표시한다', async () => {
    checkNicknameAvailability.mockRejectedValue({
      response: { data: {
        type: 'about:blank', title: 'Service Unavailable', status: 503,
        detail: '예약 시스템을 사용할 수 없습니다.',
        instance: '/api/users/nickname/availability',
        code: 'NICKNAME_RESERVATION_UNAVAILABLE',
      } },
    });

    render(<ProfileEditClient profileData={profileData} />);
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '새닉네임' } });
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));

    const message = await screen.findByText('닉네임을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect(message).toHaveClass('text-red-600');
    expect(screen.queryByText(/사용 중/)).not.toBeInTheDocument();
    expect(screen.queryByText(/남음|예약 중/)).not.toBeInTheDocument();
  });

  it('프로필 저장 실패 시 ProblemDetail.detail을 alert로 보여준다', async () => {
    checkNicknameAvailability.mockResolvedValue({
      success: true,
      message: '사용 가능한 닉네임입니다.',
    });
    updateUserProfile.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/common/internal-server-error',
          title: 'Internal Server Error',
          status: 500,
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

  it('프로필 저장의 예약 보호 503은 충돌로 분류하지 않고 재시도를 안내한다', async () => {
    checkNicknameAvailability.mockResolvedValue({ success: true, message: '사용 가능한 닉네임입니다.' });
    updateUserProfile.mockRejectedValue({
      response: { data: {
        type: 'about:blank', title: 'Service Unavailable', status: 503,
        detail: '예약 시스템을 사용할 수 없습니다.', instance: '/api/users/profile',
        code: 'NICKNAME_RESERVATION_UNAVAILABLE',
      } },
    });
    const alertSpy = vi.spyOn(window, 'alert');

    render(<ProfileEditClient profileData={profileData} />);
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '새닉네임' } });
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));
    await screen.findByText('사용 가능한 닉네임입니다.');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      '프로필 업데이트 중 오류 발생: 닉네임을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    ));
    expect(screen.queryByText(/사용 중/)).not.toBeInTheDocument();
  });

  it('프로필 예약 만료 conflict는 초록 상태를 무효화하고 다시 중복 확인하도록 안내한다', async () => {
    checkNicknameAvailability
      .mockResolvedValueOnce({ success: true, message: '사용 가능한 닉네임입니다.' })
      .mockResolvedValueOnce({ success: false, message: '닉네임 확인이 필요합니다.' });
    updateUserProfile.mockRejectedValue({
      response: { data: {
        type: 'https://api.pikume.com/problems/user/profile-conflict',
        title: 'Conflict', status: 409,
        detail: '점유 정보가 없거나 만료되었거나 본인이 아닙니다.',
        instance: '/api/users/profile',
      } },
    });

    render(<ProfileEditClient profileData={profileData} />);
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '새닉네임' } });
    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));
    await screen.findByText('사용 가능한 닉네임입니다.');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    const conflictMessage = await screen.findByText('닉네임 예약이 만료되었거나 확인할 수 없습니다. 다시 중복 확인해 주세요.');
    expect(conflictMessage).toHaveClass('text-red-600');
    expect(screen.queryByText('사용 가능한 닉네임입니다.')).not.toBeInTheDocument();
    expect(updateUserProfile).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '중복확인' }));
    await screen.findByText('닉네임 확인이 필요합니다.');
    expect(checkNicknameAvailability).toHaveBeenCalledTimes(2);
  });
});
