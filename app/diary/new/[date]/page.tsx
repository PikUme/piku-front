import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RequireAuth from '@/components/auth/RequireAuth';
import DiaryCreateForm from '@/components/diary/DiaryCreateForm';
import { isValidDate } from '@/lib/utils/date';

export const metadata: Metadata = {
  title: '새 일기 작성 - PikUme',
  description: '오늘의 감정을 기록해보세요',
};

const DiaryCreatePage = async ({ params }: { params: Promise<{ date: string }> }) => {
  const { date } = await params;

  if (!isValidDate(date)) {
    notFound();
  }

  return (
    <RequireAuth>
      <DiaryCreateForm date={date} />
    </RequireAuth>
  );
};

export default DiaryCreatePage;
