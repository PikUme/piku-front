import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAuthStore from '@/components/store/authStore';
import useNotificationStore from '@/components/store/notificationStore';
import SSEInitializer from '../SSEInitializer';
import type { SseWorkerToTabMessage } from '@/lib/sse/sharedWorkerProtocol';

const { eventSources, getAccessTokenMock, refreshAccessTokenMock } = vi.hoisted(() => ({
  eventSources: [] as Array<{
    onopen?: () => void;
    onerror?: (event?: unknown) => void;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
  }>,
  getAccessTokenMock: vi.fn(),
  refreshAccessTokenMock: vi.fn(),
}));

vi.mock('@/lib/auth/tokenManager', () => ({
  getAccessToken: getAccessTokenMock,
  refreshAccessToken: refreshAccessTokenMock,
}));

vi.mock('event-source-polyfill', () => {
  class MockEventSourcePolyfill {
    onopen?: () => void;
    onerror?: (event?: unknown) => void;
    readyState = 1;
    close = vi.fn(() => {
      this.readyState = 2;
    });

    constructor() {
      eventSources.push(this);
    }
  }

  return { EventSourcePolyfill: MockEventSourcePolyfill };
});

const user = {
  id: 'u1',
  email: 'test@test.com',
  nickname: 'test',
  avatar: 'http://example.com/avatar.png',
};

class MockMessagePort {
  onmessage: ((event: { data: SseWorkerToTabMessage }) => void) | null = null;
  postMessage = vi.fn();
  start = vi.fn();
  close = vi.fn();

  receive(message: SseWorkerToTabMessage) {
    this.onmessage?.({ data: message });
  }
}

const sharedWorkerPorts: MockMessagePort[] = [];

class MockSharedWorker {
  port = new MockMessagePort();

  constructor() {
    sharedWorkerPorts.push(this.port);
  }
}

const setUserAgent = (userAgent: string) => {
  vi.stubGlobal('navigator', {
    ...window.navigator,
    userAgent,
  });
};

