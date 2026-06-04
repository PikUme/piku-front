import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateDiary } from '../diary';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    patch: vi.fn(),
  },
}));

const mockPatch = vi.mocked(api.patch);

describe('diary API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateDiary는 status와 content만 JSON으로 PATCH 전송한다', async () => {
    const payload = {
      status: 'FRIENDS' as const,
      content: '수정한 일기',
    };
    const response = {
      diaryId: 1,
      ...payload,
      updatedAt: '2026-06-02T10:00:00',
    };
    mockPatch.mockResolvedValue({ data: response });

    const result = await updateDiary(1, payload);

    expect(mockPatch).toHaveBeenCalledWith('/diary/1', payload);
    expect(result).toEqual(response);
  });
});
