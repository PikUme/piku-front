'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { searchUsers } from '@/lib/api/search';
import { Friend } from '@/types/friend';

const SearchClient = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Friend[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const requestState = useRef({
    query: '',
    page: 0,
    hasNext: false,
    inFlight: false,
    active: false,
    failed: false,
  });

  const loadNextPage = useCallback(async () => {
    const state = requestState.current;
    if (!state.active || state.inFlight || !state.hasNext) return;
    state.inFlight = true;
    state.failed = false;
    const page = state.page;
    setLoading(true);
    setError(null);

    try {
      const data = await searchUsers(state.query, page);
      if (!state.active) return;
      setResults(previous => {
        const combined = page === 0 ? [] : [...previous];
        const ids = new Set(combined.map(user => user.userId));
        for (const user of data.content) {
          if (ids.has(user.userId)) continue;
          ids.add(user.userId);
          combined.push(user);
        }
        return combined;
      });
      state.page = page + 1;
      state.hasNext = !data.last;
      setHasNext(!data.last);
    } catch (error) {
      if (!state.active) return;
      state.failed = true;
      setError('검색 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      state.inFlight = false;
      if (state.active) setLoading(false);
    }
  }, []);

  const lastElementRef = useCallback(
    (node: HTMLLIElement | null) => {
      observer.current?.disconnect();
      if (!node || loading || !hasNext || error) return;
      const state = requestState.current;
      observer.current = new IntersectionObserver(entries => {
        if (entries[0]?.isIntersecting && state.active && !state.failed) {
          void loadNextPage();
        }
      });
      observer.current.observe(node);
    },
    [loading, hasNext, error, loadNextPage],
  );

  useEffect(() => {
    const state = {
      query,
      page: 0,
      hasNext: !!query.trim(),
      inFlight: false,
      active: true,
      failed: false,
    };
    requestState.current = state;
    setResults([]);
    setHasNext(false);
    setLoading(!!query.trim());
    setError(null);
    const timer = state.hasNext
      ? setTimeout(() => void loadNextPage(), 500)
      : undefined;
    return () => {
      state.active = false;
      clearTimeout(timer);
      observer.current?.disconnect();
    };
  }, [query, loadNextPage]);

  return (
    <div className="max-w-xl mx-auto p-4">
      <input
        type="text"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setQuery(e.target.value)
        }
        placeholder="닉네임을 입력하세요..."
        className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
      />

      {error && (
        <div className="text-center mt-4" role="alert">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => void loadNextPage()}
            className="mt-2 underline cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="text-center mt-4 text-gray-500">
          {query.trim() ? '검색 결과가 없습니다.' : '검색어를 입력해주세요.'}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {results.map((user, index) => {
          const isLastElement = index === results.length - 1;
          return (
            <li
              key={user.userId}
              ref={isLastElement ? lastElementRef : null}
            >
              <Link
                href={`/profile/${user.userId}`}
                className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Image
                  src={user.avatar || '/default-avatar.png'}
                  alt={`${user.nickname}'s avatar`}
                  width={40}
                  height={40}
                  className="rounded-full mr-3"
                />
                <span>{user.nickname}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      
      {loading && <p className="text-center mt-4">불러오는 중...</p>}
    </div>
  );
};

export default SearchClient;