describe('SSEInitializer', () => {
  beforeEach(() => {
    eventSources.length = 0;
    sharedWorkerPorts.length = 0;
    vi.clearAllMocks();
    getAccessTokenMock.mockReturnValue('access-token');
    refreshAccessTokenMock.mockResolvedValue('new-access-token');
    useAuthStore.setState({
      authStatus: 'authenticated',
      isLoggedIn: true,
      user,
    });
    useNotificationStore.setState({ unreadCount: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_E2E_TEST;
  });

  it('SharedWorker 지원 환경에서는 직접 SSE 대신 worker port에 연결 정보를 보낸다', () => {
    vi.stubGlobal('SharedWorker', MockSharedWorker);

    render(<SSEInitializer />);

    expect(sharedWorkerPorts).toHaveLength(1);
    expect(eventSources).toHaveLength(0);
    expect(sharedWorkerPorts[0].start).toHaveBeenCalled();
    expect(sharedWorkerPorts[0].postMessage).toHaveBeenCalledWith({
      type: 'CONNECT',
      clientId: expect.any(String),
      token: 'access-token',
      serverUrl: 'http://localhost:8080/api',
    });
  });

  it('SharedWorker가 전달한 unread count 메시지를 notificationStore에 반영한다', () => {
    vi.stubGlobal('SharedWorker', MockSharedWorker);

    render(<SSEInitializer />);

    act(() => {
      sharedWorkerPorts[0].receive({ type: 'SET_UNREAD_COUNT', count: 4 });
    });

    expect(useNotificationStore.getState().unreadCount).toBe(4);

    act(() => {
      sharedWorkerPorts[0].receive({ type: 'INCREMENT_UNREAD_COUNT' });
    });

    expect(useNotificationStore.getState().unreadCount).toBe(5);
  });

  it('SharedWorker의 token refresh 요청을 기존 tokenManager로 위임하고 결과를 worker에 돌려준다', async () => {
    vi.stubGlobal('SharedWorker', MockSharedWorker);

    render(<SSEInitializer />);

    await act(async () => {
      sharedWorkerPorts[0].receive({ type: 'REQUEST_TOKEN_REFRESH' });
      await Promise.resolve();
    });

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(sharedWorkerPorts[0].postMessage).toHaveBeenCalledWith({
      type: 'TOKEN_REFRESHED',
      clientId: expect.any(String),
      token: 'new-access-token',
    });
  });

  it.each([
    [
      'iOS Safari',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    ],
    [
      'Android Chrome',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    ],
    [
      'iOS Google app',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/322.0.0.34 Mobile/15E148 Safari/604.1',
    ],
    [
      'Android Google app',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.110 Mobile Safari/537.36 GSA/15.24.38.28.arm64',
    ],
  ])(
    '%s에서는 SharedWorker가 있어도 직접 SSE fallback을 사용한다',
    (_browserName, userAgent) => {
      vi.stubGlobal('SharedWorker', MockSharedWorker);
      setUserAgent(userAgent);

      render(<SSEInitializer />);

      expect(sharedWorkerPorts).toHaveLength(0);
      expect(eventSources).toHaveLength(1);
    },
  );

  it('상태 코드 없는 네트워크 오류에서는 토큰 재발급을 시도하지 않는다', () => {
    render(<SSEInitializer />);

    expect(eventSources).toHaveLength(1);

    act(() => {
      eventSources[0].onerror?.({ error: new Error('NetworkError') });
    });

    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it('서버 일시 장애 응답에서는 기존 토큰으로 지연 재연결한다', () => {
    vi.useFakeTimers();
    render(<SSEInitializer />);

    expect(eventSources).toHaveLength(1);

    act(() => {
      eventSources[0].onerror?.({ status: 503 });
    });

    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(eventSources).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(getAccessTokenMock).toHaveBeenCalled();
    expect(eventSources).toHaveLength(2);
  });

  it('연속된 일시 장애에서는 재연결 지연을 지수 backoff로 늘린다', () => {
    vi.useFakeTimers();
    render(<SSEInitializer />);

    act(() => {
      eventSources[0].onerror?.({ status: 503 });
      vi.advanceTimersByTime(3000);
    });

    expect(eventSources).toHaveLength(2);

    act(() => {
      eventSources[1].onerror?.({ status: 503 });
      vi.advanceTimersByTime(5999);
    });

    expect(eventSources).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(eventSources).toHaveLength(3);
  });

  it('상태 코드 없는 전송 오류가 반복되면 자동 재연결을 중단한다', () => {
    vi.useFakeTimers();
    render(<SSEInitializer />);

    act(() => {
      eventSources[0].onerror?.({ error: new Error('NetworkError') });
      vi.advanceTimersByTime(3000);
    });

    expect(eventSources).toHaveLength(2);

    act(() => {
      eventSources[1].onerror?.({ error: new Error('NetworkError') });
      vi.advanceTimersByTime(6000);
    });

    expect(eventSources).toHaveLength(3);

    act(() => {
      eventSources[2].onerror?.({ error: new Error('NetworkError') });
      vi.advanceTimersByTime(30000);
    });

    expect(eventSources).toHaveLength(3);
  });

  it('연결이 성공하면 재연결 지연을 초기값으로 되돌린다', () => {
    vi.useFakeTimers();
    render(<SSEInitializer />);

    act(() => {
      eventSources[0].onerror?.({ status: 503 });
      vi.advanceTimersByTime(3000);
    });

    expect(eventSources).toHaveLength(2);

    act(() => {
      eventSources[1].onopen?.();
      eventSources[1].onerror?.({ status: 503 });
      vi.advanceTimersByTime(2999);
    });

    expect(eventSources).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(eventSources).toHaveLength(3);
  });
});
