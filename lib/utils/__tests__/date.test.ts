import { describe, expect, it } from 'vitest';
import { formatDateParam, isValidDate } from '../date';

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
