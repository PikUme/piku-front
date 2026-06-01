'use client';

import { useEffect, useRef } from 'react';
import useAuthStore from '../store/authStore';
import { getServerURL } from '@/lib/utils/url';
import { EventSourcePolyfill } from 'event-source-polyfill';
import useNotificationStore from '../store/notificationStore';
import {
  getAccessToken,
  refreshAccessToken,
} from '@/lib/auth/tokenManager';

const INITIAL_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_TRANSPORT_ERROR_AUTO_RECONNECTS = 3;

const getSseErrorStatus = (event: unknown): number | undefined => {
  if (typeof event !== 'object' || event === null || !('status' in event)) {
    return undefined;
  }

  return (event as { status?: number }).status;
};

const isAuthErrorStatus = (status: number | undefined): boolean =>
  status === 401 || status === 403;

const SSEInitializer = () => {
  if (process.env.NEXT_PUBLIC_E2E_TEST === '1') {
    return null;
  }

  const { isLoggedIn } = useAuthStore();
  const { setUnreadCount, incrementUnreadCount } = useNotificationStore();
  const eventSourceRef = useRef<EventSourcePolyfill | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const transportErrorCountRef = useRef(0);

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

    const scheduleReconnect = () => {
      clearReconnectTimeout();
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * 2,
        MAX_RECONNECT_DELAY,
      );
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        const currentToken = getAccessToken();
        if (isMounted && currentToken) {
          connect(currentToken);
        }
      }, delay);
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

      eventSourceRef.current.onopen = () => {
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        transportErrorCountRef.current = 0;
      };

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

      eventSourceRef.current.onerror = (event: unknown) => {
        // 기존 연결 정리
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        if (!isMounted) return;

        const status = getSseErrorStatus(event);
        if (status === undefined) {
          transportErrorCountRef.current += 1;
          if (
            transportErrorCountRef.current >=
            MAX_TRANSPORT_ERROR_AUTO_RECONNECTS
          ) {
            return;
          }
        } else {
          transportErrorCountRef.current = 0;
        }

        if (!isAuthErrorStatus(status)) {
          scheduleReconnect();
          return;
        }

        // 인증 실패가 명확한 경우에만 토큰 리프레시 시도 후 재연결
        refreshAccessToken()
          .then((newToken) => {
            // 리프레시 성공 → 새 토큰으로 즉시 재연결
            if (isMounted) {
              connect(newToken);
            }
          })
          .catch(() => {
            if (isMounted && getAccessToken()) {
              scheduleReconnect();
            }
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
