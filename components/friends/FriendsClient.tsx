'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import FriendList from './FriendList';
import FriendRequestList from './FriendRequestList';
import {
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from '@/lib/api/friend';
import { FriendRequest } from '@/types/friend';

type FriendsTab = 'friends' | 'requests';

const getTabFromSearchParams = (searchParams: URLSearchParams): FriendsTab => (
  searchParams.get('tab') === 'requests' ? 'requests' : 'friends'
);

const FriendsClient = () => {
  const searchParams = useSearchParams();
  const tabFromSearchParams = getTabFromSearchParams(searchParams);
  const [activeTab, setActiveTab] = useState<FriendsTab>(tabFromSearchParams);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [requestsHasMore, setRequestsHasMore] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [totalRequests, setTotalRequests] = useState(0);
  const observer = useRef<IntersectionObserver | null>(null);
  const requestState = useRef({
    page: 0,
    hasMore: true,
    inFlight: false,
    active: false,
    failed: false,
  });

  const loadMoreRequests = useCallback(async () => {
    const state = requestState.current;
    if (!state.active || state.inFlight || !state.hasMore) return;
    state.inFlight = true;
    state.failed = false;
    const page = state.page;
    setRequestsLoading(true);
    setRequestsError(null);

    try {
      const data = await getFriendRequests(page, 10);
      if (!state.active) return;
      setRequests(prev => {
        const existingUserIds = new Set(prev.map(req => req.userId));
        const newRequests = data.requests.filter(req => {
          if (existingUserIds.has(req.userId)) return false;
          existingUserIds.add(req.userId);
          return true;
        });
        return [...prev, ...newRequests];
      });
      state.hasMore = data.hasNext;
      state.page = page + 1;
      setRequestsHasMore(data.hasNext);
      setTotalRequests(data.totalElements);
    } catch (error) {
      if (!state.active) return;
      state.failed = true;
      setRequestsError('친구 요청 목록을 불러오지 못했습니다.');
      console.error('친구 요청 목록을 불러오는데 실패했습니다:', error);
    } finally {
      state.inFlight = false;
      if (state.active) setRequestsLoading(false);
    }
  }, []);

  const lastRequestElementRef = useCallback(
    (node: HTMLLIElement | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (!node || requestsLoading || !requestsHasMore || requestsError) return;

      const nextObserver = new IntersectionObserver(entries => {
        if (
          observer.current === nextObserver &&
          entries[0]?.isIntersecting &&
          !requestState.current.failed
        ) {
          void loadMoreRequests();
        }
      });

      observer.current = nextObserver;
      nextObserver.observe(node);
    },
    [requestsLoading, requestsHasMore, requestsError, loadMoreRequests],
  );

  useEffect(() => {
    const state = requestState.current;
    state.active = true;
    void loadMoreRequests();
    return () => {
      state.active = false;
      observer.current?.disconnect();
    };
  }, [loadMoreRequests]);

  useEffect(() => {
    setActiveTab(tabFromSearchParams);
  }, [tabFromSearchParams]);

  const handleAccept = async (userId: string) => {
    await acceptFriendRequest(userId);
    setRequests(currentRequests =>
      currentRequests.filter(req => req.userId !== userId),
    );
    setTotalRequests(prev => prev - 1);
  };

  const handleReject = async (userId: string) => {
    await rejectFriendRequest(userId);
    setRequests(currentRequests =>
      currentRequests.filter(req => req.userId !== userId),
    );
    setTotalRequests(prev => prev - 1);
  };

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col flex-grow">
        <h1 className="text-2xl font-bold mb-6">친구</h1>
        <div className="flex border-b mb-6">
          <button
            className={`py-2 px-4 text-lg font-semibold transition-colors duration-300 rounded-t-md cursor-pointer ${
              activeTab === 'friends'
                ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('friends')}
          >
            친구 목록
          </button>
          <button
            className={`py-2 px-4 text-lg font-semibold relative transition-colors duration-300 rounded-t-md cursor-pointer ${
              activeTab === 'requests'
                ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('requests')}
          >
            친구 요청
            {totalRequests > 0 && (
              <span className="absolute top-1 right-0 transform translate-x-1/2 -translate-y-1/2">
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {totalRequests}
                </span>
              </span>
            )}
          </button>
        </div>

        <div>
          {activeTab === 'friends' ? (
            <FriendList />
          ) : requests.length === 0 && (requestsLoading || requestsError) ? null : (
            <FriendRequestList
              requests={requests}
              onAccept={handleAccept}
              onReject={handleReject}
              lastRequestElementRef={lastRequestElementRef}
            />
          )}
          {requestsLoading && (
            <div className="text-center p-4">
              <p>요청 목록을 불러오는 중...</p>
            </div>
          )}
          {requestsError && (
            <div className="py-4 text-center" role="alert">
              <p>{requestsError}</p>
              <button
                onClick={() => void loadMoreRequests()}
                className="mt-2 underline cursor-pointer"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsClient; 
