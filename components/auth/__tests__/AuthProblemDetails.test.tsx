import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignupClient from '../SignupClient';
import PasswordResetClient from '../PasswordResetClient';

const { mockPush, mockBack, sendSignUpVerificationEmail, sendVerificationCode } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockBack: vi.fn(),
    sendSignUpVerificationEmail: vi.fn(),
    sendVerificationCode: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

vi.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}));

vi.mock('@/lib/api/auth', () => ({
  signup: vi.fn(),
  sendSignUpVerificationEmail,
  verifyCode: vi.fn(),
  getAllowedEmailDomains: vi.fn().mockResolvedValue([]),
  sendVerificationCode,
  resetPassword: vi.fn(),
}));

describe('Auth Problem Details migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('회원가입 인증 메일 발송 실패 시 ProblemDetail.detail을 보여준다', async () => {
    sendSignUpVerificationEmail.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/auth/email-send-failure',
          title: 'Internal Server Error',
          status: 500,
          detail: '인증 메일 발송에 실패했습니다.',
          instance: '/api/auth/send-verification/sign-up',
        },
      },
    });

    render(<SignupClient />);

    fireEvent.change(screen.getByPlaceholderText('이메일을 입력해주세요'), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '전송' }));

    expect(
      await screen.findByText('인증 메일 발송에 실패했습니다.'),
    ).toBeInTheDocument();
  });

  it('비밀번호 재설정 인증 코드 발송 성공 시 MessageResponse.message를 보여준다', async () => {
    sendVerificationCode.mockResolvedValue({
      message: '서버 응답 기준 인증 코드가 발송되었습니다.',
    });

    render(<PasswordResetClient />);

    fireEvent.change(screen.getByPlaceholderText('가입한 이메일을 입력하세요'), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: '인증 코드 받기' }));

    expect(
      await screen.findByText('서버 응답 기준 인증 코드가 발송되었습니다.'),
    ).toBeInTheDocument();
  });
});
