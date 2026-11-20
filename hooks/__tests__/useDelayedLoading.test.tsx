import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDelayedLoading } from '../useDelayedLoading';

describe('useDelayedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('지연 시간(기본 200ms) 이전에는 false를 유지하고 경과 후 true로 전환한다', () => {
    const { result } = renderHook(() => useDelayedLoading(true));

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it('로딩이 지연 시간 이전에 종료되면 true로 전환되지 않는다', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) => useDelayedLoading(isLoading),
      { initialProps: { isLoading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(false);

    rerender({ isLoading: false });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);
  });

  it('지연 노출 상태에서 로딩이 끝나면 즉시 false로 돌아간다', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) => useDelayedLoading(isLoading),
      { initialProps: { isLoading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(true);

    rerender({ isLoading: false });
    expect(result.current).toBe(false);
  });
});
