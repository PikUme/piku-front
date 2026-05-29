import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import FeedClient from '../FeedClient';
import { getFeedCursor } from '@/lib/api/feed';
import { getDiaryById } from '@/lib/api/diary';
import { addLike, removeLike } from '@/lib/api/like';
import { trackEvent } from '@/lib/analytics/events';
import type { CursorPage, FeedDiary } from '@/types/diary';
import { FriendshipStatus } from '@/types/friend';

const mockViewport = vi.hoisted(() => ({
  isDesktop: true,
}));

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
  useMediaQuery: () => mockViewport.isDesktop,
}));

vi.mock('../FeedCard', () => ({
  default: ({
    post,
    onLikeToggle,
    onContentClick,
    onCommentClick,
  }: {
    post: FeedDiary;
    onLikeToggle: (id: number) => void;
    onContentClick: () => void;
    onCommentClick: () => void;
  }) => (
    <div data-testid={`feed-card-${post.diaryId}`}>
      {post.content}
      <span data-testid={`like-count-${post.diaryId}`}>{post.likeCount}</span>
      <span data-testid={`like-status-${post.diaryId}`}>{post.isLiked ? 'liked' : 'not-liked'}</span>
      <button data-testid={`content-btn-${post.diaryId}`} onClick={onContentClick}>open</button>
      <button data-testid={`comment-btn-${post.diaryId}`} onClick={onCommentClick}>comment</button>
      <button data-testid={`like-btn-${post.diaryId}`} onClick={() => onLikeToggle(post.diaryId)}>like</button>
    </div>
  ),
}));

vi.mock('../../diary/DiaryDetailModal', () => ({
  default: () => null,
}));

vi.mock('../../diary/DiaryStoryModal', () => ({
  default: ({
    onCommentViewToggle,
  }: {
    onCommentViewToggle?: (isOpen: boolean) => void;
  }) => (
    <div data-testid="diary-story-modal">
      <button
        data-testid="open-detail-comment"
        onClick={() => onCommentViewToggle?.(true)}
      >
        open detail comment
      </button>
      <button
        data-testid="close-detail-comment"
        onClick={() => onCommentViewToggle?.(false)}
      >
        close detail comment
      </button>
    </div>
  ),
}));

vi.mock('../../diary/StoryCommentModal', () => ({
  default: () => <div data-testid="story-comment-modal" />,
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
const mockGetDiaryById = vi.mocked(getDiaryById);

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
  friendStatus: FriendshipStatus.NONE,
});

const makeDiaryDetail = (id: number) => ({
  ...makeFeedItem(id),
  comments: [],
  updatedAt: '2025-10-01T00:00:00',
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
    mockViewport.isDesktop = true;
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('첫 로드 시 cursor 없이 추천순으로 요청한다', async () => {
    mockGetFeedCursor.mockResolvedValue(makeResponse([1, 2, 3], 'cursor-1', true));

    render(<FeedClient />);

    await waitFor(() => {
      expect(mockGetFeedCursor).toHaveBeenCalledWith(null, 20, 'recommended');
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

  it('추천순과 최신순 서브헤더를 렌더링하고 추천순을 기본 선택한다', async () => {
    mockGetFeedCursor.mockResolvedValue(makeResponse([1, 2, 3], 'cursor-1', true));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-sort-subheader')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '추천순' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '최신순' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('정렬 변경 시 기존 목록을 초기화하고 새 정렬로 첫 페이지를 요청한다', async () => {
    mockGetFeedCursor.mockResolvedValueOnce(makeResponse([1, 2, 3], 'cursor-1', true));
    mockGetFeedCursor.mockResolvedValueOnce(makeResponse([10, 11], 'cursor-latest-1', true));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-card-1')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '최신순' }));
    });

    await waitFor(() => {
      expect(mockGetFeedCursor).toHaveBeenCalledWith(null, 20, 'latest');
    });

    await waitFor(() => {
      expect(screen.getByTestId('feed-card-10')).toBeInTheDocument();
      expect(screen.getByTestId('feed-card-11')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('feed-card-1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추천순' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '최신순' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('이미 선택된 정렬을 다시 누르면 재요청하지 않고 기존 목록을 유지한다', async () => {
    mockGetFeedCursor.mockResolvedValueOnce(makeResponse([1, 2, 3], 'cursor-1', true));
    mockGetFeedCursor.mockResolvedValueOnce(makeResponse([10, 11], 'cursor-latest-1', true));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('feed-card-1')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '최신순' }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('feed-card-10')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '최신순' })).toHaveAttribute('aria-pressed', 'true');
    });

    expect(mockGetFeedCursor).toHaveBeenCalledTimes(2);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '최신순' }));
    });

    expect(mockGetFeedCursor).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('feed-card-10')).toBeInTheDocument();
    expect(screen.getByTestId('feed-card-11')).toBeInTheDocument();
    expect(screen.queryByText('피드를 불러오는 중...')).not.toBeInTheDocument();
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

  it('일기 상세 조회 실패 시 backend detail을 alert로 보여준다', async () => {
    mockGetFeedCursor.mockResolvedValue(makeResponse([1], 'c1', true));
    mockGetDiaryById.mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/diary/not-found',
          title: 'Not Found',
          status: 404,
          detail: '존재하지 않는 일기입니다.',
          instance: '/api/diary/1',
        },
      },
    });

    const alertSpy = vi.spyOn(window, 'alert');

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('content-btn-1')).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('content-btn-1'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('존재하지 않는 일기입니다.');
    });
  });

  it('모바일에서 피드 댓글 모달은 뒤로가기 시 피드로 돌아간다', async () => {
    mockViewport.isDesktop = false;
    mockGetFeedCursor.mockResolvedValue(makeResponse([1], 'c1', true));
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('comment-btn-1')).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('comment-btn-1'));
    });

    expect(screen.getByTestId('story-comment-modal')).toBeInTheDocument();
    expect(pushStateSpy).toHaveBeenCalledWith({ modal: 'feed-comment' }, '');

    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.queryByTestId('story-comment-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('feed-card-1')).toBeInTheDocument();
  });

  it('모바일에서 피드 사진 상세 모달은 뒤로가기 시 피드로 돌아간다', async () => {
    mockViewport.isDesktop = false;
    mockGetFeedCursor.mockResolvedValue(makeResponse([1], 'c1', true));
    mockGetDiaryById.mockResolvedValue(makeDiaryDetail(1));
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('content-btn-1')).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('content-btn-1'));
    });

    expect(await screen.findByTestId('diary-story-modal')).toBeInTheDocument();
    expect(pushStateSpy).toHaveBeenCalledWith({ modal: 'feed-diary-detail' }, '');

    fireEvent.popState(window);

    await waitFor(() => {
      expect(screen.queryByTestId('diary-story-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('feed-card-1')).toBeInTheDocument();
  });

  it('모바일에서 상세 댓글을 수동으로 닫은 뒤 뒤로가기하면 상세 모달을 유지한다', async () => {
    mockViewport.isDesktop = false;
    mockGetFeedCursor.mockResolvedValue(makeResponse([1], 'c1', true));
    mockGetDiaryById.mockResolvedValue(makeDiaryDetail(1));

    render(<FeedClient />);

    await waitFor(() => {
      expect(screen.getByTestId('content-btn-1')).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('content-btn-1'));
    });

    expect(await screen.findByTestId('diary-story-modal')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('open-detail-comment'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('close-detail-comment'));
    });

    fireEvent.popState(window, { state: { modal: 'feed-diary-detail' } });

    expect(screen.getByTestId('diary-story-modal')).toBeInTheDocument();
  });
});
