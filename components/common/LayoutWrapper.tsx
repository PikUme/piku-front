'use client';

import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/common/Sidebar';
import BottomNav from '@/components/common/BottomNav';
import GuestSidebar from '@/components/common/GuestSidebar';
import GuestBottomNav from '@/components/common/GuestBottomNav';
import PWAInstallPrompt from '@/components/common/PWAInstallPrompt';
import MobileHeader from '@/components/common/MobileHeader';
import useAuthStore from '../store/authStore';
import { useEffect, useState } from 'react';
import FCMInitializer from './FCMInitializer';
import SSEInitializer from './SSEInitializer';

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, checkAuth } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const hideNavOnPaths = ['/signup', '/password-reset', '/password-reset/verify'];

  useEffect(() => {
    checkAuth();
    setIsClient(true);
  }, [checkAuth]);

  useEffect(() => {
    if (isClient && isLoggedIn && hideNavOnPaths.includes(pathname)) {
      router.replace('/');
    }
  }, [isClient, isLoggedIn, pathname, router]);

  // SSR 및 크롤러를 위한 기본 레이아웃 제공
  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="w-full min-h-screen transition-all duration-300">
          {children}
        </main>
      </div>
    );
  }

  const shouldHideNav = hideNavOnPaths.includes(pathname);

  if (isLoggedIn && hideNavOnPaths.includes(pathname)) {
    return null; // 리다이렉트 중에는 아무것도 렌더링하지 않음
  }

  if (shouldHideNav) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  return (
    <>
      <style jsx global>{`
        .layout-container {
          height: 100vh;
          height: 100dvh; /* iOS Safari를 위한 동적 뷰포트 높이 */
        }
        
        .main-content-wrapper {
          padding-bottom: calc(3.5rem + env(safe-area-inset-bottom));
        }
        
        @media (min-width: 1280px) {
          .main-content-wrapper {
            padding-bottom: 0;
          }
        }
      `}</style>
      <div className="flex flex-col overflow-hidden layout-container">
        {isLoggedIn && <FCMInitializer />}
        {isLoggedIn && <SSEInitializer />}
        <MobileHeader />
        <div className="flex flex-1 overflow-hidden pt-14 xl:pt-0 main-content-wrapper">
          {isLoggedIn ? <Sidebar /> : <GuestSidebar />}
          <main className="w-full flex-1 xl:ml-64 transition-all duration-300 md:grid md:grid-cols-8 md:gap-4 overflow-hidden">
            <div className="md:col-span-4 md:col-start-3 h-full overflow-hidden">{children}</div>
          </main>
        </div>
        {isLoggedIn ? <BottomNav /> : <GuestBottomNav />}
        <PWAInstallPrompt />
      </div>
    </>
  );
};

export default LayoutWrapper; 