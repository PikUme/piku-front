// api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getServerURL } from '@/lib/utils/url';
import {
  getAccessToken,
  refreshAccessToken,
  handleAuthFailure,
} from '@/lib/auth/tokenManager';

/**
 * 프로젝트 전역으로 사용될 Axios 인스턴스.
 * baseURL, withCredentials 등 공통 설정을 포함합니다.
 */
const api = axios.create({
  baseURL: getServerURL(),
  withCredentials: true,
});

/**
 * 요청 인터셉터 (Request Interceptor)
 * - 모든 API 요청이 보내지기 전에 실행됩니다.
 * - 로컬 스토리지에서 accessToken을 가져와 요청 헤더에 'Authorization'으로 추가합니다.
 * - 서버 사이드 렌더링(SSR) 환경에서는 로컬 스토리지가 없으므로, 클라이언트 사이드에서만 동작합니다.
 */
api.interceptors.request.use(config => {
  if (typeof window === 'undefined') {
    return config;
  }

  // 로그인, 회원가입 요청의 경우 토큰을 헤더에 추가하지 않음
  if (config.url === '/auth/login' || config.url === '/auth/signup') {
    return config;
  }

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 응답 인터셉터 (Response Interceptor)
 * - API 응답을 받은 후 실행됩니다.
 * - 401 Unauthorized 에러 발생 시, tokenManager를 통해 토큰 재발급을 수행합니다.
 * - 리프레시 토큰까지 만료된 경우, handleAuthFailure()로 로그아웃 처리합니다.
 */
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 403 에러인 경우 인증 실패 처리
    if (error.response?.status === 403) {
      await handleAuthFailure();
      return Promise.reject(error);
    }

    // 401 에러이고, 재시도한 요청이 아닐 경우
    if (error.response?.status === 401 && !originalRequest._retry &&
      originalRequest.url !== '/auth/login' &&
      originalRequest.url !== '/auth/reissue') {

      originalRequest._retry = true;

      try {
        // tokenManager가 중복 요청 방지 및 토큰 갱신을 처리
        const newAccessToken = await refreshAccessToken();

        // 새로 발급받은 토큰으로 원래 요청의 헤더를 수정
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // 원래 요청을 다시 시도
        return api(originalRequest);
      } catch (refreshError) {
        // 401/403 재발급 실패는 refreshAccessToken 내부에서 인증 정리됨.
        // 네트워크 오류나 5xx는 기존 토큰을 보존한 채 호출자에게 전파됨.
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
