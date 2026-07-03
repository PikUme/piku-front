import { EventSourcePolyfill } from 'event-source-polyfill';
import {
  createSseSharedWorkerController,
  type SseEventSourceLike,
  type SseWorkerMessagePort,
} from './sharedWorkerController';

const controller = createSseSharedWorkerController({
  createEventSource: (url, options) =>
    new EventSourcePolyfill(url, options) as unknown as SseEventSourceLike,
});

interface SharedWorkerConnectEvent {
  ports: MessagePort[];
}

interface SseSharedWorkerGlobalScope {
  onconnect: ((event: SharedWorkerConnectEvent) => void) | null;
}

const sharedWorkerScope = self as unknown as SseSharedWorkerGlobalScope;

sharedWorkerScope.onconnect = (event: SharedWorkerConnectEvent) => {
  const [port] = event.ports;
  if (port) {
    controller.connectPort(port as unknown as SseWorkerMessagePort);
  }
};

export {};
