'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
      <div
        role="status"
        className="flex h-screen items-center justify-center"
      >
        <Loader2
          aria-hidden="true"
          className="h-8 w-8 text-gray-400 motion-safe:animate-spin dark:text-gray-500"
        />
        <span className="sr-only">인증 상태를 확인하는 중입니다…</span>
      </div>
    );
  }

  if (authStatus === 'anonymous') {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
