'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import FeedCard from './FeedCard';
import { getFeedCursor } from '@/lib/api/feed';
import { getDiaryById } from '@/lib/api/diary';
import { FeedDiary, DiaryDetail } from '@/types/diary';
import { FriendshipStatus } from '@/types/friend';
import DiaryDetailModal from '../diary/DiaryDetailModal';
import DiaryStoryModal from '../diary/DiaryStoryModal';
import StoryCommentModal from '../diary/StoryCommentModal';
import { addLike, removeLike } from '@/lib/api/like';
import { trackEvent, FEED_CLICK, FEED_LIKE } from '@/lib/analytics/events';
import { getApiErrorMessage } from '@/lib/utils/apiError';

const FeedClient = () => {
  const [feed, setFeed] = useState<FeedDiary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'initial' | 'next' | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const hasMounted = useRef(false);

  const [isClient, setIsClient] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCommentViewOpen, setIsCommentViewOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState<{
    diaryId: number;
    commentCount: number;
    post: FeedDiary;
  } | null>(null);
  const isDesktop = useMediaQuery({ query: '(min-width: 768px)' });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedDiary(null);
  }, []);

  const handleDeleteDiaryFromFeed = useCallback((diaryId: number) => {
    setFeed(prev => prev.filter(post => post.diaryId !== diaryId));
    setSelectedDiary(null);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (!isCommentViewOpen) {
        handleCloseModal();
      }
    };

    if (selectedDiary && !isCommentViewOpen) {
      document.body.style.overflow = 'hidden';
      window.history.pushState({ modal: 'open' }, '');
      window.addEventListener('popstate', handlePopState);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedDiary, handleCloseModal, isCommentViewOpen]);

  useEffect(() => {
    if (commentModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      if (!selectedDiary || isCommentViewOpen) {
        document.body.style.overflow = 'auto';
      }
    }

    return () => {
      if (!selectedDiary && !commentModalOpen) {
        document.body.style.overflow = 'auto';
      }
    };
  }, [commentModalOpen, selectedDiary, isCommentViewOpen]);

  const handleContentClick = async (diaryId: number) => {
    if (isClient) {
      setIsLoadingDetail(true);
      try {
        const diaryDetail = await getDiaryById(diaryId);
        setSelectedDiary(diaryDetail);
        trackEvent(FEED_CLICK, { diaryId });
      } catch (error) {
        console.error('Failed to fetch diary details', error);
        alert(getApiErrorMessage(error, '일기 정보를 불러오는데 실패했습니다.'));
      } finally {
        setIsLoadingDetail(false);
      }
    }
  };

  const handleCommentClick = (post: FeedDiary) => {
    setCommentModalOpen({
      diaryId: post.diaryId,
      commentCount: post.commentCount,
      post,
    });
  };

  const handleCloseCommentModal = () => {
    setCommentModalOpen(null);
  };

  const handleUpdateCommentCount = (count: number) => {
    if (commentModalOpen) {
      setFeed(prevFeed =>
        prevFeed.map(post =>
          post.diaryId === commentModalOpen.diaryId
            ? { ...post, commentCount: count }
            : post,
        ),
      );
    }
  };

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFeedCursor(nextCursor);
      setFeed(prevFeed => {
        const existingIds = new Set(prevFeed.map(p => p.diaryId));
        const uniqueNewItems = data.items.filter(
          p => !existingIds.has(p.diaryId),
        );
        return [...prevFeed, ...uniqueNewItems];
      });
      setNextCursor(data.nextCursor);
      setHasMore(data.nextCursor != null && data.hasNext);
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError(feed.length === 0 ? 'initial' : 'next');
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, hasMore, feed.length]);

  const lastPostElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, loadMore],
  );

  useEffect(() => {
    if (!hasMounted.current && !loading) {
      hasMounted.current = true;
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLikeToggle = async (diaryId: number) => {
    const target = feed.find(p => p.diaryId === diaryId);
    if (!target) return;

    // optimistic update
    setFeed(prevFeed =>
      prevFeed.map(post =>
        post.diaryId === diaryId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1,
            }
          : post,
      ),
    );

    try {
      const response = target.isLiked
        ? await removeLike(diaryId)
        : await addLike(diaryId);
      setFeed(prevFeed =>
        prevFeed.map(post =>
          post.diaryId === diaryId
            ? { ...post, isLiked: response.isLiked, likeCount: response.likeCount }
            : post,
        ),
      );
      if (!target.isLiked) {
        trackEvent(FEED_LIKE, { diaryId });
      }
    } catch (err) {
      // rollback
      setFeed(prevFeed =>
        prevFeed.map(post =>
          post.diaryId === diaryId
            ? { ...post, isLiked: target.isLiked, likeCount: target.likeCount }
            : post,
        ),
      );
      console.error('Failed to toggle like:', err);
    }
  };

  const handleFriendshipStatusChange = (
    diaryId: number,
    newStatus: FriendshipStatus,
  ) => {
    setFeed(prevFeed =>
      prevFeed.map(post =>
        post.diaryId === diaryId
          ? { ...post, friendStatus: newStatus }
          : post,
      ),
    );
  };

  if (feed.length === 0 && loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>피드를 불러오는 중...</p>
      </div>
    );
  }

  if (error === 'initial') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-gray-500">피드를 불러오지 못했습니다.</p>
        <button
          onClick={loadMore}
          className="rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-black cursor-pointer"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[600px] space-y-8">
      {feed.map((post, index) => (
        <div
          key={post.diaryId}
          ref={index === feed.length - 1 ? lastPostElementRef : null}
        >
          <FeedCard
            post={post}
            onFriendshipStatusChange={handleFriendshipStatusChange}
            onContentClick={() => handleContentClick(post.diaryId)}
            onCommentClick={() => handleCommentClick(post)}
            onLikeToggle={handleLikeToggle}
            isMobile={!isDesktop}
          />
        </div>
      ))}
      {loading && !isLoadingDetail && (
        <div className="flex h-20 items-center justify-center">
          <p>피드를 더 불러오는 중...</p>
        </div>
      )}
      {isLoadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <p className="text-white">일기 정보를 불러오는 중...</p>
        </div>
      )}
      {error === 'next' && (
        <div className="flex h-20 items-center justify-center gap-3">
          <p className="text-gray-500">불러오기 실패</p>
          <button
            onClick={loadMore}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-black"
          >
            다시 시도
          </button>
        </div>
      )}
      {!hasMore && feed.length > 0 && (
        <div className="py-8 text-center text-gray-500">
          <p>모든 피드를 다 봤어요!</p>
        </div>
      )}
      {selectedDiary &&
        (isDesktop ? (
          <DiaryDetailModal
            diary={selectedDiary}
            onClose={handleCloseModal}
            onDelete={handleDeleteDiaryFromFeed}
          />
        ) : (
          <DiaryStoryModal
            diary={selectedDiary}
            onClose={handleCloseModal}
            onCommentViewToggle={setIsCommentViewOpen}
            onDelete={handleDeleteDiaryFromFeed}
          />
        ))}
      {commentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={handleCloseCommentModal}>
          <StoryCommentModal
            diaryId={commentModalOpen.diaryId}
            initialCommentCount={commentModalOpen.commentCount}
            onClose={handleCloseCommentModal}
            onUpdateCommentCount={handleUpdateCommentCount}
            diaryContent={{
              nickname: commentModalOpen.post.nickname,
              avatar: commentModalOpen.post.avatar,
              content: commentModalOpen.post.content,
              createdAt: commentModalOpen.post.createdAt,
              userId: commentModalOpen.post.userId,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FeedClient;
