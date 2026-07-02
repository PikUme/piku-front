export type SseTabToWorkerMessage =
  | {
      type: 'CONNECT';
      clientId: string;
      token: string;
      serverUrl: string;
    }
  | {
      type: 'VISIBILITY_VISIBLE';
      clientId: string;
      token: string | null;
    }
  | {
      type: 'TOKEN_REFRESHED';
      clientId: string;
      token: string;
    }
  | {
      type: 'TOKEN_REFRESH_FAILED';
      clientId: string;
      hasAccessToken: boolean;
    }
  | {
      type: 'UNREAD_COUNT_CHANGED';
      clientId: string;
      count: number;
    }
  | {
      type: 'DISCONNECT';
      clientId: string;
    }
  | {
      type: 'LOGOUT';
      clientId: string;
    };

export type SseWorkerToTabMessage =
  | {
      type: 'SET_UNREAD_COUNT';
      count: number;
    }
  | {
      type: 'INCREMENT_UNREAD_COUNT';
    }
  | {
      type: 'REQUEST_TOKEN_REFRESH';
    }
  | {
      type: 'AUTH_FAILED';
    };
