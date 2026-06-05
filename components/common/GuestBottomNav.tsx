'use client';

import {
  Compass,
  Search,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const GuestBottomNav = () => {
  const [isPWAiOS, setIsPWAiOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // iOS 기기 감지
    const detectiOS = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return /ipad|iphone|ipod/.test(userAgent);
    };

    // PWA 환경 감지
    const detectPWA = () => {
      // PWA가 standalone 모드로 실행 중인지 확인
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // iOS Safari에서 홈 스크린에 추가된 PWA인지 확인 (iOS 전용)
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      return isStandalone || isIOSStandalone;
    };

    // PWA를 사용하는 iOS 기기인지 확인
    const detectPWAiOS = () => {
      return detectiOS() && detectPWA();
    };

    // 모바일 환경 감지
    const detectMobile = () => {
      return window.innerWidth <= 768 && 'ontouchstart' in window;
    };

    setIsPWAiOS(detectPWAiOS());

    setIsMobile(detectMobile());

    // 화면 크기 변경 감지
    const handleResize = () => {
      setIsMobile(detectMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getLinkClass = (path: string, exact = true) => {
    const isActive = exact ? pathname === path : pathname.startsWith(path);
    const baseClass = `flex flex-col items-center justify-center text-sm ${
      isActive ? '' : 'text-gray-400'
    }`;
    
    // PWA를 사용하는 iOS 모바일에서 크기 증가
    if (isPWAiOS && isMobile) {
      return `${baseClass} w-20 py-2`;
    }
    
    return `${baseClass} w-16`;
  };

  // PWA를 사용하는 iOS 모바일에서 BottomNav 스타일 조정
  const getBottomNavClass = () => {
    let baseClass = "flex justify-around items-center border-t xl:hidden bg-white dark:bg-black fixed bottom-0 left-0 right-0 z-20";
    
    if (isPWAiOS && isMobile) {
      // PWA를 사용하는 iOS에서 크기 증가 및 safe area 고려
      return `${baseClass} px-4 pt-[0.9rem] min-h-[80px]`;
    }
    return `${baseClass} px-2 pt-[0.9rem]`;
  };

  // PWA를 사용하는 iOS 모바일에서 아이콘 크기 조정
  const getIconSize = () => {
    if (isPWAiOS && isMobile) {
      return "w-7 h-7";
    }
    return "w-6 h-6";
  };

  return (
    <>
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
        .bottom-nav {
          padding-bottom: calc(0.9rem + env(safe-area-inset-bottom));
        }
      `}</style>
      <footer className={`${getBottomNavClass()} bottom-nav`}>
        <Link href="/" aria-label="홈" className={getLinkClass('/')}>
          <Compass className={getIconSize()} />
        </Link>
        <Link href="/search" aria-label="검색" className={getLinkClass('/search')}>
          <Search className={getIconSize()} />
        </Link>
        <Link href="/login" aria-label="로그인" className={getLinkClass('/login')}>
          <User className={getIconSize()} />
        </Link>
      </footer>
    </>
  );
};

export default GuestBottomNav;
