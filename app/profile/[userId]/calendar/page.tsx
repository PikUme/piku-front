import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import CalendarClient from '@/components/profile/CalendarClient';
import { isValidDate } from '@/lib/utils/date';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: '프로필 캘린더 - PikUme',
  description: '사용자의 감정 캘린더를 월별로 확인하세요',
};

const CalendarPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<{
    date?: string | string[];
  }>;
}) => {
  const { userId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const dateParam = resolvedSearchParams?.date;

  if (Array.isArray(dateParam) || (dateParam && !isValidDate(dateParam))) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      }
    >
      <CalendarClient userId={userId} />
    </Suspense>
  );
};

export default CalendarPage;
