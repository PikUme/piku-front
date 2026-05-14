'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/components/store/authStore';

interface RequireAuthProps {
  children: ReactNode;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const router = useRouter();
  const { authStatus } = useAuthStore();

  useEffect(() => {
    if (authStatus === 'anonymous') {
      router.replace('/login');
    }
  }, [authStatus, router]);

  if (authStatus === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        인증 상태를 확인하는 중입니다...
      </div>
    );
  }

  if (authStatus === 'anonymous') {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
