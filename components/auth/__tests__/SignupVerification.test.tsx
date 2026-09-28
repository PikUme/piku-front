import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignupClient from '../SignupClient';
import api from '@/lib/api/api';

const { push, media } = vi.hoisted(() => ({ push: vi.fn(), media: { desktop: true } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('react-responsive', () => ({ useMediaQuery: () => media.desktop }));
vi.mock('@/lib/api/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const post = vi.mocked(api.post);
const originTime = new Date('2026-09-28T00:00:00Z');
const sent = { message: '인증코드가 발송되었습니다.', expiresAt: '2026-09-28T00:05:00Z', resendAvailableAt: '2026-09-28T00:01:00Z' };
const verified = { message: '이메일 인증이 완료되었습니다.', emailVerificationToken: 'verification-token', expiresAt: '2026-09-28T00:10:00Z' };
const change = (placeholder: string, value: string) => fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
async function sendCode() {
  change('이메일을 입력해주세요', 'tester@gmail.com');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '전송' })));
}
async function verifyEmail() {
  await sendCode();
  change('인증코드를 입력하세요', '123456');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '인증' })));
}
function completeFields() {
  change('비밀번호를 입력해주세요', 'password1!');
  change('비밀번호를 다시 입력해주세요', 'password1!');
  change('닉네임을 입력해주세요', '테스터');
  fireEvent.click(screen.getByLabelText('모두 동의'));
}

describe('기존 회원가입 이메일 인증', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(originTime);
    vi.clearAllMocks();
    media.desktop = true;
    vi.mocked(api.get).mockImplementation(async url => ({ data: url === '/auth/email-domains' ? ['gmail.com'] : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }] }));
    post.mockImplementation(async url => ({ data: url === '/auth/send-verification/sign-up' ? sent : url === '/auth/verify-code' ? verified : { message: '회원가입 성공' } }));
  });
  afterEach(() => vi.useRealTimers());

  it.each([true, false])('데스크톱 여부 %s: 인증 토큰을 가입 요청에 보내고 로그인 화면으로 이동한다', async desktop => {
    media.desktop = desktop;
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    if (!desktop) await act(async () => fireEvent.click(screen.getByRole('button', { name: '다음' })));
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));
    expect(post).toHaveBeenCalledWith('/auth/signup', {
      email: 'tester@gmail.com', password: 'password1!', nickname: '테스터', fixedCharacterId: 1, emailVerificationToken: 'verification-token',
    });
    expect(window.localStorage.getItem('emailVerificationToken')).toBeNull();
    await act(async () => vi.advanceTimersByTime(2000));
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('이메일 변경 뒤 도착한 코드 검증 응답은 새 이메일을 인증하지 않는다', async () => {
    let resolve!: (value: unknown) => void;
    await act(async () => render(<SignupClient />));
    await sendCode();
    post.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    change('인증코드를 입력하세요', '123456');
    fireEvent.click(screen.getByRole('button', { name: '인증' }));
    change('이메일을 입력해주세요', 'other@gmail.com');
    await act(async () => resolve({ data: verified }));
    expect(screen.queryByRole('button', { name: '인증완료' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
  });

  it('인증 완료 후 이메일 변경과 토큰 만료는 다시 인증을 요구한다', async () => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).not.toBeDisabled();
    await act(async () => vi.advanceTimersByTime(600000));
    expect(screen.queryByRole('button', { name: '인증완료' })).not.toBeInTheDocument();
    expect(screen.getByText(/인증.*만료/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
  });

  it('재전송 대기 중 중복 발송을 막고 코드 만료 후 검증 요청을 보내지 않는다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    expect(screen.getByRole('button', { name: /재전송.*60/ })).toBeDisabled();
    await act(async () => vi.advanceTimersByTime(60000));
    expect(screen.getByRole('button', { name: '재전송' })).toBeEnabled();
    await act(async () => vi.advanceTimersByTime(240000));
    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('인증 완료 후 이메일을 바꾸면 인증 상태와 코드를 비운다', async () => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    change('이메일을 입력해주세요', 'other@gmail.com');
    expect(screen.queryByRole('button', { name: '인증완료' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
  });

  it('이전 이메일의 늦은 발송 응답을 무시한다', async () => {
    let resolve!: (value: unknown) => void;
    post.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('이메일을 입력해주세요', 'other@gmail.com');
    await act(async () => resolve({ data: sent }));
    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전송' })).toBeEnabled();
  });

  it('재전송은 이전 코드를 비우고 새 응답의 유효시간을 사용한다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('인증코드를 입력하세요', '111111');
    await act(async () => vi.advanceTimersByTime(60000));
    post.mockResolvedValueOnce({ data: { ...sent, expiresAt: '2026-09-28T00:06:00Z', resendAvailableAt: '2026-09-28T00:02:00Z' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '재전송' })));
    expect(screen.getByPlaceholderText('인증코드를 입력하세요')).toHaveValue('');
    expect(screen.getByText('인증코드 유효시간 5:00')).toBeInTheDocument();
  });

  it.each(['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_ALREADY_USED', 'NICKNAME_ALREADY_IN_USE'])('%s 오류에서 인증 복구 필요 여부를 구분한다', async code => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    post.mockRejectedValueOnce({ response: { data: { type: 'https://api.pikume.com/problems/email-verification/token-invalid', title: '요청 실패', status: 400, detail: '요청을 확인해주세요.', instance: '/api/auth/signup', code } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));
    expect(screen.getByText('요청을 확인해주세요.')).toBeInTheDocument();
    if (code.startsWith('TOKEN_')) {
      expect(screen.queryByRole('button', { name: '인증완료' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
    } else {
      expect(screen.getByRole('button', { name: '인증완료' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '회원 가입' })).toBeEnabled();
    }
  });

});
