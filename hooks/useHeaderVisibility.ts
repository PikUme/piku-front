'use client';

import { useSyncExternalStore } from 'react';

const TOP_VISIBLE_THRESHOLD = 4;
const HIDE_SCROLL_DELTA = 16;
const SHOW_SCROLL_DELTA = 4;

let isVisible = true;
let lastScrollY = 0;
let isListening = false;
const subscribers = new Set<() => void>();

const getCurrentScrollY = () => {
  if (typeof window === 'undefined') return 0;
  return Math.max(0, window.scrollY || window.pageYOffset || 0);
};

const notifySubscribers = () => {
  subscribers.forEach(listener => listener());
};

const setVisibility = (nextVisible: boolean) => {
  if (isVisible === nextVisible) return;
  isVisible = nextVisible;
  notifySubscribers();
};

const handleScroll = () => {
  const currentScrollY = getCurrentScrollY();

  if (currentScrollY <= TOP_VISIBLE_THRESHOLD) {
    lastScrollY = currentScrollY;
    setVisibility(true);
    return;
  }

  const scrollDelta = currentScrollY - lastScrollY;

  if (scrollDelta > HIDE_SCROLL_DELTA) {
    setVisibility(false);
    lastScrollY = currentScrollY;
    return;
  }

  if (scrollDelta < -SHOW_SCROLL_DELTA) {
    setVisibility(true);
    lastScrollY = currentScrollY;
    return;
  }
};

const startListening = () => {
  if (typeof window === 'undefined' || isListening) return;
  lastScrollY = getCurrentScrollY();
  window.addEventListener('scroll', handleScroll, { passive: true });
  isListening = true;
};

const stopListening = () => {
  if (typeof window === 'undefined' || !isListening) return;
  window.removeEventListener('scroll', handleScroll);
  isListening = false;
  isVisible = true;
  lastScrollY = 0;
};

const subscribe = (listener: () => void) => {
  subscribers.add(listener);
  startListening();

  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0) {
      stopListening();
    }
  };
};

const getSnapshot = () => isVisible;
const getServerSnapshot = () => true;

export const useHeaderVisibility = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
