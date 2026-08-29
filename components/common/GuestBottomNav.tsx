'use client';

import { Compass, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BottomNavSurface from './BottomNavSurface';

const GuestBottomNav = () => {
  const pathname = usePathname();

  const isPathActive = (path: string) => pathname === path;

  const getIconClass = (active: boolean) =>
    `flex h-11 w-11 touch-manipulation items-center justify-center justify-self-center rounded-full transition-colors hover:text-orange-500 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:hover:text-orange-400 dark:focus-visible:ring-orange-300 dark:focus-visible:ring-offset-black ${
      active
        ? 'text-orange-500 dark:text-orange-400'
        : 'text-gray-400 dark:text-gray-500'
    }`;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 h-[calc(84px_+_env(safe-area-inset-bottom))] xl:hidden">
      <BottomNavSurface testIdPrefix="guest-bottom-nav" />

      <nav aria-label="모바일 게스트 하단 네비게이션" className="contents">
        <div className="absolute left-0 top-[37.5px] grid h-11 w-[calc(50%_-_48px)] grid-cols-[25px] justify-evenly">
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
          href="/login"
          aria-label="로그인"
          aria-current={isPathActive('/login') ? 'page' : undefined}
          className="absolute left-1/2 top-[6px] z-10 h-[58px] w-[58px] -translate-x-1/2 touch-manipulation overflow-hidden rounded-full shadow-[0_6px_12px_rgba(69,43,20,0.18)] transition-opacity hover:opacity-95 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-orange-300 dark:focus-visible:ring-offset-black"
        >
          <Image
            src="/bottom-nav/fox.webp"
            alt=""
            fill
            sizes="58px"
            className="scale-[1.26] object-cover"
          />
        </Link>

        <div className="absolute right-0 top-[37.5px] grid h-11 w-[calc(50%_-_48px)] grid-cols-[25px] justify-evenly">
          <Link
            href="/search"
            aria-label="검색"
            aria-current={isPathActive('/search') ? 'page' : undefined}
            className={getIconClass(isPathActive('/search'))}
          >
            <Search className="h-[25px] w-[25px]" />
          </Link>
        </div>
      </nav>
    </footer>
  );
};

export default GuestBottomNav;
