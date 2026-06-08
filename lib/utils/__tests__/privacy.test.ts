import { describe, it, expect } from 'vitest';
import { getPrivacyLabel, PRIVACY_OPTIONS } from '../privacy';

describe('getPrivacyLabel', () => {
  it('PUBLIC은 전체 공개를 반환한다', () => {
    expect(getPrivacyLabel('PUBLIC')).toBe('전체 공개');
  });

  it('FRIENDS는 친구 공개를 반환한다', () => {
    expect(getPrivacyLabel('FRIENDS')).toBe('친구 공개');
  });

  it('PRIVATE는 나만 보기를 반환한다', () => {
    expect(getPrivacyLabel('PRIVATE')).toBe('나만 보기');
  });

  it('ANONYMOUS는 익명을 반환한다', () => {
    expect(getPrivacyLabel('ANONYMOUS')).toBe('익명');
  });
});

describe('PRIVACY_OPTIONS', () => {
  it('4개의 옵션이 있다', () => {
    expect(PRIVACY_OPTIONS).toHaveLength(4);
  });

  it('각 옵션에 value, label, description이 있다', () => {
    PRIVACY_OPTIONS.forEach(option => {
      expect(option.value).toBeDefined();
      expect(option.label).toBeDefined();
      expect(option.description).toBeDefined();
    });
  });

  it('getPrivacyLabel과 PRIVACY_OPTIONS의 라벨이 일치한다', () => {
    PRIVACY_OPTIONS.forEach(option => {
      expect(getPrivacyLabel(option.value)).toBe(option.label);
    });
  });
});
