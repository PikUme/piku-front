import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignupClient from '../SignupClient';
import api from '@/lib/api/api';

const { push, media, route } = vi.hoisted(() => ({ push: vi.fn(), media: { desktop: true }, route: { pathname: '/signup' } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => route.pathname }));
vi.mock('react-responsive', () => ({ useMediaQuery: () => media.desktop }));
vi.mock('@/lib/api/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const post = vi.mocked(api.post);
const originTime = new Date('2026-09-28T00:00:00Z');
const verificationSnapshotKey = 'pikume:signup-email-verification:v1';
const sent = { message: '인증코드가 발송되었습니다.', expiresAt: '2026-09-28T09:05:00' };
const verified = { message: '이메일 인증이 완료되었습니다.', emailVerificationToken: 'verification-token', expiresAt: '2026-09-28T09:10:00' };
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
    window.sessionStorage.clear();
    window.__pikumeSignupDocumentContext = {
      initialPathname: '/signup',
      navigationType: 'navigate',
      restoreAllowed: null,
    };
    media.desktop = true;
    route.pathname = '/signup';
    vi.mocked(api.get).mockImplementation(async url => ({ data: url === '/auth/email-domains' ? ['gmail.com'] : [{ id: 1, type: 'CAT', displayImageUrl: '/cat.png' }] }));
    post.mockImplementation(async url => ({ data: url === '/auth/send-verification/sign-up' ? sent : url === '/auth/verify-code' ? verified : { message: '회원가입 성공' } }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

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
    }, { headers: { 'Cache-Control': 'no-store' } });
    expect(push).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('회원가입 성공')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
  });

  it('이메일 인증 성공 전에는 저장하지 않고 성공 후 허용된 스냅샷만 저장한다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();

    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
    change('인증코드를 입력하세요', '123456');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '인증' })));

    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBe(JSON.stringify({
      version: 1,
      email: 'tester@gmail.com',
      emailVerificationToken: verified.emailVerificationToken,
      expiresAt: verified.expiresAt,
    }));
  });

  it('같은 가입 탭 재로드는 이메일과 유효 토큰을 복원하고 요청을 자동 실행하지 않는다', async () => {
    const firstDocument = render(<SignupClient />);
    await verifyEmail();
    const postCountBeforeReload = post.mock.calls.length;
    firstDocument.unmount();

    window.__pikumeSignupDocumentContext = {
      initialPathname: '/signup',
      navigationType: 'reload',
      restoreAllowed: null,
    };
    await act(async () => render(<SignupClient />));

    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).toHaveValue('tester@gmail.com');
    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(전송|재전송.*|인증)$/ })).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(postCountBeforeReload);
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).not.toBeNull();
  });

  it('가입 경로 이탈 시 스냅샷을 정리하고 같은 문서로 돌아와도 인증을 요구한다', async () => {
    const view = render(<SignupClient />);
    await verifyEmail();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).not.toBeNull();

    route.pathname = '/';
    await act(async () => view.rerender(<SignupClient />));
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();

    route.pathname = '/signup';
    await act(async () => view.rerender(<SignupClient />));
    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).toHaveValue('tester@gmail.com');
    expect(screen.getByRole('button', { name: '전송' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
  });

  it('다른 경로 재로드 뒤 가입 화면에 진입하면 복사된 세션 스냅샷을 폐기한다', async () => {
    const firstDocument = render(<SignupClient />);
    await verifyEmail();
    firstDocument.unmount();

    window.__pikumeSignupDocumentContext = {
      initialPathname: '/profile',
      navigationType: 'reload',
      restoreAllowed: null,
    };
    await act(async () => render(<SignupClient />));

    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).toHaveValue('');
    expect(screen.getByRole('button', { name: '전송' })).toBeDisabled();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
  });

  it('메시지만 있는 인증 응답에서는 회원가입을 막는다', async () => {
    post.mockImplementation(async url => ({ data: url === '/auth/verify-code' ? { message: 'ok' } : sent }));
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));

    expect(post.mock.calls.filter(([url]) => url === '/auth/signup')).toHaveLength(0);
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
    expect(screen.getByText('인증 결과를 확인할 수 없습니다. 다시 전송해주세요.')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
  });

  it.each([
    { message: 'ok', emailVerificationToken: 'token' },
    { message: 'ok', expiresAt: 'not-a-date' },
    { message: 'ok', emailVerificationToken: '', expiresAt: '2026-09-28T09:10:00' },
    { message: 'ok', emailVerificationToken: '', expiresAt: '' },
    { message: 'ok', emailVerificationToken: null, expiresAt: null },
    { message: 'ok', emailVerificationToken: 7, expiresAt: 42 },
  ])('불완전하거나 잘못된 검증 증명은 인증 성공으로 처리하지 않는다: %o', async response => {
    post.mockImplementation(async url => ({ data: url === '/auth/verify-code' ? response : sent }));
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('인증코드를 입력하세요', '123456');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '인증' })));
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
  });

  it('가입에서 인증 토큰 필드 오류가 오면 저장값을 지우고 모바일 화면에서 재인증을 요구한다', async () => {
    media.desktop = false;
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '다음' })));
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    post.mockRejectedValueOnce({ response: { status: 400, data: {
      type: 'about:blank', title: '검증 오류', status: 400, detail: '이메일 인증이 필요합니다.',
      instance: '/api/auth/signup', fieldErrors: { emailVerificationToken: '필수 항목입니다.' },
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));
    expect(post.mock.calls.filter(([url]) => url === '/auth/signup')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.getByText('이메일 인증이 필요합니다.')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
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
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
  });

  it('인증 완료 후 이메일 변경과 토큰 만료는 다시 인증을 요구한다', async () => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).not.toBeDisabled();
    await act(async () => vi.advanceTimersByTime(599000));
    expect(screen.queryByRole('button', { name: /^(전송|재전송.*|인증)$/ })).not.toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: '전송' })).toBeEnabled();
    expect(screen.getByText(/인증.*만료/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
  });

  it('발송 코드 만료 후 검증 요청을 보내지 않는다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    expect(screen.getByText('인증코드 유효시간 5:00')).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(300000));
    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('인증 완료 후 이메일을 바꾸면 인증 상태와 코드를 비운다', async () => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    expect(screen.queryByText('이메일 인증 완료')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(전송|재전송.*|인증완료|인증)$/ })).not.toBeInTheDocument();
    change('이메일을 입력해주세요', 'other@gmail.com');
    expect(screen.getByRole('button', { name: '전송' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
  });

  it('가입 경로 이탈 중 늦게 도착한 가입 응답은 상태와 로그인 이동을 만들지 않는다', async () => {
    let resolveSignup!: (value: unknown) => void;
    const view = render(<SignupClient />);
    await verifyEmail();
    completeFields();
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    post.mockImplementationOnce(() => new Promise(resolve => { resolveSignup = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: '회원 가입' }));
    route.pathname = '/';
    await act(async () => view.rerender(<SignupClient />));
    await act(async () => resolveSignup({ data: { message: '회원가입 성공' } }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText('회원가입 성공')).not.toBeInTheDocument();
  });

  it('가입 경로 이탈 중 늦은 발송 응답과 완료 처리는 무시한다', async () => {
    let resolveSend!: (value: unknown) => void;
    const view = render(<SignupClient />);
    post.mockImplementationOnce(() => new Promise(resolve => { resolveSend = resolve; }));
    change('이메일을 입력해주세요', 'tester@gmail.com');
    fireEvent.click(screen.getByRole('button', { name: '전송' }));
    route.pathname = '/';
    await act(async () => view.rerender(<SignupClient />));
    await act(async () => resolveSend({ data: sent }));

    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(screen.queryByText('인증코드가 발송되었습니다.')).not.toBeInTheDocument();
  });

  it('가입 경로 이탈 중 늦은 코드 검증 응답은 토큰을 만들지 않는다', async () => {
    let resolveVerify!: (value: unknown) => void;
    const view = render(<SignupClient />);
    await sendCode();
    post.mockImplementationOnce(() => new Promise(resolve => { resolveVerify = resolve; }));
    change('인증코드를 입력하세요', '123456');
    fireEvent.click(screen.getByRole('button', { name: '인증' }));
    route.pathname = '/';
    await act(async () => view.rerender(<SignupClient />));
    await act(async () => resolveVerify({ data: verified }));

    expect(screen.queryByText('이메일 인증이 완료되었습니다.')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
  });

  it('BFCache 복원 시 화면 인증과 코드 입력을 폐기한다', async () => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    const pageshow = Object.assign(new Event('pageshow'), { persisted: true });
    await act(async () => window.dispatchEvent(pageshow));

    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전송' })).toBeEnabled();
    expect(window.sessionStorage.getItem(verificationSnapshotKey)).toBeNull();
  });

  it('메일함을 확인하기 위한 모바일 내부 단계 이동은 인증을 유지한다', async () => {
    media.desktop = false;
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    fireEvent.click(screen.getByLabelText('모두 동의'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '다음' })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '<' })));

    expect(screen.queryByRole('button', { name: /^(전송|재전송.*|인증)$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
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
    post.mockResolvedValueOnce({ data: { ...sent, expiresAt: '2026-09-28T09:06:00' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '재전송' })));
    expect(screen.getByPlaceholderText('인증코드를 입력하세요')).toHaveValue('');
    expect(screen.getByText('인증코드 유효시간 5:00')).toBeInTheDocument();
  });

  it('BE4 응답에 재전송 시각이 없으면 임의 대기 UI를 표시하지 않는다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    expect(screen.getByRole('button', { name: '재전송' })).toBeEnabled();
    expect(screen.queryByText(/재전송 \(/)).not.toBeInTheDocument();
  });

  it('성공 응답의 resendAvailableAt만큼 재전송을 제한한다', async () => {
    post.mockImplementation(async url => ({ data: url === '/auth/send-verification/sign-up'
      ? { ...sent, resendAvailableAt: '2026-09-28T09:01:00' }
      : url === '/auth/verify-code' ? verified : { message: 'ok' } }));
    await act(async () => render(<SignupClient />));
    await sendCode();
    expect(screen.getByRole('button', { name: '재전송 (60초)' })).toBeDisabled();
    await act(async () => vi.advanceTimersByTime(60000));
    expect(screen.getByRole('button', { name: '재전송' })).toBeEnabled();
  });

  it('RATE_LIMITED는 현재 코드를 유지하고 서버 대기 시각만 표시한다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('인증코드를 입력하세요', '123456');
    post.mockRejectedValueOnce({ response: { status: 429, data: {
      type: 'about:blank', title: '요청 제한', status: 429, detail: '잠시 후 다시 시도해주세요.',
      instance: '/api/auth/send-verification/sign-up', code: 'RATE_LIMITED',
      resendAvailableAt: '2026-09-28T09:11:00',
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '재전송' })));

    expect(screen.getByPlaceholderText('인증코드를 입력하세요')).toHaveValue('123456');
    expect(screen.getByText('인증코드 유효시간 5:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재전송 (660초)' })).toBeDisabled();
  });

  it('가입 요청의 RATE_LIMITED는 현재 검증 토큰을 유지한다', async () => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    post.mockRejectedValueOnce({ response: { status: 429, data: {
      type: 'about:blank', title: '요청 제한', status: 429, detail: '잠시 후 다시 시도해주세요.',
      instance: '/api/auth/signup', code: 'RATE_LIMITED',
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));

    expect(screen.queryByRole('button', { name: /^(전송|재전송.*|인증)$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeEnabled();
    expect(screen.getByText('잠시 후 다시 시도해주세요.')).toBeInTheDocument();
  });

  it.each(['VERIFICATION_INVALID', 'CODE_EXPIRED'])('%s 재전송 실패는 코드와 만료 타이머를 지우고 한 번 알린다', async code => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('인증코드를 입력하세요', '123456');
    post.mockRejectedValueOnce({ response: { status: 400, data: {
      type: 'about:blank', title: '인증 오류', status: 400, detail: '인증을 다시 진행해주세요.',
      instance: '/api/auth/send-verification/sign-up', code,
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '재전송' })));

    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(screen.queryByText(/인증코드 유효시간/)).not.toBeInTheDocument();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith('잠시 후 다시 시도해 주세요.');
  });

  it('가입 경로 이탈 뒤 도착한 무효 재전송 오류는 알리지 않는다', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    let rejectSend!: (error: unknown) => void;
    const view = render(<SignupClient />);
    await sendCode();
    post.mockImplementationOnce(() => new Promise((_, reject) => { rejectSend = reject; }));
    fireEvent.click(screen.getByRole('button', { name: '재전송' }));
    route.pathname = '/';
    await act(async () => view.rerender(<SignupClient />));
    await act(async () => rejectSend({ response: { status: 400, data: {
      type: 'about:blank', title: '인증 만료', status: 400, detail: '인증을 다시 진행해주세요.',
      instance: '/api/auth/send-verification/sign-up', code: 'CODE_EXPIRED',
    } } }));

    expect(alert).not.toHaveBeenCalled();
  });

  it('허용된 재전송의 503은 현재 코드를 지우고 Retry-After를 표시한다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('인증코드를 입력하세요', '123456');
    post.mockRejectedValueOnce({ response: { status: 503, headers: { 'retry-after': '420' }, data: {
      type: 'about:blank', title: '서비스 이용 불가', status: 503, detail: '잠시 후 다시 시도해주세요.',
      instance: '/api/auth/send-verification/sign-up', code: 'EMAIL_SEND_FAILED',
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '재전송' })));

    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재전송 (420초)' })).toBeDisabled();
    expect(screen.getByText('잠시 후 다시 시도해주세요.')).toBeInTheDocument();
  });

  it('ATTEMPTS_EXHAUSTED 429는 코드를 폐기하고 서버 재전송 시각으로 복구를 안내한다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('인증코드를 입력하세요', '123456');
    post.mockRejectedValueOnce({ response: { status: 429, data: {
      type: 'about:blank', title: '시도 횟수 초과', status: 429, detail: '인증 시도 횟수가 끝났습니다.',
      instance: '/api/auth/verify-code', code: 'ATTEMPTS_EXHAUSTED',
      resendAvailableAt: '2026-09-28T09:05:00',
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '인증' })));

    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재전송 (300초)' })).toBeDisabled();
    expect(screen.getByText('인증 시도 횟수가 끝났습니다.')).toBeInTheDocument();
  });

  it.each([
    ['AuthProblemType URI', 'https://api.pikume.com/problems/auth/invalid-email', undefined],
    ['email verification code', 'https://api.pikume.com/problems/email-verification/invalid-email', 'INVALID_EMAIL'],
  ])('발송 %s 오류는 아직 유효한 기존 코드를 보존한다', async (_, type, code) => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('인증코드를 입력하세요', '123456');
    await act(async () => vi.advanceTimersByTime(60000));
    post.mockRejectedValueOnce({ response: { status: 400, data: {
      type, title: 'Bad Request', status: 400, detail: '지원하지 않는 이메일 형식입니다.',
      instance: '/api/auth/send-verification/sign-up', ...(code ? { code } : {}),
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '재전송' })));

    expect(screen.getByPlaceholderText('인증코드를 입력하세요')).toHaveValue('123456');
    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).toHaveAccessibleDescription('지원하지 않는 이메일 형식입니다.');
  });

  it('가입에 사용할 수 없는 이메일 안내를 형식 오류와 같은 입력란 아래에 표시한다', async () => {
    await act(async () => render(<SignupClient />));
    change('이메일을 입력해주세요', '형식오류');
    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).toHaveAccessibleDescription('유효한 이메일 형식이 아닙니다.');

    post.mockRejectedValueOnce({ response: { status: 400, data: {
      type: 'https://api.pikume.com/problems/email-verification/invalid-email',
      title: 'Bad Request', status: 400, detail: '가입에 사용할 수 없는 이메일입니다.',
      instance: '/api/auth/send-verification/sign-up', code: 'INVALID_EMAIL',
    } } });
    await sendCode();
    expect(screen.getAllByText('가입에 사용할 수 없는 이메일입니다.')).toHaveLength(1);
    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).toHaveAccessibleDescription('가입에 사용할 수 없는 이메일입니다.');
    change('이메일을 입력해주세요', 'other@gmail.com');
    expect(screen.queryByText('가입에 사용할 수 없는 이메일입니다.')).not.toBeInTheDocument();
  });

  it('409 닉네임 충돌은 이메일 중복으로 오인하지 않고 인증 토큰을 유지한다', async () => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    post.mockRejectedValueOnce({ response: { status: 409, data: {
      type: 'https://api.pikume.com/problems/user/nickname-conflict', title: 'Conflict', status: 409,
      detail: '이미 사용 중인 닉네임입니다.', instance: '/api/auth/signup',
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));

    expect(screen.getAllByText('이미 사용 중인 닉네임입니다.')).toHaveLength(1);
    expect(screen.getByPlaceholderText('닉네임을 입력해주세요')).toHaveAccessibleDescription('이미 사용 중인 닉네임입니다.');
    expect(screen.queryByRole('button', { name: /^(전송|재전송.*|인증)$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회원 가입' })).toBeEnabled();
  });

  it('AuthProblemType 이메일 중복 URI는 가입 오류에서 로그인 경로를 안내한다', async () => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    post.mockRejectedValueOnce({ response: { status: 409, data: {
      type: 'https://api.pikume.com/problems/auth/email-already-exists', title: 'Conflict', status: 409,
      detail: '이미 가입된 이메일입니다.', instance: '/api/auth/signup',
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));

    expect(screen.getByPlaceholderText('이메일을 입력해주세요')).toHaveAccessibleDescription('이미 가입된 이메일입니다. 로그인 페이지에서 로그인해주세요.');
    expect(screen.queryByRole('button', { name: '전송' })).not.toBeInTheDocument();
  });

  it('코드 불일치는 입력을 유지한다', async () => {
    await act(async () => render(<SignupClient />));
    await sendCode();
    change('인증코드를 입력하세요', '123456');
    post.mockRejectedValueOnce({ response: { status: 400, data: {
      type: 'about:blank', title: '인증 실패', status: 400, detail: '코드를 확인해주세요.',
      instance: '/api/auth/verify-code', code: 'CODE_MISMATCH',
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '인증' })));
    expect(screen.getByPlaceholderText('인증코드를 입력하세요')).toHaveValue('123456');

  });

  it.each(['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_ALREADY_USED', 'VERIFICATION_INVALID', 'NICKNAME_ALREADY_IN_USE'])('%s 오류에서 인증 복구 필요 여부를 구분한다', async code => {
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    post.mockRejectedValueOnce({ response: { data: { type: 'https://api.pikume.com/problems/email-verification/token-invalid', title: '요청 실패', status: 400, detail: '요청을 확인해주세요.', instance: '/api/auth/signup', code } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));
    expect(screen.getByText('요청을 확인해주세요.')).toBeInTheDocument();
    if (code.startsWith('TOKEN_') || code === 'VERIFICATION_INVALID') {
      expect(screen.getByRole('button', { name: '전송' })).toBeEnabled();
      expect(screen.getByRole('button', { name: '회원 가입' })).toBeDisabled();
    } else {
      expect(screen.queryByRole('button', { name: /^(전송|재전송.*|인증)$/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '회원 가입' })).toBeEnabled();
    }
  });

  it('서버가 인증 토큰을 거절하는 VERIFICATION_INVALID에서 모바일 첫 단계로 복구한다', async () => {
    media.desktop = false;
    await act(async () => render(<SignupClient />));
    await verifyEmail();
    completeFields();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '다음' })));
    fireEvent.click(screen.getByAltText('캐릭터 CAT'));
    post.mockRejectedValueOnce({ response: { status: 400, data: {
      type: 'about:blank', title: '인증 만료', status: 400, detail: '이메일 인증을 다시 해주세요.',
      instance: '/api/auth/signup', code: 'VERIFICATION_INVALID',
    } } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '회원 가입' })));

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '전송' })).toBeEnabled();
    expect(screen.queryByPlaceholderText('인증코드를 입력하세요')).not.toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '전송' })));
    expect(screen.getByPlaceholderText('인증코드를 입력하세요')).toBeInTheDocument();
  });

  it.each([
    ['UTC', '2026-09-28T00:05:00Z', '2026-09-28T00:10:00Z'],
    ['Asia/Seoul', '2026-09-28T09:05:00+09:00', '2026-09-28T09:10:00+09:00'],
    ['America/Los_Angeles', '2026-09-28T09:05:00+09:00', '2026-09-28T09:10:00+09:00'],
    ['America/Los_Angeles', '2026-09-28T09:05:00.123456', '2026-09-28T09:10:00.123456'],
  ])('%s timezone에서 이메일 인증 시각을 같은 만료 시점으로 해석한다', async (timezone, expiresAt, tokenExpiresAt) => {
    vi.stubEnv('TZ', timezone);
    vi.setSystemTime(new Date('2026-09-28T00:00:00.123Z'));
    post.mockImplementation(async url => ({ data: url === '/auth/send-verification/sign-up'
      ? { ...sent, expiresAt }
      : { ...verified, expiresAt: tokenExpiresAt } }));
    await act(async () => render(<SignupClient />));
    await sendCode();
    expect(screen.getByText('인증코드 유효시간 5:00')).toBeInTheDocument();
    change('인증코드를 입력하세요', '123456');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '인증' })));
    await act(async () => vi.advanceTimersByTime(599000));
    expect(screen.queryByRole('button', { name: /^(전송|재전송.*|인증)$/ })).not.toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: '전송' })).toBeEnabled();
  });

});
