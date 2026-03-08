import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import FeedClient from '../FeedClient';
import { getFeedCursor } from '@/lib/api/feed';
import { addLike, removeLike } from '@/lib/api/like';
import { trackEvent } from '@/lib/analytics/events';
import type { CursorPage, FeedDiary } from '@/types/diary';

vi.mock('@/lib/api/feed', () => ({
  getFeedCursor: vi.fn(),
}));

vi.mock('@/lib/api/diary', () => ({
  getDiaryById: vi.fn(),
}));

vi.mock('@/lib/api/like', () => ({
  addLike: vi.fn(),
  removeLike: vi.fn(),
}));

vi.mock('@/lib/analytics/events', () => ({
  trackEvent: vi.fn(),
  FEED_CLICK: 'feed_click',
  FEED_LIKE: 'feed_like',
}));

vi.mock('react-responsive', () => ({
  useMediaQuery: () => true,
}));

vi.mock('../FeedCard', () => ({
  default: ({ post, onLikeToggle }: { post: FeedDiary; onLikeToggle: (id: number) => void }) => (
    <div data-testid={`feed-card-${post.diaryId}`}>
      {post.content}
      <span data-testid={`like-count-${post.diaryId}`}>{post.likeCount}</span>
      <span data-testid={`like-status-${post.diaryId}`}>{post.isLiked ? 'liked' : 'not-liked'}</span>
      <button data-testid={`like-btn-${post.diaryId}`} onClick={() => onLikeToggle(post.diaryId)}>like</button>
    </div>
  ),
}));

vi.mock('../../diary/DiaryDetailModal', () => ({
  default: () => null,
}));

vi.mock('../../diary/DiaryStoryModal', () => ({
  default: () => null,
}));

vi.mock('../../diary/StoryCommentModal', () => ({
  default: () => null,
}));

// IntersectionObserver mock - class 형태로 정의
let intersectionCallback: IntersectionObserverCallback;
class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [0];
  takeRecords = vi.fn().mockReturnValue([]);
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

const mockGetFeedCursor = vi.mocked(getFeedCursor);

const makeFeedItem = (id: number): FeedDiary => ({
  diaryId: id,
  status: 'PUBLIC',
  content: `diary-${id}`,
  imgUrls: [],
  date: '2025-10-01',
  nickname: `user-${id}`,
  avatar: '',
  userId: `uid-${id}`,
  createdAt: '2025-10-01T00:00:00',
  commentCount: 0,
  likeCount: 0,
  isLiked: false,
  friendStatus: 'NONE' as const,
});

const makeResponse = (
  ids: number[],
  nextCursor: string | null,
  hasNext: boolean,
): CursorPage<FeedDiary> => ({
  items: ids.map(makeFeedItem),
  nextCursor,
  hasNext,
});

describe('FeedClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('첫 로드 시 cursor 없이 요청한다', async () => {
    mockGetFeedCursor.mockResolvedValue(makeResponse([1, 2, 3], 'cursor-1', true));

    render(<FeedClient />);

    await waitFor(() => {
      expect(mockGetFeedCursor).toHaveBeenCalledWith(null);
    });
  });

  it('피드 아이템을 렌더링한다', async () => {
    mockGetFeedCursor.mockResolvedValue(makeResponse([1, 2, 3], 'cursor-1', true));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-card-1')).toBeDefined();
      expect(screen.getByTestId('feed-card-2')).toBeDefined();
      expect(screen.getByTestId('feed-card-3')).toBeDefined();
    });
  });

  it('중복 diaryId를 제거한다', async () => {
    mockGetFeedCursor.mockResolvedValueOnce(makeResponse([1, 2], 'cursor-1', true));
    mockGetFeedCursor.mockResolvedValueOnce(makeResponse([2, 3], 'cursor-2', false));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-card-1')).toBeDefined();
      expect(screen.getByTestId('feed-card-2')).toBeDefined();
    });

    // IntersectionObserver 콜백으로 다음 페이지 트리거
    await act(async () => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        new MockIntersectionObserver(() => {}) as unknown as IntersectionObserver,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('feed-card-3')).toBeDefined();
    });

    const cards = screen.getAllByTestId(/^feed-card-/);
    const ids = cards.map(c => c.getAttribute('data-testid'));
    expect(ids).toEqual(['feed-card-1', 'feed-card-2', 'feed-card-3']);
  });

  it('hasNext가 false이면 종료 메시지를 표시한다', async () => {
    mockGetFeedCursor.mockResolvedValue(makeResponse([1], null, false));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByText('모든 피드를 다 봤어요!')).toBeDefined();
    });
  });

  it('첫 페이지 실패 시 에러 상태와 재시도 버튼을 표시한다', async () => {
    mockGetFeedCursor.mockRejectedValue(new Error('Network error'));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByText('피드를 불러오지 못했습니다.')).toBeDefined();
      expect(screen.getByText('다시 시도')).toBeDefined();
    });
  });

  it('다음 페이지 실패 시 기존 목록을 유지하고 재시도 버튼을 표시한다', async () => {
    mockGetFeedCursor.mockResolvedValueOnce(makeResponse([1, 2], 'cursor-1', true));
    mockGetFeedCursor.mockRejectedValueOnce(new Error('Network error'));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-card-1')).toBeDefined();
      expect(screen.getByTestId('feed-card-2')).toBeDefined();
    });

    // 다음 페이지 로드 트리거
    await act(async () => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        new MockIntersectionObserver(() => {}) as unknown as IntersectionObserver,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('불러오기 실패')).toBeDefined();
      expect(screen.getByText('다시 시도')).toBeDefined();
    });

    // 기존 목록 유지 확인
    expect(screen.getByTestId('feed-card-1')).toBeDefined();
    expect(screen.getByTestId('feed-card-2')).toBeDefined();
  });

  it('좋아요 성공 시 카운트가 증가하고 feed_like 이벤트를 발행한다', async () => {
    mockGetFeedCursor.mockResolvedValue(makeResponse([1], 'c1', true));
    vi.mocked(addLike).mockResolvedValue({ diaryId: 1, likeCount: 1, isLiked: true });

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('like-status-1')).toHaveTextContent('not-liked');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('like-btn-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('like-status-1')).toHaveTextContent('liked');
      expect(screen.getByTestId('like-count-1')).toHaveTextContent('1');
    });

    expect(addLike).toHaveBeenCalledWith(1);
    expect(trackEvent).toHaveBeenCalledWith('feed_like', { diaryId: 1 });
  });

  it('좋아요 실패 시 원래 상태로 rollback한다', async () => {
    mockGetFeedCursor.mockResolvedValue(makeResponse([1], 'c1', true));
    vi.mocked(addLike).mockRejectedValue(new Error('Server error'));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('like-status-1')).toHaveTextContent('not-liked');
      expect(screen.getByTestId('like-count-1')).toHaveTextContent('0');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('like-btn-1'));
    });

    // rollback 후 원래 상태
    await waitFor(() => {
      expect(screen.getByTestId('like-status-1')).toHaveTextContent('not-liked');
      expect(screen.getByTestId('like-count-1')).toHaveTextContent('0');
    });
  });
});
