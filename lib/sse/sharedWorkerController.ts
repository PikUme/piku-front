import type {
  SseTabToWorkerMessage,
  SseWorkerToTabMessage,
} from './sharedWorkerProtocol';

const INITIAL_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_TRANSPORT_ERROR_AUTO_RECONNECTS = 3;
const EVENT_SOURCE_CLOSED = 2;
const HEARTBEAT_TIMEOUT = 86400000;
const TOKEN_REFRESH_RESPONSE_TIMEOUT = 10000;

export interface SseWorkerMessagePort {
  onmessage: ((event: { data: SseTabToWorkerMessage }) => void) | null;
  postMessage: (message: SseWorkerToTabMessage) => void;
  start: () => void;
  close?: () => void;
}

export interface SseEventSourceLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  readyState: number;
  close: () => void;
}

interface SseEventSourceOptions {
  headers: Record<string, string>;
  withCredentials: boolean;
  heartbeatTimeout: number;
}

interface CreateControllerOptions {
  createEventSource: (
    url: string,
    options: SseEventSourceOptions,
  ) => SseEventSourceLike;
}

interface PortState {
  clientId: string | null;
  port: SseWorkerMessagePort;
}

const getSseErrorStatus = (event: unknown): number | undefined => {
  if (typeof event !== 'object' || event === null || !('status' in event)) {
    return undefined;
  }

  return (event as { status?: number }).status;
};

const isAuthErrorStatus = (status: number | undefined): boolean =>
  status === 401 || status === 403;

const normalizeUnreadCount = (count: number): number =>
  Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;

