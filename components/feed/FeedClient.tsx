'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import FeedCard from './FeedCard';
import { getFeed } from '@/lib/api/feed';
import { getDiaryById } from '@/lib/api/diary';
import { FeedDiary, DiaryDetail } from '@/types/diary';
import { FriendshipStatus } from '@/types/friend';
import DiaryDetailModal from '../diary/DiaryDetailModal';
import DiaryStoryModal from '../diary/DiaryStoryModal';
import StoryCommentModal from '../diary/StoryCommentModal';

const FeedClient = () => {
  const [feed, setFeed] = useState<FeedDiary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
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

  // StoryCommentModal이 열렸을 때 배경 스크롤 방지
  useEffect(() => {
    if (commentModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      // selectedDiary가 있을 때는 스크롤을 막아야 하므로 조건 확인
      if (!selectedDiary || isCommentViewOpen) {
        document.body.style.overflow = 'auto';
      }
    }

    return () => {
      // 컴포넌트 언마운트 시에만 auto로 복원
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
      } catch (error) {
        console.error('Failed to fetch diary details', error);
        alert('일기 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingDetail(false);
      }
    }
  };

  const handleCommentClick = (post: FeedDiary) => {
    setCommentModalOpen({ 
      diaryId: post.diaryId, 
      commentCount: post.commentCount,
      post 
    });
  };

  const handleCloseCommentModal = () => {
    setCommentModalOpen(null);
  };

  const handleUpdateCommentCount = (count: number) => {
    if (commentModalOpen) {
      // 피드에서 해당 일기의 댓글 수 업데이트
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
    // 함수 시작점에서 즉시 체크하여 레이스 컨디션 방지
    if (loading || !hasMore) {
      return;
    }
    setLoading(true);
    try {
      const pageData = await getFeed(page, 10);
      setFeed(prevFeed => {
        const existingIds = new Set(prevFeed.map(p => p.diaryId));
        const uniqueNewPosts = pageData.content.filter(
          p => !existingIds.has(p.diaryId),
        );
        return [...prevFeed, ...uniqueNewPosts];
      });
      setHasMore(!pageData.last);
      setPage(prevPage => prevPage + 1);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]); // page를 의존성에 명시적으로 추가

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

  // 최초 로딩을 위한 useEffect - 중복 요청 방지
  useEffect(() => {
    if (!hasMounted.current && !initialized && !loading) {
      hasMounted.current = true;
      setInitialized(true);
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, loading]);

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

  // 초기 로딩 화면
  if (page === 0 && loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>피드를 불러오는 중...</p>
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
      {!hasMore && feed.length > 0 && (
        <div className="py-8 text-center text-gray-500">
          <p>모든 피드를 다 봤어요!</p>
        </div>
      )}
      {selectedDiary &&
        (isDesktop ? (
          <DiaryDetailModal diary={selectedDiary} onClose={handleCloseModal} />
        ) : (
          <DiaryStoryModal
            diary={selectedDiary}
            onClose={handleCloseModal}
            onCommentViewToggle={setIsCommentViewOpen}
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