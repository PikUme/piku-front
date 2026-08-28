'use client';

import {
  Compass,
  Ellipsis,
  HelpCircle,
  Home,
  LogOut,
  Search,
  Settings,
  User,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/api/auth';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import InquiryModal from './InquiryModal';

const BottomNav = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const hasModalHistoryEntryRef = useRef(false);
  const pathname = usePathname();
  useBodyScrollLock(isModalOpen);

  const handleLogout = async () => {
    await logout();
  };

  const openMoreMenu = () => {
    setIsModalOpen(true);
  };

  const openInquiryModal = () => {
    setIsInquiryModalOpen(true);
    setIsModalOpen(false);
  };

  const closeModalSurface = () => {
    if (hasModalHistoryEntryRef.current) {
      hasModalHistoryEntryRef.current = false;
      window.history.back();
    }
    setIsModalOpen(false);
    setIsInquiryModalOpen(false);
  };

  useEffect(() => {
    const isAnyModalOpen = isModalOpen || isInquiryModalOpen;

    if (!isAnyModalOpen || hasModalHistoryEntryRef.current) {
      return;
    }

    window.history.pushState({ modal: 'bottom-nav-menu' }, '');
    hasModalHistoryEntryRef.current = true;
  }, [isModalOpen, isInquiryModalOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (!hasModalHistoryEntryRef.current) {
        return;
      }

      hasModalHistoryEntryRef.current = false;
      setIsModalOpen(false);
      setIsInquiryModalOpen(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const isPathActive = (path: string, exact = true) =>
    exact ? pathname === path : pathname.startsWith(path);

  const getIconClass = (active: boolean) =>
    `flex h-11 w-11 items-center justify-center justify-self-center transition-colors ${
      active
        ? 'text-orange-500 dark:text-orange-400'
        : 'text-gray-400 dark:text-gray-500'
    }`;

  const isMoreActive =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/friends');

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
      `}</style>
      <footer className="fixed inset-x-0 bottom-0 z-20 h-[calc(84px_+_env(safe-area-inset-bottom))] xl:hidden">
        <div
          data-testid="bottom-nav-surface"
          aria-hidden="true"
          className="absolute inset-0 drop-shadow-[0_-4px_7px_rgba(0,0,0,0.17)] dark:drop-shadow-[0_-4px_7px_rgba(148,163,184,0.12)]"
        >
          <div
            data-testid="bottom-nav-surface-left"
            className="absolute bottom-0 left-0 top-[35px] w-[calc(50%_-_48px)] border-t border-black bg-white dark:border-gray-700 dark:bg-black"
          />
          <div
            data-testid="bottom-nav-surface-right"
            className="absolute bottom-0 right-0 top-[35px] w-[calc(50%_-_48px)] border-t border-black bg-white dark:border-gray-700 dark:bg-black"
          />
          <div className="absolute inset-x-0 bottom-0 top-[83px] bg-white dark:bg-black" />
          <svg
            data-testid="bottom-nav-curve"
            viewBox="0 0 96 84"
            className="absolute left-1/2 top-0 h-[84px] w-[96px] -translate-x-1/2 text-white dark:text-black"
          >
            <path
              fill="currentColor"
              d="M0 35 C4 35 8.2 33.9 9.59 41.77 C12.88 60.4 29.07 74 48 74 C66.93 74 83.12 60.4 86.41 41.77 C87.8 33.9 92 35 96 35 V84 H0 Z"
            />
            <path
              data-testid="bottom-nav-outline"
              fill="none"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="stroke-black dark:stroke-gray-700"
              d="M0 35 C4 35 8.2 33.9 9.59 41.77 C12.88 60.4 29.07 74 48 74 C66.93 74 83.12 60.4 86.41 41.77 C87.8 33.9 92 35 96 35"
            />
          </svg>
        </div>
        <nav aria-label="모바일 하단 네비게이션" className="contents">
          <div className="absolute left-0 top-[37.5px] grid h-11 w-[calc(50%_-_48px)] grid-cols-[25px_25px] justify-evenly">
            <Link
              href="/"
              aria-label="홈"
              aria-current={isPathActive('/') ? 'page' : undefined}
              className={getIconClass(isPathActive('/'))}
            >
              <Home className="h-[25px] w-[25px]" />
            </Link>
            <Link
              href="/feed"
              aria-label="피드"
              aria-current={isPathActive('/feed') ? 'page' : undefined}
              className={getIconClass(isPathActive('/feed'))}
            >
              <Compass className="h-[25px] w-[25px]" />
            </Link>
          </div>

          <Link
            href={`/diary/new/${todayDate}`}
            aria-label="오늘의 일기"
            aria-current={isPathActive('/diary/new', false) ? 'page' : undefined}
            className="absolute left-1/2 top-[6px] z-10 h-[58px] w-[58px] -translate-x-1/2 overflow-hidden rounded-full shadow-[0_6px_12px_rgba(69,43,20,0.18)]"
          >
            <Image
              src="/fox-navi.png"
              alt=""
              fill
              sizes="58px"
              className="scale-[1.26] object-cover"
            />
          </Link>

          <div className="absolute right-0 top-[37.5px] grid h-11 w-[calc(50%_-_48px)] grid-cols-[25px_25px] justify-evenly">
            <Link
              href="/search"
              aria-label="검색"
              aria-current={isPathActive('/search') ? 'page' : undefined}
              className={getIconClass(isPathActive('/search'))}
            >
              <Search className="h-[25px] w-[25px]" />
            </Link>
            <button
              type="button"
              aria-label="더보기"
              aria-expanded={isModalOpen}
              onClick={openMoreMenu}
              className={`${getIconClass(isMoreActive)} cursor-pointer`}
            >
              <Ellipsis className="h-[25px] w-[25px]" />
            </button>
          </div>
        </nav>
      </footer>
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeModalSurface}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-4 shadow-lg animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <nav className="flex flex-col space-y-2">
              <Link
                href="/profile"
                onClick={() => setIsModalOpen(false)}
                className="flex items-center p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <User className="w-6 h-6 mr-4" />
                <span>프로필</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsModalOpen(false)}
                className="flex items-center p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Settings className="w-6 h-6 mr-4" />
                <span>설정</span>
              </Link>
              <button
                onClick={openInquiryModal}
                className="flex items-center p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left w-full"
              >
                <HelpCircle className="w-6 h-6 mr-4" />
                <span>피드백</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center p-3 text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left w-full"
              >
                <LogOut className="w-6 h-6 mr-4" />
                <span>로그아웃</span>
              </button>
            </nav>
          </div>
        </div>
      )}
      {isInquiryModalOpen && <InquiryModal onClose={closeModalSurface} />}
    </>
  );
};

export default BottomNav;
