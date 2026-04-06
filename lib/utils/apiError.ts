import type { ProblemDetail } from '@/types/api';

interface ErrorWithResponse {
  message?: string;
  response?: {
    data?: unknown;
  };
}

const isProblemDetail = (value: unknown): value is ProblemDetail => {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ProblemDetail).type === 'string' &&
    typeof (value as ProblemDetail).title === 'string' &&
    typeof (value as ProblemDetail).status === 'number' &&
    typeof (value as ProblemDetail).detail === 'string' &&
    typeof (value as ProblemDetail).instance === 'string'
  );
};

export const getProblemDetail = (error: unknown): ProblemDetail | null => {
  const data = (error as ErrorWithResponse | undefined)?.response?.data;
  return isProblemDetail(data) ? data : null;
};

export const hasProblemType = (error: unknown, type: string): boolean => {
  return getProblemDetail(error)?.type === type;
};

export const getFieldError = (
  error: unknown,
  field: string,
): string | null => {
  return getProblemDetail(error)?.fieldErrors?.[field] ?? null;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const problem = getProblemDetail(error);
  if (problem?.detail.trim()) {
    return problem.detail;
  }

  const candidate = error as ErrorWithResponse | undefined;
  const data = candidate?.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (typeof candidate?.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  return fallback;
};
