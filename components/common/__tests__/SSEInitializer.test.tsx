import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAuthStore from '@/components/store/authStore';
import SSEInitializer from '../SSEInitializer';

const { eventSources, getAccessTokenMock, refreshAccessTokenMock } = vi.hoisted(() => ({
  eventSources: [] as Array<{
    onopen?: () => void;
    onerror?: (event?: unknown) => void;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
    options?: { headers?: Record<string, string> };
  }>,
  getAccessTokenMock: vi.fn(),
  refreshAccessTokenMock: vi.fn(),
}));

vi.mock('@/lib/auth/tokenManager', () => ({
  getAccessToken: getAccessTokenMock,
  refreshAccessToken: refreshAccessTokenMock,
}));

vi.mock('@/lib/utils/vid', () => ({
  getOrCreateVid: () => 'stored-vid',
}));

vi.mock('event-source-polyfill', () => {
  class MockEventSourcePolyfill {
    onopen?: () => void;
    onerror?: (event?: unknown) => void;
    readyState = 1;
    close = vi.fn(() => {
      this.readyState = 2;
    });

    options?: { headers?: Record<string, string> };

    constructor(_url: string, options?: { headers?: Record<string, string> }) {
      this.options = options;
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

describe('SSEInitializer', () => {
  beforeEach(() => {
    eventSources.length = 0;
    vi.clearAllMocks();
    getAccessTokenMock.mockReturnValue('access-token');
    refreshAccessTokenMock.mockResolvedValue('new-access-token');
    useAuthStore.setState({
      authStatus: 'authenticated',
      isLoggedIn: true,
      user,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('상태 코드 없는 네트워크 오류에서는 토큰 재발급을 시도하지 않는다', () => {
    render(<SSEInitializer />);

    expect(eventSources).toHaveLength(1);
    expect(eventSources[0].options?.headers?.vid).toBe('stored-vid');

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
