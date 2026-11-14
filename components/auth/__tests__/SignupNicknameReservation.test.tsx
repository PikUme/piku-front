import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignupClient from '../SignupClient';
import api from '@/lib/api/api';

const { push, media, route } = vi.hoisted(() => ({
  push: vi.fn(),
  media: { desktop: true },
  route: { pathname: '/signup' },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => route.pathname,
}));
vi.mock('react-responsive', () => ({ useMediaQuery: () => media.desktop }));
vi.mock('@/lib/api/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const post = vi.mocked(api.post);
const originTime = new Date('2026-09-28T00:00:00Z');
const sent = {
  message: '인증코드가 발송되었습니다.',
  expiresAt: '2026-09-28T00:05:00Z',
  resendAvailableAt: '2026-09-28T00:01:00Z',
};
const verified = {
  message: '이메일 인증이 완료되었습니다.',
  emailVerificationToken: 'verification-token',
  expiresAt: '2026-09-28T00:10:00Z',
};

const change = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function sendAndVerify() {
  change('이메일을 입력해주세요', 'tester@example.test');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '전송' })));
  change('인증코드를 입력하세요', '123456');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '인증' })));
}

function completeSignupFields(nickname = '테스터') {
  change('비밀번호를 입력해주세요', 'password1!');
  change('비밀번호를 다시 입력해주세요', 'password1!');
  change('닉네임을 입력해주세요', nickname);
  fireEvent.click(screen.getByLabelText('모두 동의'));
  fireEvent.click(screen.getByAltText('캐릭터 CAT'));
}

