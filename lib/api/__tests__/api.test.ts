import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TOKEN_KEY } from '@/lib/constants';
import api from '../api';

describe('공통 API 요청 헤더', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const captureRequest = async (config: AxiosRequestConfig) => {
    let capturedConfig: AxiosRequestConfig | undefined;
    api.defaults.adapter = async requestConfig => {
      capturedConfig = requestConfig;
      return {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: requestConfig,
      };
    };

    await api.request(config);
    return capturedConfig;
  };

  it('로그인 요청에도 localStorage의 vid를 헤더로 보낸다', async () => {
    localStorage.setItem('vid', 'stored-vid');

    const config = await captureRequest({
      method: 'post',
      url: '/auth/login',
    });

    expect(config?.headers?.vid).toBe('stored-vid');
    expect(config?.headers?.Authorization).toBeUndefined();
  });

  it('일반 요청에는 vid와 access token을 함께 보낸다', async () => {
    localStorage.setItem('vid', 'stored-vid');
    localStorage.setItem(AUTH_TOKEN_KEY, 'access-token');

    const config = await captureRequest({
      method: 'get',
      url: '/diary',
    });

    expect(config?.headers?.vid).toBe('stored-vid');
    expect(config?.headers?.Authorization).toBe('Bearer access-token');
  });
});
