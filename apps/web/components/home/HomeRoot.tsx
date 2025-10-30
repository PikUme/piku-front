'use client';

import { useEffect, useState } from 'react';
import useAuthStore from '@/components/store/authStore';
import HomeCalendar from '@/components/home/HomeCalendar';
import FeedClient from '@/components/feed/FeedClient';
import { AUTH_TOKEN_KEY } from '@/lib/constants';

export default function HomeRoot() {
  const { user } = useAuthStore();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    setIsLoggedIn(!!token && !!user);
  }, [user]);

  // SSR 시 로딩 상태만 보여주고 클라이언트에서 실제 컴포넌트 렌더링
  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>피드를 불러오는 중...</p>
      </div>
    );
  }

  return isLoggedIn ? <HomeCalendar /> : <FeedClient />;
}
