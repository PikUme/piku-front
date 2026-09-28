'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useMediaQuery } from 'react-responsive';
import {
  signup,
  sendSignUpVerificationEmail,
  verifyCode,
  getAllowedEmailDomains,
  reserveSignupNickname,
} from '@/lib/api/auth';
import { getApiErrorMessage, getProblemDetail } from '@/lib/utils/apiError';
import { useRouter } from 'next/navigation';
import MobileView from './signup/MobileView';
import DesktopView from './signup/DesktopView';
import { AuthValues, SignupVerificationSentResponse, SignupNicknameReservation } from '@/types/auth';

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
  const [message, setMessage] = useState('');
  const router = useRouter();
  const [sentVerification, setSentVerification] = useState<SignupVerificationSentResponse | null>(null);
  const [emailVerification, setEmailVerification] = useState<{ token: string; expiresAt: number } | null>(null);
  const [nicknameReservation, setNicknameReservation] = useState<SignupNicknameReservation | null>(null);
  const [isReservingNickname, setIsReservingNickname] = useState(false);
  const [nicknameReservationError, setNicknameReservationError] = useState('');
  const nicknameRequestPending = useRef(false);
  const [now, setNow] = useState(Date.now);
  const emailRequestVersion = useRef(0);
  const emailRequestPending = useRef(false);
  const signupPending = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEmailVerified = emailVerification !== null && emailVerification.expiresAt > now;
  const isVerificationSent = sentVerification !== null && Date.parse(sentVerification.expiresAt) > now;
  const resendSeconds = sentVerification ? Math.max(0, Math.ceil((Date.parse(sentVerification.resendAvailableAt) - now) / 1000)) : 0;
  const codeSeconds = sentVerification ? Math.max(0, Math.ceil((Date.parse(sentVerification.expiresAt) - now) / 1000)) : 0;
  const isLoading = isSubmitting || isSendingVerification || isVerifyingCode || isReservingNickname;
  const reservationSeconds = nicknameReservation ? Math.max(0, Math.ceil((Date.parse(nicknameReservation.expiresAt) - now) / 1000)) : 0;
  const isNicknameReserved = nicknameReservation?.nickname === values.nickname && reservationSeconds > 0;
  const nicknameReservationMessage = nicknameReservation
    ? reservationSeconds > 0
      ? `${nicknameReservation.nickname} 예약 중 · ${Math.floor(reservationSeconds / 60)}:${String(reservationSeconds % 60).padStart(2, '0')} 남음. 예약 시간은 연장되지 않습니다.`
      : '닉네임 예약이 만료되었습니다. 다시 예약할 수 있습니다.'
    : '이메일 인증 후 닉네임을 3분간 예약할 수 있습니다. 예약은 선택사항입니다.';

  const clearEmailVerification = () => {
    emailRequestVersion.current += 1;
    setEmailVerification(null);
    setNicknameReservation(null);
    setNicknameReservationError('');
    nicknameRequestPending.current = false;
    setIsReservingNickname(false);
  };
  const [verificationMessage, setVerificationMessage] = useState('');
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
  });

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
    if (!sentVerification && !emailVerification) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentVerification, emailVerification]);

  useEffect(() => {
    if (emailVerification && emailVerification.expiresAt <= now) {
      clearEmailVerification();
      setStep(1);
      setMessage('이메일 인증이 만료되었습니다. 다시 인증해주세요.');
    } else if (sentVerification && Date.parse(sentVerification.expiresAt) <= now) {
      setSentVerification(null);
      setValues(previous => ({ ...previous, verificationCode: '' }));
      setMessage('인증코드가 만료되었습니다. 다시 전송해주세요.');
    }
  }, [now, emailVerification, sentVerification]);

  useEffect(() => () => {
    emailRequestVersion.current += 1;
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
  }, []);

  const isDesktop = useMediaQuery({ query: '(min-width: 768px)' });

  const nextStep = () => {
    if (!emailVerification || emailVerification.expiresAt <= Date.now()) {
      setMessage('이메일 인증을 완료해주세요.');
      return;
    }
    setMessage('');
    setStep(step + 1);
  };
  const prevStep = () => setStep(step - 1);

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
    const { value } = e.target;
    setMessage('');
    if (input === 'verificationCode') {
      setVerificationMessage('');
    }
    setValues(previous => ({ ...previous, [input]: value }));

    if (input === 'nickname') setNicknameReservationError('');
    if (input === 'email') {
      clearEmailVerification();
      emailRequestPending.current = false;
      setSentVerification(null);
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
    if (emailRequestPending.current || signupPending.current || resendSeconds > 0) return;
    clearEmailVerification();
    const requestVersion = ++emailRequestVersion.current;
    emailRequestPending.current = true;
    setSentVerification(null);
    setValues(previous => ({ ...previous, verificationCode: '' }));
    setVerificationMessage('');
    setMessage('');
    setIsSendingVerification(true);
    try {
      const response = await sendSignUpVerificationEmail(values.email);
      if (requestVersion !== emailRequestVersion.current) return;
      setNow(Date.now());
      setSentVerification(response);
      setMessage(response.message || '인증코드가 발송되었습니다.');
    } catch (error) {
      if (requestVersion === emailRequestVersion.current) {
        setMessage(getApiErrorMessage(error, '인증코드 발송에 실패했습니다.'));
      }
    } finally {
      if (requestVersion === emailRequestVersion.current) {
        emailRequestPending.current = false;
        setIsSendingVerification(false);
      }
    }
  };

  const handleVerifyCode = async () => {
    if (emailRequestPending.current || signupPending.current) return;
    if (!sentVerification || Date.parse(sentVerification.expiresAt) <= Date.now()) {
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
      const expiresAt = Date.parse(response.expiresAt);
      if (!response.emailVerificationToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        setVerificationMessage('인증 결과를 확인할 수 없습니다. 다시 전송해주세요.');
        return;
      }
      setNow(Date.now());
      setEmailVerification({ token: response.emailVerificationToken, expiresAt });
      setMessage(response.message || '이메일 인증이 완료되었습니다.');
      setSentVerification(null);
    } catch (error) {
      if (requestVersion === emailRequestVersion.current) {
        setVerificationMessage(getApiErrorMessage(error, '인증코드가 올바르지 않습니다.'));
      }
    } finally {
      if (requestVersion === emailRequestVersion.current) {
        emailRequestPending.current = false;
        setIsVerifyingCode(false);
      }
    }
  };

  const handleReserveNickname = async () => {
    if (nicknameRequestPending.current || emailRequestPending.current || signupPending.current) return;
    if (!emailVerification || emailVerification.expiresAt <= Date.now()) {
      setNicknameReservationError('이메일 인증을 먼저 완료해주세요.');
      return;
    }
    if (!values.nickname.trim()) {
      setNicknameReservationError('닉네임을 입력해주세요.');
      return;
    }
    const requestVersion = emailRequestVersion.current;
    nicknameRequestPending.current = true;
    setIsReservingNickname(true);
    setNicknameReservationError('');
    try {
      const reservation = await reserveSignupNickname(emailVerification.token, values.nickname);
      if (requestVersion !== emailRequestVersion.current) return;
      setNicknameReservation(reservation);
      setNow(Date.now());
    } catch (error) {
      if (requestVersion !== emailRequestVersion.current) return;
      const errorMessage = getApiErrorMessage(error, '닉네임 예약에 실패했습니다.');
      const code = getProblemDetail(error)?.code;
      if (code && ['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_ALREADY_USED'].includes(code)) {
        clearEmailVerification();
        setStep(1);
        setMessage(errorMessage);
      } else {
        setNicknameReservationError(errorMessage);
      }
    } finally {
      if (requestVersion === emailRequestVersion.current) {
        nicknameRequestPending.current = false;
        setIsReservingNickname(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (signupPending.current || emailRequestPending.current || nicknameRequestPending.current) return;
    if (!emailVerification || emailVerification.expiresAt <= Date.now()) {
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
    signupPending.current = true;
    setIsSubmitting(true);
    try {
      const { verificationCode, passwordConfirm, ...signupData } = values;
      const response = await signup({ ...signupData, emailVerificationToken: emailVerification.token });
      setMessage(
        response.message || '회원가입이 완료되었습니다! 잠시 후 로그인 페이지로 이동합니다.',
      );
      redirectTimer.current = setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, '회원가입에 실패했습니다.');
      setMessage(errorMessage);
      const code = getProblemDetail(error)?.code;
      if (code && ['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_ALREADY_USED'].includes(code)) {
        clearEmailVerification();
        setStep(1);
      }
      signupPending.current = false;
    } finally {
      setIsSubmitting(false);
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
              handleReserveNickname={handleReserveNickname}
              isReservingNickname={isReservingNickname}
              isNicknameReserved={isNicknameReserved}
              nicknameReservationMessage={nicknameReservationMessage}
              nicknameReservationError={nicknameReservationError}
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
              handleReserveNickname={handleReserveNickname}
              isReservingNickname={isReservingNickname}
              isNicknameReserved={isNicknameReserved}
              nicknameReservationMessage={nicknameReservationMessage}
              nicknameReservationError={nicknameReservationError}
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
