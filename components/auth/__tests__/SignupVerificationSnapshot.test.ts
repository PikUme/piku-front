import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSignupVerificationSnapshot,
  restoreSignupVerificationSnapshot,
  saveSignupVerificationSnapshot,
  type SignupDocumentContext,
} from '@/lib/auth/signupVerificationSnapshot';

const validSnapshot = {
  email: 'tester@example.com',
  emailVerificationToken: 'verification-token',
  expiresAt: '2026-09-28T09:10:00',
};

describe('회원가입 이메일 인증 스냅샷', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T00:00:00Z'));
    window.sessionStorage.clear();
    window.__pikumeSignupDocumentContext = {
      initialPathname: '/signup',
      navigationType: 'reload',
      restoreAllowed: null,
    };
  });

  afterEach(() => {
    delete window.__pikumeSignupDocumentContext;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('필요한 이메일·토큰·원래 만료 시각만 버전 키에 저장한다', () => {
    saveSignupVerificationSnapshot(validSnapshot);

    expect(window.sessionStorage.getItem('pikume:signup-email-verification:v1')).toBe(JSON.stringify({
      version: 1,
      ...validSnapshot,
    }));
    expect(window.sessionStorage.length).toBe(1);
  });

  it('같은 문서의 컴포넌트 재마운트에서도 유효한 스냅샷을 읽는다', () => {
    saveSignupVerificationSnapshot(validSnapshot);

    expect(restoreSignupVerificationSnapshot()).toEqual(validSnapshot);
    expect(restoreSignupVerificationSnapshot()).toEqual(validSnapshot);
    expect(window.sessionStorage.getItem('pikume:signup-email-verification:v1')).not.toBeNull();
  });

  it.each([
    '2099-09-28T09:10:00',
    '2099-09-28T09:10',
    '2099-09-28T00:10:00Z',
    '2099-09-28T09:10:00+09:00',
    '2099-09-28T09:10:00.123456+09:00',
  ])('유효한 서버 만료 시각 형식을 유지한다: %s', expiresAt => {
    const snapshot = { ...validSnapshot, expiresAt };
    saveSignupVerificationSnapshot(snapshot);

    expect(restoreSignupVerificationSnapshot()).toEqual(snapshot);
  });

  it('형식에 없는 추가 데이터는 세션 저장소에 쓰지 않는다', () => {
    saveSignupVerificationSnapshot({
      ...validSnapshot,
      nickname: '폼 값',
    } as typeof validSnapshot);

    expect(window.sessionStorage.getItem('pikume:signup-email-verification:v1')).toBe(JSON.stringify({
      version: 1,
      ...validSnapshot,
    }));
  });

  it('각 재로드에서 같은 만료 시각의 스냅샷을 다시 복원한다', () => {
    saveSignupVerificationSnapshot(validSnapshot);

    expect(restoreSignupVerificationSnapshot()).toEqual(validSnapshot);
    window.__pikumeSignupDocumentContext = {
      initialPathname: '/signup',
      navigationType: 'reload',
      restoreAllowed: null,
    };
    expect(restoreSignupVerificationSnapshot()).toEqual(validSnapshot);
    expect(window.sessionStorage.getItem('pikume:signup-email-verification:v1')).not.toBeNull();
  });

  it('일반 문서의 첫 진입 후 새 인증을 저장하면 재마운트가 이를 지우지 않는다', () => {
    window.__pikumeSignupDocumentContext = {
      initialPathname: '/signup',
      navigationType: 'navigate',
      restoreAllowed: null,
    };
    expect(restoreSignupVerificationSnapshot()).toBeNull();

    saveSignupVerificationSnapshot(validSnapshot);

    expect(restoreSignupVerificationSnapshot()).toBeNull();
    expect(window.sessionStorage.getItem('pikume:signup-email-verification:v1')).not.toBeNull();
  });

  it.each([
    [{ initialPathname: '/profile', navigationType: 'reload' }],
    [{ initialPathname: '/signup', navigationType: 'navigate' }],
    [{ initialPathname: '/signup', navigationType: 'back_forward' }],
  ] as Array<[Omit<SignupDocumentContext, 'restoreAllowed'>]>)('재로드가 아닌 문서 진입에서는 스냅샷을 폐기한다: %o', context => {
    saveSignupVerificationSnapshot(validSnapshot);
    window.__pikumeSignupDocumentContext = { ...context, restoreAllowed: null };

    expect(restoreSignupVerificationSnapshot()).toBeNull();
    expect(window.sessionStorage.getItem('pikume:signup-email-verification:v1')).toBeNull();
  });

  it('증명 정리 후 저장소 삭제가 실패해도 같은 문서에서 토큰을 다시 읽지 않는다', () => {
    saveSignupVerificationSnapshot(validSnapshot);
    expect(restoreSignupVerificationSnapshot()).toEqual(validSnapshot);
    const actualStorage = window.sessionStorage;
    const stored = actualStorage.getItem('pikume:signup-email-verification:v1');
    const removeItem = vi.fn();
    vi.spyOn(window, 'sessionStorage', 'get').mockReturnValue({
      getItem: () => stored,
      setItem: vi.fn(),
      removeItem,
      clear: vi.fn(),
      key: vi.fn(),
      length: 1,
    } as unknown as Storage);

    clearSignupVerificationSnapshot();

    expect(removeItem).toHaveBeenCalledWith('pikume:signup-email-verification:v1');
    expect(actualStorage.getItem('pikume:signup-email-verification:v1')).not.toBeNull();
    expect(restoreSignupVerificationSnapshot()).toBeNull();
  });

  it.each([
    'not-json',
    JSON.stringify({ version: 2, ...validSnapshot }),
    JSON.stringify({ version: 1, ...validSnapshot, nickname: '저장하면 안 되는 값' }),
    JSON.stringify({ version: 1, ...validSnapshot, email: 'invalid-email' }),
    JSON.stringify({ version: 1, ...validSnapshot, emailVerificationToken: '  ' }),
    JSON.stringify({ version: 1, ...validSnapshot, expiresAt: 'invalid-time' }),
    JSON.stringify({ version: 1, ...validSnapshot, expiresAt: '2099-02-30T09:10:00' }),
    JSON.stringify({ version: 1, ...validSnapshot, expiresAt: '2099-03-01T24:00:00' }),
    JSON.stringify({ version: 1, ...validSnapshot, expiresAt: '2099-03-01T09:10:00+24:00' }),
    JSON.stringify({ ...validSnapshot, expiresAt: '2026-09-28T08:59:59' }),
  ])('잘못된 스키마나 만료된 인증은 폐기한다: %s', value => {
    window.sessionStorage.setItem('pikume:signup-email-verification:v1', value);

    expect(restoreSignupVerificationSnapshot()).toBeNull();
    expect(window.sessionStorage.getItem('pikume:signup-email-verification:v1')).toBeNull();
  });

  it('저장소 접근 오류가 인증 화면을 중단시키지 않는다', () => {
    const storage = {
      setItem: () => {
        throw new Error('storage is disabled');
      },
      getItem: () => {
        throw new Error('storage is disabled');
      },
      removeItem: () => {
        throw new Error('storage is disabled');
      },
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage;
    vi.spyOn(window, 'sessionStorage', 'get').mockReturnValue(storage);

    expect(() => saveSignupVerificationSnapshot(validSnapshot)).not.toThrow();
    expect(() => restoreSignupVerificationSnapshot()).not.toThrow();
    expect(() => clearSignupVerificationSnapshot()).not.toThrow();
  });
});
