import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBodyScrollLock } from '../useBodyScrollLock';

const setScrollY = (value: number) => {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
  });
};

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    document.body.style.cssText = '';
    setScrollY(128);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.cssText = '';
    vi.restoreAllMocks();
  });

  it('locks body scroll while active and restores previous styles when inactive', () => {
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';

    const { rerender } = renderHook(
      ({ isLocked }) => useBodyScrollLock(isLocked),
      { initialProps: { isLocked: true } },
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-128px');
    expect(document.body.style.width).toBe('100%');

    rerender({ isLocked: false });

    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.position).toBe('relative');
    expect(document.body.style.top).toBe('');
    expect(document.body.style.width).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 128);
  });

  it('keeps body locked until every overlapping lock is released', () => {
    const first = renderHook(() => useBodyScrollLock(true));
    const second = renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');

    first.unmount();

    expect(document.body.style.overflow).toBe('hidden');
    expect(window.scrollTo).not.toHaveBeenCalled();

    second.unmount();

    expect(document.body.style.overflow).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 128);
  });

  it('restores body styles when an active lock unmounts', () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 128);
  });
});
