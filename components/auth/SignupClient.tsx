'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useMediaQuery } from 'react-responsive';
import {
  signup,
  sendSignUpVerificationEmail,
  reserveSignupNickname,
  verifyCode,
  getAllowedEmailDomains,
} from '@/lib/api/auth';
import { getApiErrorMessage, getProblemDetail } from '@/lib/utils/apiError';
import { usePathname, useRouter } from 'next/navigation';
import MobileView from './signup/MobileView';
import DesktopView from './signup/DesktopView';
import {
  AuthValues,
  SignupNicknameReservation,
  SignupVerificationSentResponse,
} from '@/types/auth';

const parseEmailVerificationTime = (value: string) =>
  Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}+09:00`);

const AUTH_EMAIL_ALREADY_EXISTS_TYPE = 'https://api.pikume.com/problems/auth/email-already-exists';
const AUTH_INVALID_EMAIL_TYPE = 'https://api.pikume.com/problems/auth/invalid-email';
const isEmailAlreadyExists = (error: unknown) => {
  const problem = getProblemDetail(error);
  return problem?.code === 'EMAIL_ALREADY_EXISTS' || problem?.type === AUTH_EMAIL_ALREADY_EXISTS_TYPE;
};
const isInvalidEmail = (error: unknown) => {
  const problem = getProblemDetail(error);
  return problem?.code === 'INVALID_EMAIL' || problem?.type === AUTH_INVALID_EMAIL_TYPE;
};

const getHttpStatus = (error: unknown) =>
  (error as { response?: { status?: number } } | null)?.response?.status ?? getProblemDetail(error)?.status;

const getRetryAfterTime = (error: unknown, fallback: number | null): number | null => {
  const problem = getProblemDetail(error);
  if (problem?.resendAvailableAt) {
    const parsed = parseEmailVerificationTime(problem.resendAvailableAt);
    if (Number.isFinite(parsed) && parsed > Date.now()) return parsed;
  }

  const headers = (error as { response?: { headers?: Record<string, unknown> & { get?: (key: string) => unknown } } } | null)?.response?.headers;
  const raw = headers?.get?.('retry-after') ?? headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (typeof raw === 'string' && raw.trim()) {
    const seconds = Number(raw);
    const parsed = Number.isFinite(seconds) ? Date.now() + Math.max(0, seconds) * 1000 : Date.parse(raw);
    if (Number.isFinite(parsed) && parsed > Date.now()) return parsed;
  }
  return fallback !== null && fallback > Date.now() ? fallback : null;
};

const SignupClient = () => {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<AuthValues>({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    character: '',
    verificationCode: '',
  });
  const [errors, setErrors] = useState({ email: '', password: '', passwordConfirm: '' });
  const [emailDomains, setEmailDomains] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isReservingNickname, setIsReservingNickname] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const [sentVerification, setSentVerification] = useState<SignupVerificationSentResponse | null>(null);
  const [emailVerification, setEmailVerification] = useState<{ token?: string; expiresAt: number; email: string; legacy: boolean } | null>(null);
  const [nicknameReservation, setNicknameReservation] = useState<{ nickname: string; expiresAt: number } | null>(null);
  const [isReservationUncertain, setIsReservationUncertain] = useState(false);
  const [nicknameReservationError, setNicknameReservationError] = useState('');
  const [retryAvailableAt, setRetryAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const emailRequestVersion = useRef(0);
  const emailRequestPending = useRef(false);
  const signupPending = useRef(false);
  const reservationRequestSequence = useRef(0);
  const activeReservationRequestId = useRef<number | null>(null);
  const reservationContextVersion = useRef(0);
  const nicknameReservationPending = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEmailVerified = emailVerification !== null && emailVerification.email === values.email && (emailVerification.legacy || emailVerification.expiresAt > now);
  const sentExpiresAt = sentVerification?.expiresAt ? parseEmailVerificationTime(sentVerification.expiresAt) : Number.NaN;
  const isVerificationSent = sentVerification !== null && (!sentVerification.expiresAt || (Number.isFinite(sentExpiresAt) && sentExpiresAt > now));
  const codeSeconds = isVerificationSent && Number.isFinite(sentExpiresAt) ? Math.max(0, Math.ceil((sentExpiresAt - now) / 1000)) : undefined;
  const resendSeconds = retryAvailableAt !== null ? Math.max(0, Math.ceil((retryAvailableAt - now) / 1000)) : 0;
  const reservationSeconds = nicknameReservation
    ? Math.max(0, Math.ceil((nicknameReservation.expiresAt - now) / 1000))
    : 0;
  const isNicknameReserved = !isReservationUncertain
    && nicknameReservation !== null
    && nicknameReservation.expiresAt > now
    && nicknameReservation.nickname === values.nickname;
  const canReserveNickname = isEmailVerified && Boolean(emailVerification?.token);
  const nicknameReservationMessage = isReservationUncertain
    ? `${nicknameReservation ? `이전 예약 표시: ${nicknameReservation.nickname} · ${Math.floor(reservationSeconds / 60)}:${String(reservationSeconds % 60).padStart(2, '0')} 남음 (보유 여부 미확인). ` : ''}예약 상태를 확인하지 못했습니다. 다시 확인해 주세요.`
    : nicknameReservation
      ? reservationSeconds > 0
        ? `${nicknameReservation.nickname} 예약 중 · ${Math.floor(reservationSeconds / 60)}:${String(reservationSeconds % 60).padStart(2, '0')} 남음. 예약 시간은 연장되지 않습니다.`
        : `${nicknameReservation.nickname} 예약이 만료되었습니다. 다시 예약할 수 있습니다.`
      : '이메일 인증 후 닉네임을 10분간 예약할 수 있습니다. 예약은 선택사항입니다.';
  const isLoading = isSubmitting || isSendingVerification || isVerifyingCode || isReservingNickname;
  const [verificationMessage, setVerificationMessage] = useState('');
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
  });

  const invalidateNicknameReservationRequest = () => {
    reservationContextVersion.current += 1;
    reservationRequestSequence.current += 1;
    activeReservationRequestId.current = null;
    nicknameReservationPending.current = false;
    setIsReservingNickname(false);
  };

  const clearNicknameReservation = () => {
    invalidateNicknameReservationRequest();
    setNicknameReservation(null);
    setIsReservationUncertain(false);
    setNicknameReservationError('');
  };

  useEffect(() => {
    setIsHydrated(true);
    const fetchEmailDomains = async () => {
      try {
        const domains = await getAllowedEmailDomains();
        setEmailDomains(domains);
      } catch (error) {
        console.error('Failed to fetch email domains:', error);
        // 기본 도메인 목록 설정 또는 에러 처리
        setEmailDomains(['gmail.com', 'naver.com', 'kakao.com']);
      }
    };
    fetchEmailDomains();
  }, []);

  useEffect(() => {
    if (!sentVerification && !emailVerification && !nicknameReservation && (retryAvailableAt === null || retryAvailableAt <= Date.now())) return;
    if (!sentVerification?.expiresAt && (!emailVerification || emailVerification.legacy) && !nicknameReservation && (retryAvailableAt === null || retryAvailableAt <= Date.now())) return;
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      const codeActive = sentVerification?.expiresAt && parseEmailVerificationTime(sentVerification.expiresAt) > currentTime;
      const tokenActive = emailVerification && !emailVerification.legacy && emailVerification.expiresAt > currentTime;
      const reservationActive = nicknameReservation && nicknameReservation.expiresAt > currentTime;
      const cooldownActive = retryAvailableAt !== null && retryAvailableAt > currentTime;
      if (!codeActive && !tokenActive && !reservationActive && !cooldownActive) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [sentVerification, emailVerification, nicknameReservation, retryAvailableAt]);

  useEffect(() => {
    if (emailVerification && emailVerification.expiresAt <= now) {
      clearNicknameReservation();
      setEmailVerification(null);
      setStep(1);
      setMessage('이메일 인증이 만료되었습니다. 다시 인증해주세요.');
    } else if (sentVerification?.expiresAt && parseEmailVerificationTime(sentVerification.expiresAt) <= now) {
      setSentVerification(null);
      setValues(previous => ({ ...previous, verificationCode: '' }));
      setMessage('인증코드가 만료되었습니다. 다시 전송해주세요.');
    }
  }, [now, emailVerification, sentVerification]);

  useEffect(() => {
    const resetAuthFlow = () => {
      emailRequestVersion.current += 1;
      clearNicknameReservation();
      emailRequestPending.current = false;
      signupPending.current = false;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
      setIsSubmitting(false);
      setIsSendingVerification(false);
      setIsVerifyingCode(false);
      setNicknameReservationError('');
      setSentVerification(null);
      setEmailVerification(null);
      setRetryAvailableAt(null);
      setValues(previous => ({ ...previous, verificationCode: '' }));
      setNow(Date.now());
      setStep(1);
      setMessage('');
      setVerificationMessage('');
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetAuthFlow();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    if (pathname === '/signup') return;
    emailRequestVersion.current += 1;
    clearNicknameReservation();
    emailRequestPending.current = false;
    signupPending.current = false;
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    redirectTimer.current = null;
    setSentVerification(null);
    setEmailVerification(null);
    setRetryAvailableAt(null);
    setValues(previous => ({ ...previous, verificationCode: '' }));
    setIsSubmitting(false);
    setIsSendingVerification(false);
    setIsVerifyingCode(false);
    setMessage('');
    setVerificationMessage('');
    setStep(1);
  }, [pathname]);

  useEffect(() => () => {
    emailRequestVersion.current += 1;
    emailRequestPending.current = false;
    signupPending.current = false;
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
  }, []);

  const isDesktop = useMediaQuery({ query: '(min-width: 768px)' });

  const nextStep = () => {
    if (isLoading) return;
    if (!emailVerification || emailVerification.expiresAt <= Date.now()) {
      setMessage('이메일 인증을 완료해주세요.');
      return;
    }
    setMessage('');
    setStep(step + 1);
  };
  const prevStep = () => {
    if (isLoading) return;
    setStep(step - 1);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return '비밀번호는 8자 이상이어야 합니다.';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return '비밀번호는 소문자를 포함해야 합니다.';
    }
    if (!/(?=.*\d)/.test(password)) {
      return '비밀번호는 숫자를 포함해야 합니다.';
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return '비밀번호는 특수문자(@$!%*?&)를 포함해야 합니다.';
    }
    return '';
  }

  const handleChange = (input: string) => (e: { target: { value: string } }) => {
    if (input === 'email' && signupPending.current) return;
    const { value } = e.target;
    if (input === 'nickname' && value !== values.nickname && nicknameReservationPending.current) {
      invalidateNicknameReservationRequest();
      setIsReservationUncertain(true);
      setNicknameReservationError('');
    }
    setMessage('');
    if (input === 'verificationCode') {
      setVerificationMessage('');
    }
    if (input === 'nickname') setNicknameReservationError('');
    setValues(previous => ({ ...previous, [input]: value }));

    if (input === 'email') {
      emailRequestVersion.current += 1;
      clearNicknameReservation();
      emailRequestPending.current = false;
      setEmailVerification(null);
      setSentVerification(null);
      setRetryAvailableAt(null);
      setIsSendingVerification(false);
      setIsVerifyingCode(false);
      setVerificationMessage('');
      setValues(previous => ({ ...previous, verificationCode: '' }));
      if (!validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: '유효한 이메일 형식이 아닙니다.' }));
      } else {
        setErrors(prev => ({ ...prev, email: '' }));
      }
    }

    if (input === 'password') {
      const passwordError = validatePassword(value);
      setErrors(prev => ({ ...prev, password: passwordError }));
      
      // 비밀번호 확인과 일치하는지 체크 (비밀번호 확인이 이미 입력된 경우)
      if (values.passwordConfirm && value !== values.passwordConfirm) {
        setErrors(prev => ({ ...prev, passwordConfirm: '비밀번호가 일치하지 않습니다.' }));
      } else if (values.passwordConfirm && value === values.passwordConfirm) {
        setErrors(prev => ({ ...prev, passwordConfirm: '' }));
      }
    }

    if (input === 'passwordConfirm') {
      if (value !== values.password) {
        setErrors(prev => ({ ...prev, passwordConfirm: '비밀번호가 일치하지 않습니다.' }));
      } else {
        setErrors(prev => ({ ...prev, passwordConfirm: '' }));
      }
    }
  };
  
  const handleAgreeAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setAgreements({
      terms: checked,
      privacy: checked,
    });
  };

  const handleAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setAgreements((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSendVerification = async () => {
    if (!values.email) {
      setMessage('이메일을 입력해주세요.');
      return;
    }
    if (!validateEmail(values.email)) {
      setMessage('유효한 이메일 형식이 아닙니다.');
      return;
    }
    if (emailRequestPending.current || signupPending.current || nicknameReservationPending.current) return;
    const requestVersion = ++emailRequestVersion.current;
    emailRequestPending.current = true;
    setVerificationMessage('');
    setMessage('');
    setIsSendingVerification(true);
    try {
      const response = await sendSignUpVerificationEmail(values.email);
      if (requestVersion !== emailRequestVersion.current) return;
      const expiresAt = response?.expiresAt ? parseEmailVerificationTime(response.expiresAt) : Number.NaN;
      if (!response?.message || (response.expiresAt && (!Number.isFinite(expiresAt) || expiresAt <= Date.now()))) {
        setEmailVerification(null);
        setSentVerification(null);
        setValues(previous => ({ ...previous, verificationCode: '' }));
        setMessage('인증코드 발송 결과를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      setNow(Date.now());
      setSentVerification(response);
      setEmailVerification(null);
      const retryAt = response.resendAvailableAt ? parseEmailVerificationTime(response.resendAvailableAt) : Number.NaN;
      setRetryAvailableAt(Number.isFinite(retryAt) && retryAt > Date.now() ? retryAt : null);
      setValues(previous => ({ ...previous, verificationCode: '' }));
      setMessage(response.message || '인증코드가 발송되었습니다.');
    } catch (error) {
      if (requestVersion === emailRequestVersion.current) {
        const problemCode = getProblemDetail(error)?.code;
        const isRateLimited = problemCode === 'RATE_LIMITED';
        const resendActivationInvalid = getHttpStatus(error) === 400
          && (problemCode === 'VERIFICATION_INVALID' || problemCode === 'CODE_EXPIRED');
        const duplicateEmail = isEmailAlreadyExists(error);
        setRetryAvailableAt(getRetryAfterTime(error, retryAvailableAt));
        if (resendActivationInvalid) {
          setEmailVerification(null);
          setSentVerification(null);
          setValues(previous => ({ ...previous, verificationCode: '' }));
          setMessage('잠시 후 다시 시도해 주세요.');
          window.alert('잠시 후 다시 시도해 주세요.');
        } else {
          if (!isRateLimited && !duplicateEmail && !isInvalidEmail(error) && getHttpStatus(error) !== 400) {
            setEmailVerification(null);
            setSentVerification(null);
            setValues(previous => ({ ...previous, verificationCode: '' }));
          }
          setMessage(duplicateEmail
            ? '이미 가입된 이메일입니다. 로그인 페이지에서 로그인해주세요.'
            : getApiErrorMessage(error, '인증코드 발송 결과를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'));
        }
      }
    } finally {
      if (requestVersion === emailRequestVersion.current) {
        emailRequestPending.current = false;
        setIsSendingVerification(false);
      }
    }
  };

  const handleVerifyCode = async () => {
    if (emailRequestPending.current || signupPending.current || nicknameReservationPending.current) return;
    if (!sentVerification || (sentVerification.expiresAt && parseEmailVerificationTime(sentVerification.expiresAt) <= Date.now())) {
      setMessage('인증코드를 다시 전송해주세요.');
      return;
    }
    if (!values.verificationCode) {
      setVerificationMessage('인증코드를 입력해주세요.');
      return;
    }
    const requestVersion = ++emailRequestVersion.current;
    emailRequestPending.current = true;
    setIsVerifyingCode(true);
    setVerificationMessage('');
    try {
      const response = await verifyCode({ email: values.email, code: values.verificationCode, type: 'SIGN_UP' });
      if (requestVersion !== emailRequestVersion.current) return;
      const tokenFieldAbsent = !Object.prototype.hasOwnProperty.call(response, 'emailVerificationToken');
      const expiryFieldAbsent = !Object.prototype.hasOwnProperty.call(response, 'expiresAt');
      const hasToken = typeof response.emailVerificationToken === 'string' && response.emailVerificationToken.trim().length > 0;
      const hasExpiry = typeof response.expiresAt === 'string' && response.expiresAt.length > 0;
      const legacy = tokenFieldAbsent && expiryFieldAbsent;
      const expiresAt = hasExpiry ? parseEmailVerificationTime(response.expiresAt!) : Number.NaN;
      if (!response?.message || (!legacy && (!hasToken || !hasExpiry || !Number.isFinite(expiresAt) || expiresAt <= Date.now()))) {
        setVerificationMessage('인증 결과를 확인할 수 없습니다. 다시 전송해주세요.');
        return;
      }
      setNow(Date.now());
      setEmailVerification({ token: hasToken ? response.emailVerificationToken : undefined, expiresAt, email: values.email, legacy });
      invalidateNicknameReservationRequest();
      setMessage(response.message || '이메일 인증이 완료되었습니다.');
      setSentVerification(null);
      setValues(previous => ({ ...previous, verificationCode: '' }));
    } catch (error) {
      if (requestVersion === emailRequestVersion.current) {
        const problem = getProblemDetail(error);
        setRetryAvailableAt(getRetryAfterTime(error, retryAvailableAt));
        if (problem?.code === 'ATTEMPTS_EXHAUSTED') {
          setSentVerification(null);
          setEmailVerification(null);
          setValues(previous => ({ ...previous, verificationCode: '' }));
          setMessage(getApiErrorMessage(error, '인증 시도 횟수가 끝났습니다. 다시 인증해주세요.'));
        } else {
          setVerificationMessage(getApiErrorMessage(error, '인증코드가 올바르지 않습니다.'));
        }
      }
    } finally {
      if (requestVersion === emailRequestVersion.current) {
        emailRequestPending.current = false;
        setIsVerifyingCode(false);
      }
    }
  };

  const handleReserveNickname = async () => {
    if (nicknameReservationPending.current || emailRequestPending.current || signupPending.current) return;
    if (!emailVerification || !emailVerification.token || emailVerification.email !== values.email || emailVerification.expiresAt <= Date.now()) {
      setNicknameReservationError('이메일 인증을 먼저 완료해주세요.');
      return;
    }
    const nickname = values.nickname.trim();
    if (!nickname) {
      setNicknameReservationError('닉네임을 입력해주세요.');
      return;
    }

    const requestId = ++reservationRequestSequence.current;
    const requestContextVersion = reservationContextVersion.current;
    const requestEmail = emailVerification.email;
    const requestToken = emailVerification.token;
    activeReservationRequestId.current = requestId;
    nicknameReservationPending.current = true;
    setIsReservingNickname(true);
    setNicknameReservationError('');

    const isCurrentRequest = () =>
      activeReservationRequestId.current === requestId
      && reservationContextVersion.current === requestContextVersion;

    try {
      const reservation: SignupNicknameReservation = await reserveSignupNickname(
        requestEmail,
        requestToken,
        nickname,
      );
      if (!isCurrentRequest()) return;
      const expiresAt = parseEmailVerificationTime(reservation.expiresAt);
      if (!reservation.nickname || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        setIsReservationUncertain(true);
        setNicknameReservationError('예약 상태를 확인하지 못했습니다. 다시 확인해 주세요.');
        return;
      }
      setNicknameReservation({ nickname: reservation.nickname, expiresAt });
      setIsReservationUncertain(false);
      setNicknameReservationError('');
      setValues(previous => ({ ...previous, nickname: reservation.nickname }));
      setNow(Date.now());
    } catch (error) {
      if (!isCurrentRequest()) return;
      const problem = getProblemDetail(error);
      const code = problem?.code;
      const status = getHttpStatus(error);
      if (code && ['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_ALREADY_USED'].includes(code)) {
        clearNicknameReservation();
        setEmailVerification(null);
        setStep(1);
        setMessage(getApiErrorMessage(error, '이메일 인증을 다시 완료해주세요.'));
      } else if (code === 'VERIFICATION_UNAVAILABLE') {
        setNicknameReservationError(getApiErrorMessage(error, '인증 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'));
      } else if (status === 409 || code === 'NICKNAME_CONFLICT') {
        setNicknameReservationError(getApiErrorMessage(error, '이미 사용 중인 닉네임입니다.'));
      } else if (status === 503 || status === undefined || (status !== undefined && status >= 500)) {
        setIsReservationUncertain(true);
        setNicknameReservationError('');
      } else {
        setNicknameReservationError(getApiErrorMessage(error, '닉네임 예약에 실패했습니다.'));
      }
    } finally {
      if (activeReservationRequestId.current === requestId) {
        activeReservationRequestId.current = null;
        nicknameReservationPending.current = false;
        setIsReservingNickname(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (signupPending.current || emailRequestPending.current || nicknameReservationPending.current) return;
    if (isReservationUncertain) {
      setMessage('예약 상태를 확인하지 못했습니다. 닉네임 예약을 다시 확인해주세요.');
      return;
    }
    if (!emailVerification || emailVerification.email !== values.email || (!emailVerification.legacy && emailVerification.expiresAt <= Date.now())) {
      setMessage('이메일 인증을 완료해주세요.');
      return;
    }
    if (!values.character) {
      setMessage('캐릭터를 선택해주세요.');
      return;
    }
    const passwordError = validatePassword(values.password);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }
    if (values.password !== values.passwordConfirm) {
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreements.terms || !agreements.privacy) {
      setMessage('이용약관에 동의해주세요.');
      return;
    }
    setMessage('');
    const requestVersion = ++emailRequestVersion.current;
    signupPending.current = true;
    emailRequestPending.current = true;
    setIsSubmitting(true);
    let redirecting = false;
    try {
      const { verificationCode, passwordConfirm, ...signupData } = values;
      const response = await signup({ ...signupData, ...(emailVerification.token ? { emailVerificationToken: emailVerification.token } : {}) });
      if (requestVersion !== emailRequestVersion.current) return;
      clearNicknameReservation();
      setEmailVerification(null);
      setMessage(
        response.message || '회원가입이 완료되었습니다! 잠시 후 로그인 페이지로 이동합니다.',
      );
      redirectTimer.current = setTimeout(() => {
        if (requestVersion !== emailRequestVersion.current) return;
        router.push('/login');
      }, 2000);
      redirecting = true;
    } catch (error) {
      if (requestVersion !== emailRequestVersion.current) return;
      const errorMessage = getApiErrorMessage(error, '회원가입에 실패했습니다.');
      const code = getProblemDetail(error)?.code;
      if (code && ['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_ALREADY_USED', 'VERIFICATION_INVALID'].includes(code)) {
        clearNicknameReservation();
        setEmailVerification(null);
        setSentVerification(null);
        setValues(previous => ({ ...previous, verificationCode: '' }));
        setStep(1);
        setMessage(errorMessage);
      } else if (getHttpStatus(error) === 400 && getProblemDetail(error)?.fieldErrors?.emailVerificationToken) {
        setEmailVerification(null);
        setSentVerification(null);
        setValues(previous => ({ ...previous, verificationCode: '' }));
        setStep(1);
        setMessage(getApiErrorMessage(error, '이메일 인증이 필요합니다. 다시 인증해주세요.'));
      } else if (isEmailAlreadyExists(error)) {
        setMessage('이미 가입된 이메일입니다. 로그인 페이지에서 로그인해주세요.');
      } else if (getHttpStatus(error) === undefined) {
        setMessage('가입 결과를 확인하지 못했습니다. 자동으로 다시 제출하지 않았습니다. 로그인 화면에서 가입 여부를 확인해주세요.');
      } else {
        setMessage(errorMessage);
      }
      signupPending.current = false;
      emailRequestPending.current = false;
    } finally {
      if (requestVersion === emailRequestVersion.current && !redirecting) {
        setIsSubmitting(false);
        if (!signupPending.current) emailRequestPending.current = false;
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-black">
      <div className="w-full max-w-md md:max-w-4xl px-8 flex flex-col justify-center" style={{ minHeight: '80vh' }}>
        <div className="w-full mb-10">
          <div className="relative text-center">
            <Link href={isDesktop && isHydrated ? '/' : '#'} passHref>
              <button onClick={!isDesktop && step === 2 ? prevStep : undefined} className="text-2xl font-bold absolute left-0 dark:text-white cursor-pointer">
                &lt;
              </button>
            </Link>
            <h2 className="text-2xl font-bold inline-block dark:text-white">가입하기</h2>
          </div>
        </div>

        <div className={`w-full ${isDesktop && isHydrated ? 'flex items-center' : 'flex'}`}>
          {isDesktop && isHydrated ? (
            <DesktopView 
              handleChange={handleChange} 
              values={values} 
              handleSubmit={handleSubmit} 
              isLoading={isLoading} 
              isEmailVerified={isEmailVerified}
              isVerificationSent={isVerificationSent}
              handleSendVerification={handleSendVerification}
              handleVerifyCode={handleVerifyCode}
              verificationMessage={verificationMessage}
              agreements={agreements}
              handleAgreementChange={handleAgreementChange}
              handleAgreeAllChange={handleAgreeAllChange}
              errors={errors}
              emailDomains={emailDomains}
              isSendingVerification={isSendingVerification}
              isVerifyingCode={isVerifyingCode}
              resendSeconds={resendSeconds}
              codeSeconds={codeSeconds}
              canReserveNickname={canReserveNickname}
              handleReserveNickname={handleReserveNickname}
              isReservingNickname={isReservingNickname}
              isNicknameReserved={isNicknameReserved}
              nicknameReservationMessage={nicknameReservationMessage}
              nicknameReservationError={nicknameReservationError}
              isReservationUncertain={isReservationUncertain}
            />
          ) : (
            <MobileView
              step={step}
              nextStep={nextStep}
              handleChange={handleChange}
              values={values}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              isEmailVerified={isEmailVerified}
              isVerificationSent={isVerificationSent}
              handleSendVerification={handleSendVerification}
              handleVerifyCode={handleVerifyCode}
              verificationMessage={verificationMessage}
              agreements={agreements}
              handleAgreementChange={handleAgreementChange}
              handleAgreeAllChange={handleAgreeAllChange}
              errors={errors}
              emailDomains={emailDomains}
              isSendingVerification={isSendingVerification}
              isVerifyingCode={isVerifyingCode}
              resendSeconds={resendSeconds}
              codeSeconds={codeSeconds}
              canReserveNickname={canReserveNickname}
              handleReserveNickname={handleReserveNickname}
              isReservingNickname={isReservingNickname}
              isNicknameReserved={isNicknameReserved}
              nicknameReservationMessage={nicknameReservationMessage}
              nicknameReservationError={nicknameReservationError}
              isReservationUncertain={isReservationUncertain}
            />
          )}
        </div>
        {message && (
          <p
            className={`mt-4 whitespace-pre-line text-center ${
              message.includes('완료') || message.includes('발송') ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default SignupClient; 