describe('가입 닉네임 예약', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(originTime);
    vi.clearAllMocks();
    media.desktop = true;
    route.pathname = '/signup';
    vi.mocked(api.get).mockResolvedValue({ data: ['example.test'] });
    post.mockImplementation(async url => {
      if (url === '/auth/send-verification/sign-up') return { data: sent };
      if (url === '/auth/verify-code') return { data: verified };
      return { data: { message: '회원가입이 완료되었습니다.' } };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('인증 이메일·현재 토큰·닉네임을 보내고 서버 만료시각을 10분 카운트다운으로 표시한다', async () => {
    vi.mocked(api.get).mockImplementation(async url => ({
      data: url === '/auth/email-domains' ? ['example.test'] : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }],
    }));
    post.mockImplementation(async url => {
      if (url === '/auth/send-verification/sign-up') return { data: sent };
      if (url === '/auth/verify-code') return { data: verified };
      if (url === '/auth/signup/nickname-reservations') {
        return { data: { nickname: '테스터', expiresAt: '2026-09-28T00:10:00Z' } };
      }
      return { data: { message: '회원가입이 완료되었습니다.' } };
    });
    await act(async () => render(<SignupClient />));
    await sendAndVerify();
    change('닉네임을 입력해주세요', '테스터');

    expect(screen.getByText(/10분/)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));

    expect(post).toHaveBeenCalledWith(
      '/auth/signup/nickname-reservations',
      { email: 'tester@example.test', emailVerificationToken: 'verification-token', nickname: '테스터' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    expect(screen.getByText(/테스터 예약 중 · 10:00 남음/)).toBeInTheDocument();
  });

  it('같은 이메일 재인증 뒤 예약 재조회는 서버의 기존 만료시각을 연장하지 않는다', async () => {
    let verificationNumber = 0;
    post.mockImplementation(async url => {
      if (url === '/auth/send-verification/sign-up') return { data: {
        ...sent,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 60 * 1000).toISOString(),
      } };
      if (url === '/auth/verify-code') {
        verificationNumber += 1;
        return { data: {
          ...verified,
          emailVerificationToken: `verification-token-${verificationNumber}`,
          expiresAt: verificationNumber === 1 ? '2026-09-28T00:10:00Z' : '2026-09-28T00:20:00Z',
        } };
      }
      if (url === '/auth/signup/nickname-reservations') {
        return { data: { nickname: '테스터', expiresAt: '2026-09-28T00:12:00Z' } };
      }
      return { data: { message: '회원가입이 완료되었습니다.' } };
    });
    vi.mocked(api.get).mockImplementation(async url => ({
      data: url === '/auth/email-domains' ? ['example.test'] : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }],
    }));
    await act(async () => render(<SignupClient />));
    await sendAndVerify();
    await act(async () => vi.advanceTimersByTime(2 * 60 * 1000));
    change('닉네임을 입력해주세요', '테스터');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));
    expect(screen.getByText(/10:00 남음/)).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(8 * 60 * 1000));
    await act(async () => Promise.resolve());
    expect(screen.queryByRole('button', { name: '인증완료' })).not.toBeInTheDocument();
    await sendAndVerify();
    change('닉네임을 입력해주세요', '다른이름');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));

    expect(screen.getByText(/2:00 남음/)).toBeInTheDocument();
    expect(post.mock.calls.filter(([url]) => url === '/auth/signup/nickname-reservations')).toHaveLength(2);
  });

  it('확정 충돌은 직전 유효 예약 표시를 보존한다', async () => {
    vi.mocked(api.get).mockImplementation(async url => ({
      data: url === '/auth/email-domains' ? ['example.test'] : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }],
    }));
    post.mockImplementation(async url => {
      if (url === '/auth/send-verification/sign-up') return { data: sent };
      if (url === '/auth/verify-code') return { data: verified };
      if (url === '/auth/signup/nickname-reservations') {
        if (post.mock.calls.filter(([callUrl]) => callUrl === url).length > 1) {
          throw { response: { status: 409, data: {
            type: 'about:blank', title: 'Conflict', status: 409,
            code: 'NICKNAME_CONFLICT', detail: '이미 사용 중인 닉네임입니다.', instance: '/api/auth/signup/nickname-reservations',
          } } };
        }
        return { data: { nickname: '테스터', expiresAt: '2026-09-28T00:10:00Z' } };
      }
      return { data: { message: '회원가입이 완료되었습니다.' } };
    });
    await act(async () => render(<SignupClient />));
    await sendAndVerify();
    change('닉네임을 입력해주세요', '테스터');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));
    change('닉네임을 입력해주세요', '다른이름');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));

    expect(screen.getByRole('status')).toHaveTextContent(/테스터/);
    expect(screen.getByText('이미 사용 중인 닉네임입니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '인증완료' })).toBeInTheDocument();
  });

  it('예약 503은 이전 표시를 미확정으로 보존하고 성공 재확인 전 가입을 막는다', async () => {
    vi.mocked(api.get).mockImplementation(async url => ({
      data: url === '/auth/email-domains' ? ['example.test'] : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }],
    }));
    let reserveCount = 0;
    post.mockImplementation(async url => {
      if (url === '/auth/send-verification/sign-up') return { data: sent };
      if (url === '/auth/verify-code') return { data: verified };
      if (url === '/auth/signup/nickname-reservations') {
        reserveCount += 1;
        if (reserveCount === 1) return { data: { nickname: '테스터', expiresAt: '2026-09-28T00:10:00Z' } };
        throw { response: { status: 503, data: {
          type: 'about:blank', title: 'Service Unavailable', status: 503,
          code: 'NICKNAME_RESERVATION_UNAVAILABLE', detail: '닉네임 예약을 확인할 수 없습니다.', instance: '/api/auth/signup/nickname-reservations',
        } } };
      }
      return { data: { message: '회원가입이 완료되었습니다.' } };
    });
    await act(async () => render(<SignupClient />));
    await sendAndVerify();
    completeSignupFields();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));
    change('닉네임을 입력해주세요', '다른이름');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));

    expect(screen.getByText(/테스터/)).toBeInTheDocument();
    expect(screen.getByText(/예약 상태를 확인하지 못했습니다/)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));
    expect(post.mock.calls.filter(([url]) => url === '/auth/signup')).toHaveLength(0);
    expect(post.mock.calls.filter(([url]) => url === '/auth/signup/nickname-reservations')).toHaveLength(2);
  });

  it('예약 API의 인증 검증 503은 아직 유효한 로컬 proof와 이전 예약 표시를 유지한다', async () => {
    vi.mocked(api.get).mockImplementation(async url => ({
      data: url === '/auth/email-domains' ? ['example.test'] : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }],
    }));
    let reserveCount = 0;
    post.mockImplementation(async url => {
      if (url === '/auth/send-verification/sign-up') return { data: sent };
      if (url === '/auth/verify-code') return { data: verified };
      if (url === '/auth/signup/nickname-reservations') {
        reserveCount += 1;
        if (reserveCount === 1) return { data: { nickname: '테스터', expiresAt: '2026-09-28T00:10:00Z' } };
        throw { response: { status: 503, data: {
          type: 'about:blank', title: 'Service Unavailable', status: 503,
          code: 'VERIFICATION_UNAVAILABLE', detail: '인증 상태를 확인할 수 없습니다.', instance: '/api/auth/signup/nickname-reservations',
        } } };
      }
      return { data: { message: '회원가입이 완료되었습니다.' } };
    });
    await act(async () => render(<SignupClient />));
    await sendAndVerify();
    completeSignupFields();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));
    change('닉네임을 입력해주세요', '다른이름');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));

    expect(screen.getByRole('button', { name: '인증완료' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/테스터/);
    expect(screen.getByText('인증 상태를 확인할 수 없습니다.')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));
    expect(post).toHaveBeenCalledWith(
      '/auth/signup',
      expect.objectContaining({ emailVerificationToken: 'verification-token' }),
      expect.anything(),
    );
  });

  it('오래된 예약 요청의 finally가 새 예약 요청의 pending을 해제하지 않는다', async () => {
    const oldReservation = deferred<{ data: { nickname: string; expiresAt: string } }>();
    const newReservation = deferred<{ data: { nickname: string; expiresAt: string } }>();
    let reservationCount = 0;
    vi.mocked(api.get).mockImplementation(async url => ({
      data: url === '/auth/email-domains' ? ['example.test'] : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }],
    }));
    post.mockImplementation(async url => {
      if (url === '/auth/send-verification/sign-up') return { data: sent };
      if (url === '/auth/verify-code') return { data: verified };
      if (url === '/auth/signup/nickname-reservations') {
        reservationCount += 1;
        return reservationCount === 1 ? oldReservation.promise : newReservation.promise;
      }
      return { data: { message: '회원가입이 완료되었습니다.' } };
    });
    const { rerender } = render(<SignupClient />);
    await sendAndVerify();
    change('닉네임을 입력해주세요', '테스터');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));
    expect(screen.getByPlaceholderText('닉네임을 입력해주세요')).toBeDisabled();

    await act(async () => {
      route.pathname = '/';
      rerender(<SignupClient />);
    });
    await act(async () => {
      route.pathname = '/signup';
      rerender(<SignupClient />);
    });
    await sendAndVerify();
    change('닉네임을 입력해주세요', '테스터');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '예약' })));
    expect(screen.getByPlaceholderText('닉네임을 입력해주세요')).toBeDisabled();

    await act(async () => oldReservation.resolve({ data: { nickname: '테스터', expiresAt: '2026-09-28T00:10:00Z' } }));
    expect(screen.getByPlaceholderText('닉네임을 입력해주세요')).toBeDisabled();
    await act(async () => newReservation.resolve({ data: { nickname: '테스터', expiresAt: '2026-09-28T00:10:00Z' } }));
    expect(screen.getByPlaceholderText('닉네임을 입력해주세요')).toBeEnabled();
  });
});
