'use client';

import { useEffect, useRef } from 'react';
import useAuthStore from '../store/authStore';
import { getServerURL } from '@/lib/utils/url';
import { EventSourcePolyfill } from 'event-source-polyfill';
import useNotificationStore from '../store/notificationStore';
import {
  getAccessToken,
  refreshAccessToken,
  handleAuthFailure,
} from '@/lib/auth/tokenManager';

const RECONNECT_DELAY = 3000; // 3초 후 재연결

const SSEInitializer = () => {
  const { isLoggedIn } = useAuthStore();
  const { setUnreadCount, incrementUnreadCount } = useNotificationStore();
  const eventSourceRef = useRef<EventSourcePolyfill | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let isMounted = true;
    let isFirstMessage = true;

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = (token: string) => {
      // 언마운트 체크
      if (!isMounted) return;

      // 중복 연결 방지
      if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
        return;
      }

      const sseUrl = `${getServerURL()}/sse/subscribe`;
      eventSourceRef.current = new EventSourcePolyfill(sseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        heartbeatTimeout: 86400000, // 24시간
      });

      isFirstMessage = true; // 재연결 시 초기 메세지 처리

      eventSourceRef.current.onopen = () => {};

      eventSourceRef.current.onmessage = (event: any) => {
        if (isFirstMessage) {
          const count = parseInt(event.data, 10);
          if (!isNaN(count)) {
            setUnreadCount(count);
          }
          isFirstMessage = false;
        } else {
          incrementUnreadCount();
        }
      };

      eventSourceRef.current.onerror = () => {
        // 기존 연결 정리
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        if (!isMounted) return;

        // 토큰 리프레시 시도 후 재연결
        clearReconnectTimeout();
        refreshAccessToken()
          .then((newToken) => {
            // 리프레시 성공 → 새 토큰으로 즉시 재연결
            if (isMounted) {
              connect(newToken);
            }
          })
          .catch(() => {
            // 리프레시 토큰도 만료 → handleAuthFailure()가 이미 호출됨
            // (tokenManager 내부에서 로그아웃 + 리다이렉트 처리 완료)
          });
      };
    };

    // 초기 연결
    const token = getAccessToken();
    if (!token) return;
    connect(token);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentToken = getAccessToken();
        if (currentToken) {
          connect(currentToken);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearReconnectTimeout();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn]);

  return null;
};

export default SSEInitializer;
