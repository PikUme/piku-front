import type {
  SseTabToWorkerMessage,
  SseWorkerToTabMessage,
} from './sharedWorkerProtocol';

interface SseSharedWorkerConnectionOptions {
  token: string;
  serverUrl: string;
  onMessage: (message: SseWorkerToTabMessage) => void;
}

interface SseSharedWorkerConnection {
  clientId: string;
  notifyVisible: (token: string | null) => void;
  postTokenRefreshSucceeded: (token: string) => void;
  postTokenRefreshFailed: (hasAccessToken: boolean) => void;
  dispose: () => void;
}

let activePort: MessagePort | null = null;
let activeClientId: string | null = null;

export const isMobileBrowserForSseWorkerFallback = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

const createClientId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const postToActiveWorker = (message: SseTabToWorkerMessage) => {
  activePort?.postMessage(message);
};

export const publishUnreadCountToSseWorker = (count: number) => {
  if (!activeClientId) {
    return;
  }

  postToActiveWorker({
    type: 'UNREAD_COUNT_CHANGED',
    clientId: activeClientId,
    count,
  });
};

export const createSseSharedWorkerConnection = ({
  token,
  serverUrl,
  onMessage,
}: SseSharedWorkerConnectionOptions): SseSharedWorkerConnection | null => {
  if (
    typeof window === 'undefined' ||
    !('SharedWorker' in window) ||
    isMobileBrowserForSseWorkerFallback()
  ) {
    return null;
  }

  try {
    const worker = new SharedWorker(
      new URL('./sse.shared-worker.ts', import.meta.url),
      {
        name: 'piku-sse',
        type: 'module',
      },
    );
    const { port } = worker;
    const clientId = createClientId();

    activePort = port;
    activeClientId = clientId;

    port.onmessage = (event: MessageEvent<SseWorkerToTabMessage>) => {
      onMessage(event.data);
    };
    port.start();
    port.postMessage({
      type: 'CONNECT',
      clientId,
      token,
      serverUrl,
    } satisfies SseTabToWorkerMessage);

    return {
      clientId,
      notifyVisible: (visibleToken) => {
        port.postMessage({
          type: 'VISIBILITY_VISIBLE',
          clientId,
          token: visibleToken,
        } satisfies SseTabToWorkerMessage);
      },
      postTokenRefreshSucceeded: (newToken) => {
        port.postMessage({
          type: 'TOKEN_REFRESHED',
          clientId,
          token: newToken,
        } satisfies SseTabToWorkerMessage);
      },
      postTokenRefreshFailed: (hasAccessToken) => {
        port.postMessage({
          type: 'TOKEN_REFRESH_FAILED',
          clientId,
          hasAccessToken,
        } satisfies SseTabToWorkerMessage);
      },
      dispose: () => {
        port.postMessage({
          type: 'DISCONNECT',
          clientId,
        } satisfies SseTabToWorkerMessage);

        if (activePort === port) {
          activePort = null;
          activeClientId = null;
        }

        port.close();
      },
    };
  } catch {
    activePort = null;
    activeClientId = null;
    return null;
  }
};
