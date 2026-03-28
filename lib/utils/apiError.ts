interface ApiErrorPayload {
  status?: number | string;
  message?: string;
}

interface ErrorWithResponse {
  message?: string;
  response?: {
    data?: unknown;
  };
}

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const candidate = error as ErrorWithResponse | undefined;
  const data = candidate?.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    const payload = data as ApiErrorPayload;
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  }

  if (typeof candidate?.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  return fallback;
};
