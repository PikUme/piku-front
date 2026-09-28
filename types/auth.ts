import type { MessageResponse } from '@/types/api';

export interface Agreements {
  terms: boolean;
  privacy: boolean;
}

export interface AuthValues {
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
  character: string;
  verificationCode?: string;
}

export interface AuthFormProps {
  step?: number;
  nextStep?: () => void;
  prevStep?: () => void;
  handleChange: (input: string) => (e: { target: { value: string } }) => void;
  values: AuthValues;
  handleSubmit?: () => void;
  isLoading?: boolean;
  isEmailVerified: boolean;
  isVerificationSent: boolean;
  handleSendVerification: () => void;
  handleVerifyCode: () => void;
  verificationMessage: string;
  agreements: Agreements;
  handleAgreeAllChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAgreementChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: { email?: string; password?: string; passwordConfirm?: string };
  emailDomains?: string[];
  isSendingVerification?: boolean;
  isVerifyingCode?: boolean;
  resendSeconds?: number;
  codeSeconds?: number;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  avatarUrl?: string | null;
}

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface PwdResetRequest {
  email: string;
  password: string;
}

export interface EmailVerificationRequest {
  email: string;
  code: string;
  type: 'SIGN_UP' | 'PASSWORD_RESET';
}

export interface SignupVerificationSentResponse extends MessageResponse {
  expiresAt: string;
  resendAvailableAt: string;
}

export interface SignupEmailVerifiedResponse extends MessageResponse {
  emailVerificationToken: string;
  expiresAt: string;
}
