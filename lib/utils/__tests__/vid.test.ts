import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrCreateVid, VID_STORAGE_KEY } from '../vid';

describe('getOrCreateVid', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('저장된 vid가 없으면 UUID를 생성해 localStorage에 저장한다', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '123e4567-e89b-42d3-a456-426614174000',
    );

    const vid = getOrCreateVid();

    expect(vid).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(localStorage.getItem(VID_STORAGE_KEY)).toBe(vid);
  });

  it('저장된 vid가 있으면 새로 생성하지 않고 재사용한다', () => {
    localStorage.setItem(VID_STORAGE_KEY, 'stored-vid');
    const randomUUID = vi.spyOn(crypto, 'randomUUID');

    expect(getOrCreateVid()).toBe('stored-vid');
    expect(randomUUID).not.toHaveBeenCalled();
  });
});
