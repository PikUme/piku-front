import axios from 'axios';
import { getServerURL } from '@/lib/utils/url';
import { AUTH_TOKEN_KEY } from '@/lib/constants';

/**
 * 공통 토큰 관리 모듈
 *
 * Axios 인터셉터, SSE, fetch 등 어디서든 사용할 수 있는
 * 토큰 리프레시 및 인증 실패 처리 유틸리티입니다.
 *
 * - refreshAccessToken(): 중복 호출 방지 (싱글턴 Promise 패턴)
 * - handleAuthFailure(): authStore 정리 + 서버 로그아웃 + 리다이렉트
 */

// 현재 진행 중인 리프레시 Promise (싱글턴 패턴)
let refreshPromise: Promise<string> | null = null;

/**
 * localStorage에서 현재 accessToken을 반환합니다.
 */
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * 리프레시 토큰(HttpOnly 쿠키)으로 새 accessToken을 발급받습니다.
 *
 * 이미 리프레시가 진행 중이면 기존 Promise를 반환하여 중복 요청을 방지합니다.
 * 성공 시 localStorage에 새 토큰을 저장하고 반환합니다.
 * 실패 시 handleAuthFailure()를 호출하고 에러를 throw합니다.
 */
export const refreshAccessToken = (): Promise<string> => {
  // 이미 리프레시 진행 중이면 같은 Promise 반환
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await axios.post(
        `${getServerURL()}/auth/reissue`,
        {},
        { withCredentials: true },
      );

      const authHeader = response.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('New access token not found in response header.');
      }

      const newAccessToken = authHeader.slice(7);
      localStorage.setItem(AUTH_TOKEN_KEY, newAccessToken);

      return newAccessToken;
    } catch (error) {
      // 리프레시 토큰 만료 등 인증 완전 실패
      await handleAuthFailure();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * 인증 완전 실패 시 정리 절차를 수행합니다.
 *
 * 1. localStorage에서 accessToken 삭제
 * 2. authStore 상태 초기화 (isLoggedIn=false, user=null)
 * 3. 서버 로그아웃 API 호출 (실패해도 무시)
 * 4. 로그인 페이지로 리다이렉트
 */
export const handleAuthFailure = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  // 1. 토큰 삭제
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem('deviceId');

  // 2. authStore 상태 초기화 (동적 import로 순환참조 방지)
  const { default: useAuthStore } = await import(
    '@/components/store/authStore'
  );
  const { logout } = useAuthStore.getState();
  logout();

  // 3. 서버 로그아웃 (실패해도 무시)
  try {
    await axios.post(`${getServerURL()}/auth/logout`, {}, { withCredentials: true });
  } catch {
    // 서버 로그아웃 실패는 무시
  }

  // 4. 로그인 페이지로 리다이렉트
  window.location.href = '/login';
};
