import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createSseSharedWorkerController,
  type SseWorkerMessagePort,
} from '../sharedWorkerController';
import type { SseTabToWorkerMessage } from '../sharedWorkerProtocol';

type PortMessage = {
  data: SseTabToWorkerMessage;
};

class MockPort implements SseWorkerMessagePort {
  onmessage: ((event: PortMessage) => void) | null = null;
  postMessage = vi.fn();
  start = vi.fn();
  close = vi.fn();

  receive(message: SseTabToWorkerMessage) {
    this.onmessage?.({ data: message });
  }
}

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readyState = MockEventSource.OPEN;
  close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });

  constructor(
    public readonly url: string,
    public readonly options: {
      headers?: Record<string, string>;
      withCredentials?: boolean;
      heartbeatTimeout?: number;
    },
  ) {}
}

describe('createSseSharedWorkerController', () => {
  const eventSources: MockEventSource[] = [];

  beforeEach(() => {
    eventSources.length = 0;
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  const createController = () =>
    createSseSharedWorkerController({
      createEventSource: (url, options) => {
        const eventSource = new MockEventSource(url, options);
        eventSources.push(eventSource);
        return eventSource;
      },
    });

  const connect = (port: MockPort, clientId: string, token = 'access-token') => {
    port.receive({
      type: 'CONNECT',
      clientId,
      token,
      serverUrl: 'https://api.example.com/api',
    });
  };

  it('여러 탭이 연결되어도 SSE 서버 연결은 하나만 만들고 늦게 연결된 탭에 마지막 unread count를 전달한다', () => {
    const controller = createController();
    const firstPort = new MockPort();
    const secondPort = new MockPort();

    controller.connectPort(firstPort);
    connect(firstPort, 'tab-1');

    expect(eventSources).toHaveLength(1);
    expect(eventSources[0].url).toBe('https://api.example.com/api/sse/subscribe');
    expect(eventSources[0].options.headers).toEqual({
      Authorization: 'Bearer access-token',
    });

    eventSources[0].onmessage?.({ data: '7' });

    expect(firstPort.postMessage).toHaveBeenCalledWith({
      type: 'SET_UNREAD_COUNT',
      count: 7,
    });

    controller.connectPort(secondPort);
    connect(secondPort, 'tab-2');

    expect(eventSources).toHaveLength(1);
    expect(secondPort.postMessage).toHaveBeenCalledWith({
      type: 'SET_UNREAD_COUNT',
      count: 7,
    });
  });

  it('서버 일시 장애는 모든 탭을 통틀어 하나의 backoff 재연결만 예약한다', () => {
    const controller = createController();
    const firstPort = new MockPort();
    const secondPort = new MockPort();

    controller.connectPort(firstPort);
    controller.connectPort(secondPort);
    connect(firstPort, 'tab-1');
    connect(secondPort, 'tab-2');

    eventSources[0].onerror?.({ status: 503 });

    expect(firstPort.postMessage).not.toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });
    expect(secondPort.postMessage).not.toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });
    expect(eventSources).toHaveLength(1);

    vi.advanceTimersByTime(3000);

    expect(eventSources).toHaveLength(2);
  });

  it('명확한 인증 오류는 한 탭에만 token refresh를 요청하고 새 token으로 재연결한다', () => {
    const controller = createController();
    const firstPort = new MockPort();
    const secondPort = new MockPort();

    controller.connectPort(firstPort);
    controller.connectPort(secondPort);
    connect(firstPort, 'tab-1', 'expired-token');
    connect(secondPort, 'tab-2', 'expired-token');

    eventSources[0].onerror?.({ status: 401 });

    expect(firstPort.postMessage).toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });
    expect(secondPort.postMessage).not.toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });
    expect(eventSources).toHaveLength(1);

    firstPort.receive({
      type: 'TOKEN_REFRESHED',
      clientId: 'tab-1',
      token: 'fresh-token',
    });

    expect(eventSources).toHaveLength(2);
    expect(eventSources[1].options.headers).toEqual({
      Authorization: 'Bearer fresh-token',
    });
  });

  it('token refresh를 맡은 탭이 연결 해제되면 다른 탭에 refresh 요청을 넘긴다', () => {
    const controller = createController();
    const firstPort = new MockPort();
    const secondPort = new MockPort();

    controller.connectPort(firstPort);
    controller.connectPort(secondPort);
    connect(firstPort, 'tab-1', 'expired-token');
    connect(secondPort, 'tab-2', 'expired-token');

    eventSources[0].onerror?.({ status: 403 });

    expect(firstPort.postMessage).toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });
    expect(secondPort.postMessage).not.toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });

    firstPort.receive({
      type: 'DISCONNECT',
      clientId: 'tab-1',
    });

    expect(secondPort.postMessage).toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });
  });

  it('token refresh 응답이 없으면 다른 탭에 refresh 요청을 다시 위임한다', () => {
    const controller = createController();
    const firstPort = new MockPort();
    const secondPort = new MockPort();

    controller.connectPort(firstPort);
    controller.connectPort(secondPort);
    connect(firstPort, 'tab-1', 'expired-token');
    connect(secondPort, 'tab-2', 'expired-token');

    eventSources[0].onerror?.({ status: 401 });

    expect(firstPort.postMessage).toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });

    vi.advanceTimersByTime(9999);

    expect(secondPort.postMessage).not.toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });

    vi.advanceTimersByTime(1);

    expect(secondPort.postMessage).toHaveBeenCalledWith({
      type: 'REQUEST_TOKEN_REFRESH',
    });
  });

  it('탭에서 보낸 unread count 변경을 모든 탭과 이후 연결 탭에 같은 count로 전파한다', () => {
    const controller = createController();
    const firstPort = new MockPort();
    const secondPort = new MockPort();
    const latePort = new MockPort();

    controller.connectPort(firstPort);
    controller.connectPort(secondPort);
    connect(firstPort, 'tab-1');
    connect(secondPort, 'tab-2');
    eventSources[0].onmessage?.({ data: '5' });

    secondPort.receive({
      type: 'UNREAD_COUNT_CHANGED',
      clientId: 'tab-2',
      count: 2,
    });

    expect(firstPort.postMessage).toHaveBeenLastCalledWith({
      type: 'SET_UNREAD_COUNT',
      count: 2,
    });
    expect(secondPort.postMessage).toHaveBeenLastCalledWith({
      type: 'SET_UNREAD_COUNT',
      count: 2,
    });

    controller.connectPort(latePort);
    connect(latePort, 'tab-3');

    expect(latePort.postMessage).toHaveBeenCalledWith({
      type: 'SET_UNREAD_COUNT',
      count: 2,
    });
  });
});
