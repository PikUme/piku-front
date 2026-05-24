import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFeedCursor } from '../feed';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockGet = vi.mocked(api.get);

describe('getFeedCursor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('첫 페이지 요청 시 cursor 파라미터를 보내지 않는다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getFeedCursor();

    expect(mockGet).toHaveBeenCalledWith('/diary', {
      params: { limit: 20 },
    });
  });

  it('cursor가 null이면 cursor 파라미터를 보내지 않는다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getFeedCursor(null);

    expect(mockGet).toHaveBeenCalledWith('/diary', {
      params: { limit: 20 },
    });
  });

  it('cursor가 있으면 cursor 파라미터를 포함한다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getFeedCursor('abc123');

    expect(mockGet).toHaveBeenCalledWith('/diary', {
      params: { cursor: 'abc123', limit: 20 },
    });
  });

  it('limit을 커스텀으로 지정할 수 있다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getFeedCursor(null, 10);

    expect(mockGet).toHaveBeenCalledWith('/diary', {
      params: { limit: 10 },
    });
  });

  it('recommended 정렬은 sort 파라미터를 보내지 않는다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getFeedCursor(null, 20, 'recommended');

    expect(mockGet).toHaveBeenCalledWith('/diary', {
      params: { limit: 20 },
    });
  });

  it('latest 정렬은 sort=latest 파라미터를 포함한다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getFeedCursor(null, 20, 'latest');

    expect(mockGet).toHaveBeenCalledWith('/diary', {
      params: { limit: 20, sort: 'latest' },
    });
  });

  it('latest 정렬에서 cursor와 sort를 함께 전달한다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [], nextCursor: null, hasNext: false },
    });

    await getFeedCursor('cursor-abc', 20, 'latest');

    expect(mockGet).toHaveBeenCalledWith('/diary', {
      params: { cursor: 'cursor-abc', limit: 20, sort: 'latest' },
    });
  });

  it('응답 데이터를 올바르게 반환한다', async () => {
    const mockResponse = {
      items: [
        {
          diaryId: 1,
          status: 'PUBLIC',
          content: 'test',
          imgUrls: [],
          date: '2025-10-01',
          nickname: 'user',
          avatar: '',
          userId: 'u1',
          createdAt: '2025-10-01T00:00:00',
          commentCount: 0,
          friendStatus: 'NONE',
        },
      ],
      nextCursor: 'next-token',
      hasNext: true,
    };

    mockGet.mockResolvedValue({ data: mockResponse });

    const result = await getFeedCursor();

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('next-token');
    expect(result.hasNext).toBe(true);
  });
});
