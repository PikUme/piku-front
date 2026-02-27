import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없어요',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <Image
        src="/404.png"
        alt="404 - 페이지를 찾을 수 없어요"
        width={480}
        height={320}
        priority
        className="w-full max-w-md"
      />
    </div>
  );
}
