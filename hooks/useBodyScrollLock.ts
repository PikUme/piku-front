'use client';

import { useEffect } from 'react';

type BodyStyleSnapshot = {
  overflow: string;
  position: string;
  top: string;
  width: string;
  paddingRight: string;
};

let lockCount = 0;
let savedBodyStyles: BodyStyleSnapshot | null = null;
let savedScrollY = 0;

const getScrollbarWidth = () =>
  Math.max(0, window.innerWidth - document.documentElement.clientWidth);

const lockBodyScroll = () => {
  lockCount += 1;

  if (lockCount > 1) {
    return;
  }

  savedScrollY = window.scrollY || window.pageYOffset || 0;
  savedBodyStyles = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
    paddingRight: document.body.style.paddingRight,
  };

  const scrollbarWidth = getScrollbarWidth();

  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.width = '100%';

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
};

const unlockBodyScroll = () => {
  if (lockCount === 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount > 0 || !savedBodyStyles) {
    return;
  }

  const restoreScrollY = savedScrollY;

  document.body.style.overflow = savedBodyStyles.overflow;
  document.body.style.position = savedBodyStyles.position;
  document.body.style.top = savedBodyStyles.top;
  document.body.style.width = savedBodyStyles.width;
  document.body.style.paddingRight = savedBodyStyles.paddingRight;

  savedBodyStyles = null;
  savedScrollY = 0;

  window.scrollTo(0, restoreScrollY);
};

export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) {
      return;
    }

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
};
