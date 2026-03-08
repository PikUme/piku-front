import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent, FEED_CLICK, FEED_LIKE } from '../events';

describe('trackEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete window.gtag;
  });

  it('이벤트 상수가 올바르게 정의되어 있다', () => {
    expect(FEED_CLICK).toBe('feed_click');
    expect(FEED_LIKE).toBe('feed_like');
  });

  it('window.gtag가 있으면 호출한다', () => {
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    trackEvent('feed_click', { diaryId: 1 });

    expect(mockGtag).toHaveBeenCalledWith('event', 'feed_click', {
      diaryId: 1,
    });
  });

  it('window.gtag가 없어도 에러가 발생하지 않는다', () => {
    delete window.gtag;

    expect(() => trackEvent('feed_click')).not.toThrow();
  });

  it('파라미터 없이 호출할 수 있다', () => {
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    trackEvent('feed_click');

    expect(mockGtag).toHaveBeenCalledWith('event', 'feed_click', undefined);
  });
});
