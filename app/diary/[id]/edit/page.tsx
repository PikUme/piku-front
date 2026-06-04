import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RequireAuth from '@/components/auth/RequireAuth';
import DiaryEditForm from '@/components/diary/DiaryEditForm';

export const metadata: Metadata = {
  title: '일기 수정 - PikUme',
  description: '작성한 일기를 수정하세요',
};

const DiaryEditPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const diaryId = Number(id);

  if (isNaN(diaryId)) {
    notFound();
  }

  return (
    <RequireAuth>
      <DiaryEditForm diaryId={diaryId} />
    </RequireAuth>
  );
};

export default DiaryEditPage;