export const createSseSharedWorkerController = ({
  createEventSource,
}: CreateControllerOptions) => {
  const ports = new Map<SseWorkerMessagePort, PortState>();
  let token: string | null = null;
  let serverUrl: string | null = null;
  let eventSource: SseEventSourceLike | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = INITIAL_RECONNECT_DELAY;
  let transportErrorCount = 0;
  let isFirstMessage = true;
  let unreadCount: number | null = null;
  let isRefreshingToken = false;
  let refreshPort: SseWorkerMessagePort | null = null;
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  const postToPort = (
    port: SseWorkerMessagePort,
    message: SseWorkerToTabMessage,
  ) => {
    port.postMessage(message);
  };

  const broadcast = (message: SseWorkerToTabMessage) => {
    ports.forEach(({ port }) => postToPort(port, message));
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  const clearRefreshTimeout = () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
  };

  const closeEventSource = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  const hasConnectedPort = () =>
    Array.from(ports.values()).some(({ clientId }) => clientId !== null);

  const connect = () => {
    if (!token || !serverUrl || !hasConnectedPort()) {
      return;
    }

    if (eventSource && eventSource.readyState !== EVENT_SOURCE_CLOSED) {
      return;
    }

    const sseUrl = `${serverUrl}/sse/subscribe`;
    eventSource = createEventSource(sseUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
      heartbeatTimeout: HEARTBEAT_TIMEOUT,
    });
    isFirstMessage = true;

    eventSource.onopen = () => {
      reconnectDelay = INITIAL_RECONNECT_DELAY;
      transportErrorCount = 0;
    };

    eventSource.onmessage = (event) => {
      if (isFirstMessage) {
        const nextCount = parseInt(event.data, 10);
        if (!Number.isNaN(nextCount)) {
          unreadCount = normalizeUnreadCount(nextCount);
          broadcast({ type: 'SET_UNREAD_COUNT', count: unreadCount });
        }
        isFirstMessage = false;
        return;
      }

      if (unreadCount === null) {
        broadcast({ type: 'INCREMENT_UNREAD_COUNT' });
        return;
      }

      unreadCount += 1;
      broadcast({ type: 'SET_UNREAD_COUNT', count: unreadCount });
    };

    eventSource.onerror = (event) => {
      closeEventSource();

      const status = getSseErrorStatus(event);
      if (isAuthErrorStatus(status)) {
        requestTokenRefresh();
        return;
      }

      if (status === undefined) {
        transportErrorCount += 1;
        if (transportErrorCount >= MAX_TRANSPORT_ERROR_AUTO_RECONNECTS) {
          return;
        }
      } else {
        transportErrorCount = 0;
      }

      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    clearReconnectTimeout();
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, delay);
  };

  const requestTokenRefresh = (excludedPort?: SseWorkerMessagePort) => {
    if (isRefreshingToken) {
      return;
    }

    const nextRefreshPort = Array.from(ports.values()).find(
      ({ clientId, port }) => clientId !== null && port !== excludedPort,
    )?.port;

    if (!nextRefreshPort) {
      return;
    }

    isRefreshingToken = true;
    refreshPort = nextRefreshPort;
    clearRefreshTimeout();
    refreshTimeout = setTimeout(() => {
      const timedOutPort = refreshPort;
      isRefreshingToken = false;
      refreshPort = null;
      refreshTimeout = null;
      requestTokenRefresh(timedOutPort ?? undefined);
    }, TOKEN_REFRESH_RESPONSE_TIMEOUT);
    postToPort(nextRefreshPort, { type: 'REQUEST_TOKEN_REFRESH' });
  };

  const applyUnreadCount = (count: number) => {
    unreadCount = normalizeUnreadCount(count);
    broadcast({ type: 'SET_UNREAD_COUNT', count: unreadCount });
  };

  const removePort = (port: SseWorkerMessagePort) => {
    ports.delete(port);
    if (refreshPort === port) {
      isRefreshingToken = false;
      refreshPort = null;
      clearRefreshTimeout();
      requestTokenRefresh(port);
    }

    if (!hasConnectedPort()) {
      clearReconnectTimeout();
      clearRefreshTimeout();
      closeEventSource();
      token = null;
      serverUrl = null;
      unreadCount = null;
      isRefreshingToken = false;
      refreshPort = null;
      transportErrorCount = 0;
      reconnectDelay = INITIAL_RECONNECT_DELAY;
    }
  };

  const handleMessage = (
    port: SseWorkerMessagePort,
    message: SseTabToWorkerMessage,
  ) => {
    const state = ports.get(port);

    switch (message.type) {
      case 'CONNECT':
        if (state) {
          state.clientId = message.clientId;
        }
        token = message.token;
        serverUrl = message.serverUrl;
        if (unreadCount !== null) {
          postToPort(port, { type: 'SET_UNREAD_COUNT', count: unreadCount });
        }
        connect();
        break;
      case 'VISIBILITY_VISIBLE':
        if (message.token) {
          token = message.token;
        }
        if (unreadCount !== null) {
          postToPort(port, { type: 'SET_UNREAD_COUNT', count: unreadCount });
        }
        connect();
        break;
      case 'TOKEN_REFRESHED':
        token = message.token;
        isRefreshingToken = false;
        refreshPort = null;
        clearRefreshTimeout();
        clearReconnectTimeout();
        closeEventSource();
        connect();
        break;
      case 'TOKEN_REFRESH_FAILED':
        isRefreshingToken = false;
        refreshPort = null;
        clearRefreshTimeout();
        if (message.hasAccessToken) {
          scheduleReconnect();
          return;
        }
        clearReconnectTimeout();
        closeEventSource();
        token = null;
        broadcast({ type: 'AUTH_FAILED' });
        break;
      case 'UNREAD_COUNT_CHANGED':
        applyUnreadCount(message.count);
        break;
      case 'DISCONNECT':
        removePort(port);
        break;
      case 'LOGOUT':
        clearReconnectTimeout();
        clearRefreshTimeout();
        closeEventSource();
        token = null;
        unreadCount = null;
        isRefreshingToken = false;
        refreshPort = null;
        broadcast({ type: 'AUTH_FAILED' });
        break;
    }
  };

  const connectPort = (port: SseWorkerMessagePort) => {
    ports.set(port, { clientId: null, port });
    port.onmessage = (event) => handleMessage(port, event.data);
    port.start();
  };

  return {
    connectPort,
  };
};
