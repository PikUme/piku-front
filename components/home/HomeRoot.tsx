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

  // 클라이언트에서 인증 상태를 확인한 뒤 실제 컴포넌트 렌더링
  if (!isClient) {
    return null;
  }

  return isLoggedIn ? <HomeCalendar /> : <FeedClient />;
}
