import { useEffect, useState } from 'react';

export const DEFAULT_LOADING_DELAY_MS = 200;

export const useDelayedLoading = (
  isLoading: boolean,
  delayMs: number = DEFAULT_LOADING_DELAY_MS,
): boolean => {
  const [isDelayedLoading, setIsDelayedLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsDelayedLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsDelayedLoading(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, isLoading]);

  return isLoading && isDelayedLoading;
};
