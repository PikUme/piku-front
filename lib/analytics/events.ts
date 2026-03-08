export const FEED_CLICK = 'feed_click';
export const FEED_LIKE = 'feed_like';

export const trackEvent = (
  name: string,
  params?: Record<string, unknown>,
): void => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', name, params);
    } else if (process.env.NODE_ENV === 'development') {
      console.debug(`[analytics] ${name}`, params);
    }
  } catch {
    // analytics should never break the app
  }
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
