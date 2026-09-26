'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import UserProfile from '@/components/common/UserProfile';
import { Friend } from '@/types/friend';
import { deleteFriend, getFriends } from '@/lib/api/friend';
import FriendActionConfirmModal from '@/components/feed/FriendActionConfirmModal';
import FriendListSkeleton from '@/components/friends/FriendListSkeleton';

const PAGE_SIZE = 20;

const FriendList = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [hasNext, setHasNext] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const requestState = useRef({
    page: 0,
    hasNext: true,
    inFlight: false,
    active: false,
    failed: false,
  });
  
  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const fetchFriends = useCallback(async () => {
    const state = requestState.current;
    if (!state.active || state.inFlight || !state.hasNext) return;
    state.inFlight = true;
    state.failed = false;
    const pageNum = state.page;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFriends(pageNum, PAGE_SIZE);
      if (!state.active) return;
      setFriends(prevFriends => {
        const combined = pageNum === 0 ? [] : [...prevFriends];
        const ids = new Set(combined.map(friend => friend.userId));
        for (const friend of data.friends) {
          if (ids.has(friend.userId)) continue;
          ids.add(friend.userId);
          combined.push(friend);
        }
        return combined;
      });
      state.page = pageNum + 1;
      state.hasNext = data.hasNext;
      setHasNext(data.hasNext);
    } catch (error) {
      if (!state.active) return;
      state.failed = true;
      setError('친구 목록을 불러오지 못했습니다.');
      console.error('친구 목록을 불러오는데 실패했습니다:', error);
    } finally {
      state.inFlight = false;
      if (state.active) {
        setIsLoading(false);
        setInitialLoad(true);
      }
    }
  }, []);

  const lastFriendElementRef = useCallback(
    (node: HTMLLIElement | null) => {
      observer.current?.disconnect();
      if (!node || isLoading || !hasNext || error) return;
      observer.current = new IntersectionObserver(entries => {
        if (entries[0]?.isIntersecting && !requestState.current.failed) {
          void fetchFriends();
        }
      });
      observer.current.observe(node);
    },
    [fetchFriends, isLoading, hasNext, error],
  );

  useEffect(() => {
    const state = requestState.current;
    state.active = true;
    void fetchFriends();
    return () => {
      state.active = false;
      observer.current?.disconnect();
    };
  }, [fetchFriends]);

  const handleDeleteFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    setIsModalOpen(true);
  };

  const handleConfirmDeleteFriend = async () => {
    if (!selectedFriend) return;
    
    setIsActionLoading(true);
    try {
      await deleteFriend(selectedFriend.userId);
      setFriends(prevFriends => prevFriends.filter(friend => friend.userId !== selectedFriend.userId));
      setIsModalOpen(false);
      setSelectedFriend(null);
    } catch (error) {
      console.error("친구 삭제에 실패했습니다:", error);
      alert("친구 삭제에 실패했습니다.");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading && !initialLoad) {
    return <FriendListSkeleton count={5} />;
  }

  if (initialLoad && friends.length === 0 && !isLoading && !error) {
    return (
      <div className="text-center text-gray-500 py-10">
        친구 목록이 비었습니다.
      </div>
    );
  }

  return (
    <>
      <ul>
        {friends.map((friend, index) => {
          const isLastElement = friends.length === index + 1;
          return (
            <li
              ref={isLastElement ? lastFriendElementRef : null}
              key={friend.userId}
              className="flex items-center justify-between py-3 border-b"
            >
              <div className="flex items-center">
                <UserProfile
                  userId={friend.userId}
                  nickname={friend.nickname}
                  avatar={friend.avatar}
                  imageSize={40}
                  containerClassName="flex-grow"
                />
              </div>
              <button
                onClick={() => handleDeleteFriend(friend)}
                className="border rounded-md px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                친구 끊기
              </button>
            </li>
          );
        })}
      </ul>
      {isLoading && <FriendListSkeleton count={1} />}
      {error && (
        <div className="py-4 text-center" role="alert">
          <p>{error}</p>
          <button
            onClick={() => void fetchFriends()}
            className="mt-2 underline cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 친구 끊기 확인 모달 */}
      <FriendActionConfirmModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFriend(null);
        }}
        onConfirm={handleConfirmDeleteFriend}
        actionType="unfriend"
        nickname={selectedFriend?.nickname || ''}
        avatar={selectedFriend?.avatar || '/default-avatar.png'}
        isLoading={isActionLoading}
      />
    </>
  );
};

export default FriendList;
