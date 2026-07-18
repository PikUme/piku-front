import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMonthlyDiaries } from '@/lib/api/diary';
import { useDiaryData } from '../useDiaryData';
import type { MonthlyDiary } from '@/types/diary';
import type { User } from '@/types/auth';

vi.mock('@/lib/api/diary', () => ({
  getMonthlyDiaries: vi.fn(),
  getDiaryById: vi.fn(),
}));

const getMonthlyDiariesMock = vi.mocked(getMonthlyDiaries);

const user: User = {
  id: 'user-1',
  email: 'user@example.com',
  nickname: '픽쿠야',
  avatar: '',
};

const monthlyDiary = (
  date: string,
  coverPhotoUrl: string,
): MonthlyDiary => ({
  diaryId: Number(date.slice(-2)),
  date,
  coverPhotoUrl,
});

describe('useDiaryData monthly diary recovery', () => {
  beforeEach(() => {
    getMonthlyDiariesMock.mockReset();
  });

  it('현재 사용자와 연월의 월별 데이터를 명시적으로 다시 조회한다', async () => {
    const currentDate = new Date('2026-05-15T00:00:00');
    getMonthlyDiariesMock
      .mockResolvedValueOnce([monthlyDiary('2026-05-15', '/old.png')])
      .mockResolvedValueOnce([monthlyDiary('2026-05-15', '/new.png')]);

    const { result } = renderHook(() =>
      useDiaryData(currentDate, user),
    );

    await waitFor(() => {
      expect(result.current.pikus['2026-05-15']?.imageUrl).toBe('/old.png');
    });

    await act(async () => {
      await result.current.refetchMonthlyDiaries();
    });

    expect(result.current.pikus['2026-05-15']?.imageUrl).toBe('/new.png');
    expect(getMonthlyDiariesMock).toHaveBeenCalledTimes(2);
    expect(getMonthlyDiariesMock).toHaveBeenLastCalledWith('user-1', 2026, 5);
  });

  it('명시적 재조회가 실패하면 기존 월별 데이터를 유지한다', async () => {
    const currentDate = new Date('2026-05-15T00:00:00');
    getMonthlyDiariesMock
      .mockResolvedValueOnce([monthlyDiary('2026-05-15', '/old.png')])
      .mockRejectedValueOnce(new Error('temporary failure'));

    const { result } = renderHook(() =>
      useDiaryData(currentDate, user),
    );

    await waitFor(() => {
      expect(result.current.pikus['2026-05-15']?.imageUrl).toBe('/old.png');
    });

    await expect(
      act(async () => {
        await result.current.refetchMonthlyDiaries();
      }),
    ).rejects.toThrow('temporary failure');

    expect(result.current.pikus['2026-05-15']?.imageUrl).toBe('/old.png');
  });

  it('이전 연월의 늦은 응답이 현재 연월 데이터를 덮지 않는다', async () => {
    let resolveMayRequest: ((diaries: MonthlyDiary[]) => void) | undefined;
    const mayRequest = new Promise<MonthlyDiary[]>(resolve => {
      resolveMayRequest = resolve;
    });

    getMonthlyDiariesMock
      .mockReturnValueOnce(mayRequest)
      .mockResolvedValueOnce([monthlyDiary('2026-06-20', '/june.png')]);

    const { result, rerender } = renderHook(
      ({ currentDate }: { currentDate: Date }) =>
        useDiaryData(currentDate, user),
      {
        initialProps: {
          currentDate: new Date('2026-05-15T00:00:00'),
        },
      },
    );

    rerender({ currentDate: new Date('2026-06-20T00:00:00') });

    await waitFor(() => {
      expect(result.current.pikus['2026-06-20']?.imageUrl).toBe('/june.png');
    });

    await act(async () => {
      resolveMayRequest?.([monthlyDiary('2026-05-15', '/may.png')]);
      await mayRequest;
    });

    expect(result.current.pikus['2026-06-20']?.imageUrl).toBe('/june.png');
    expect(result.current.pikus['2026-05-15']).toBeUndefined();
  });

  it('같은 사용자와 연월의 요청이 겹치면 마지막에 시작한 요청만 반영한다', async () => {
    let resolveEarlierRefetch:
      | ((diaries: MonthlyDiary[]) => void)
      | undefined;
    const earlierRefetch = new Promise<MonthlyDiary[]>(resolve => {
      resolveEarlierRefetch = resolve;
    });

    getMonthlyDiariesMock
      .mockResolvedValueOnce([monthlyDiary('2026-05-15', '/initial.png')])
      .mockReturnValueOnce(earlierRefetch)
      .mockResolvedValueOnce([monthlyDiary('2026-05-15', '/latest.png')]);

    const { result } = renderHook(() =>
      useDiaryData(new Date('2026-05-15T00:00:00'), user),
    );

    await waitFor(() => {
      expect(result.current.pikus['2026-05-15']?.imageUrl).toBe(
        '/initial.png',
      );
    });

    let earlierRefetchResult: Promise<void> | undefined;
    act(() => {
      earlierRefetchResult = result.current.refetchMonthlyDiaries();
    });

    await act(async () => {
      await result.current.refetchMonthlyDiaries();
    });

    expect(result.current.pikus['2026-05-15']?.imageUrl).toBe('/latest.png');

    await act(async () => {
      resolveEarlierRefetch?.([
        monthlyDiary('2026-05-15', '/outdated.png'),
      ]);
      await earlierRefetchResult;
    });

    expect(result.current.pikus['2026-05-15']?.imageUrl).toBe('/latest.png');
  });

  it('표시 범위가 바뀌면 새 응답 전에도 이전 월 데이터를 숨긴다', async () => {
    let resolveJuneRequest: ((diaries: MonthlyDiary[]) => void) | undefined;
    const juneRequest = new Promise<MonthlyDiary[]>(resolve => {
      resolveJuneRequest = resolve;
    });

    getMonthlyDiariesMock
      .mockResolvedValueOnce([monthlyDiary('2026-05-15', '/may.png')])
      .mockReturnValueOnce(juneRequest);

    const { result, rerender } = renderHook(
      ({ currentDate }: { currentDate: Date }) =>
        useDiaryData(currentDate, user),
      {
        initialProps: {
          currentDate: new Date('2026-05-15T00:00:00'),
        },
      },
    );

    await waitFor(() => {
      expect(result.current.pikus['2026-05-15']?.imageUrl).toBe('/may.png');
    });

    rerender({ currentDate: new Date('2026-06-20T00:00:00') });

    expect(result.current.pikus).toEqual({});

    await act(async () => {
      resolveJuneRequest?.([monthlyDiary('2026-06-20', '/june.png')]);
      await juneRequest;
    });

    expect(result.current.pikus['2026-06-20']?.imageUrl).toBe('/june.png');
  });

  it('이전 범위로 돌아와도 최초 요청의 늦은 응답이 최신 결과를 덮지 않는다', async () => {
    let resolveFirstMayRequest:
      | ((diaries: MonthlyDiary[]) => void)
      | undefined;
    const firstMayRequest = new Promise<MonthlyDiary[]>(resolve => {
      resolveFirstMayRequest = resolve;
    });

    getMonthlyDiariesMock
      .mockReturnValueOnce(firstMayRequest)
      .mockResolvedValueOnce([monthlyDiary('2026-06-20', '/june.png')])
      .mockResolvedValueOnce([monthlyDiary('2026-05-15', '/latest-may.png')]);

    const { result, rerender } = renderHook(
      ({ currentDate }: { currentDate: Date }) =>
        useDiaryData(currentDate, user),
      {
        initialProps: {
          currentDate: new Date('2026-05-15T00:00:00'),
        },
      },
    );

    rerender({ currentDate: new Date('2026-06-20T00:00:00') });

    await waitFor(() => {
      expect(result.current.pikus['2026-06-20']?.imageUrl).toBe('/june.png');
    });

    rerender({ currentDate: new Date('2026-05-15T00:00:00') });

    await waitFor(() => {
      expect(result.current.pikus['2026-05-15']?.imageUrl).toBe(
        '/latest-may.png',
      );
    });

    await act(async () => {
      resolveFirstMayRequest?.([
        monthlyDiary('2026-05-15', '/outdated-may.png'),
      ]);
      await firstMayRequest;
    });

    expect(result.current.pikus['2026-05-15']?.imageUrl).toBe(
      '/latest-may.png',
    );
  });

  it('로드된 범위로 다시 돌아오면 새 응답 전까지 이전 데이터를 숨긴다', async () => {
    let resolveJuneRequest: ((diaries: MonthlyDiary[]) => void) | undefined;
    let resolveLatestMayRequest:
      | ((diaries: MonthlyDiary[]) => void)
      | undefined;
    const juneRequest = new Promise<MonthlyDiary[]>(resolve => {
      resolveJuneRequest = resolve;
    });
    const latestMayRequest = new Promise<MonthlyDiary[]>(resolve => {
      resolveLatestMayRequest = resolve;
    });

    getMonthlyDiariesMock
      .mockResolvedValueOnce([monthlyDiary('2026-05-15', '/old-may.png')])
      .mockReturnValueOnce(juneRequest)
      .mockReturnValueOnce(latestMayRequest);

    const { result, rerender } = renderHook(
      ({ currentDate }: { currentDate: Date }) =>
        useDiaryData(currentDate, user),
      {
        initialProps: {
          currentDate: new Date('2026-05-15T00:00:00'),
        },
      },
    );

    await waitFor(() => {
      expect(result.current.pikus['2026-05-15']?.imageUrl).toBe(
        '/old-may.png',
      );
    });

    rerender({ currentDate: new Date('2026-06-20T00:00:00') });
    expect(result.current.pikus).toEqual({});

    rerender({ currentDate: new Date('2026-05-15T00:00:00') });
    expect(result.current.pikus).toEqual({});

    await act(async () => {
      resolveLatestMayRequest?.([
        monthlyDiary('2026-05-15', '/latest-may.png'),
      ]);
      await latestMayRequest;
    });

    expect(result.current.pikus['2026-05-15']?.imageUrl).toBe(
      '/latest-may.png',
    );

    await act(async () => {
      resolveJuneRequest?.([monthlyDiary('2026-06-20', '/june.png')]);
      await juneRequest;
    });

    expect(result.current.pikus['2026-05-15']?.imageUrl).toBe(
      '/latest-may.png',
    );
  });
});
