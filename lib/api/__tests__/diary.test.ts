import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAiPhotos, getUserGallery, updateDiary } from '../diary';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    patch: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
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

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);

describe('generateAiPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('일기 내용과 characterId를 함께 POST 전송한다', async () => {
    const photo = { id: 10, url: 'https://example.com/ai.png' };
    mockPost.mockResolvedValue({ data: photo });

    const result = await generateAiPhotos('오늘의 일기', 7);

    expect(mockPost).toHaveBeenCalledWith('/diary/ai/generate', {
      content: '오늘의 일기',
      characterId: 7,
    });
    expect(result).toEqual(photo);
  });

  it('내용이 비어 있으면 POST하지 않는다', async () => {
    await expect(generateAiPhotos('   ', 7)).resolves.toBeNull();

    expect(mockPost).not.toHaveBeenCalled();
  });
});

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
