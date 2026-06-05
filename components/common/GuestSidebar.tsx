'use client';

import {
  Compass,
  Search,
  User
} from 'lucide-react';
import Link from 'next/link';

const GuestSidebar = () => {
  return (
    <aside className="hidden xl:flex flex-col border-r border-gray-300 dark:border-gray-700 fixed h-full bg-white w-64 transition-all duration-300">
      <div className="px-4 py-8">
        <Link
          href="/"
          className="flex items-center justify-start"
        >
          <h1 className="text-2xl font-semibold font-serif">
            PikUme
          </h1>
        </Link>
      </div>
      <nav className="flex flex-col px-2">
        <Link
          href="/"
          className="flex items-center p-4 rounded-lg hover:bg-gray-100 justify-start"
        >
          <Compass className="w-6 h-6 mr-4" />
          <span className="inline">홈</span>
        </Link>
        <Link
          href="/search"
          className="flex items-center p-4 rounded-lg hover:bg-gray-100 justify-start"
        >
          <Search className="w-6 h-6 mr-4" />
          <span className="inline">검색</span>
        </Link>
        <Link
          href="/login"
          className="flex items-center p-4 rounded-lg cursor-pointer hover:bg-gray-100 justify-start"
        >
          <User className="w-6 h-6 mr-4" />
          <span className="inline">로그인</span>
        </Link>
      </nav>
    </aside>
  );
};

export default GuestSidebar;
