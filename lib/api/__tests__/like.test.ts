import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addLike, removeLike } from '../like';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPost = vi.mocked(api.post);
const mockDelete = vi.mocked(api.delete);

describe('like API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addLike는 POST /likes/diary/{diaryId}를 호출한다', async () => {
    mockPost.mockResolvedValue({
      data: { diaryId: 1, likeCount: 5, liked: true },
    });

    const result = await addLike(1);

    expect(mockPost).toHaveBeenCalledWith('/likes/diary/1');
    expect(result.isLiked).toBe(true);
    expect(result.likeCount).toBe(5);
  });

  it('removeLike는 DELETE /likes/diary/{diaryId}를 호출한다', async () => {
    mockDelete.mockResolvedValue({
      data: { diaryId: 1, likeCount: 4, liked: false },
    });

    const result = await removeLike(1);

    expect(mockDelete).toHaveBeenCalledWith('/likes/diary/1');
    expect(result.isLiked).toBe(false);
    expect(result.likeCount).toBe(4);
  });
});
