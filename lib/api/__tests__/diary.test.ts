import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserGallery } from '../diary';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockGet = vi.mocked(api.get);

describe('getUserGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('첫 페이지 요청 시 cursor 없이 limit 10을 보낸다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getUserGallery('user-1');

    expect(mockGet).toHaveBeenCalledWith('/diary/user/user-1/gallery', {
      params: { limit: 10 },
    });
  });

  it('cursor가 있으면 cursor와 limit을 함께 보낸다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getUserGallery('user-1', 'cursor-1');

    expect(mockGet).toHaveBeenCalledWith('/diary/user/user-1/gallery', {
      params: { cursor: 'cursor-1', limit: 10 },
    });
  });
});
