import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateParam, formatTimeAgo, isValidDate } from '../date';

describe('formatTimeAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('마이크로초가 포함된 약 1년 전 생성 시각을 1년 전으로 표시한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T00:00:00+09:00'));

    expect(formatTimeAgo('2025-07-10T14:26:31.273397')).toBe('1년 전');
  });

  it('클라이언트보다 1초 앞선 생성 시각은 방금 전으로 표시한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T19:00:00+09:00'));

    expect(formatTimeAgo('2026-08-23T19:00:01+09:00')).toBe('방금 전');
  });

  it('클라이언트보다 1분 넘게 앞선 생성 시각은 날짜 정보 없음으로 표시한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T19:00:00+09:00'));

    expect(formatTimeAgo('2026-08-23T19:01:01+09:00')).toBe(
      '날짜 정보 없음',
    );
  });
});

describe('formatDateParam', () => {
  it('연월일을 YYYY-MM-DD 형식으로 만든다', () => {
    expect(formatDateParam(2026, 10, 1)).toBe('2026-10-01');
  });

  it('한 자리 월과 일을 0으로 패딩한다', () => {
    expect(formatDateParam(2026, 3, 7)).toBe('2026-03-07');
  });

  it('기본 day는 1일이다', () => {
    expect(formatDateParam(2026, 9)).toBe('2026-09-01');
  });

  it('생성한 값은 프로필 캘린더 검증을 통과한다', () => {
    expect(isValidDate(formatDateParam(2026, 9))).toBe(true);
  });
});
