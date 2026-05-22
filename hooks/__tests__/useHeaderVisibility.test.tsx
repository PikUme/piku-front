import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHeaderVisibility } from '../useHeaderVisibility';

const setScrollY = (value: number) => {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value,
  });
};

describe('useHeaderVisibility', () => {
  it('아래로 스크롤하면 숨기고 위로 스크롤하면 다시 보여준다', () => {
    setScrollY(0);
    const first = renderHook(() => useHeaderVisibility());
    const second = renderHook(() => useHeaderVisibility());

    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);

    act(() => {
      setScrollY(80);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(first.result.current).toBe(false);
    expect(second.result.current).toBe(false);

    act(() => {
      setScrollY(72);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
  });

  it('최상단 근처에서는 항상 보여준다', () => {
    setScrollY(80);
    const { result } = renderHook(() => useHeaderVisibility());

    act(() => {
      setScrollY(160);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe(false);

    act(() => {
      setScrollY(0);
      window.dispatchEvent(new Event('scroll'));
    });

    expect(result.current).toBe(true);
  });
});
