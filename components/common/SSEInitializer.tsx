'use client';

import { useEffect, useRef } from 'react';
import useAuthStore from '../store/authStore';
import { getServerURL } from '@/lib/utils/url';
import { AUTH_TOKEN_KEY } from '@/lib/constants';
import { EventSourcePolyfill } from 'event-source-polyfill';
import useNotificationStore from '../store/notificationStore';

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

    const connect = () => {
      // 언마운트 체크
      if (!isMounted) return;

      // 중복 연결 방지
      if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
        return;
      }

      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

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
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // 언마운트되지 않았으면 재연결 시도
        if (isMounted) {
          clearReconnectTimeout();
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        }
      };
    };

    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connect();
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
