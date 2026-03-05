import DiaryDetailClient from '@/components/diary/DiaryDetailClient';
import { notFound } from 'next/navigation';

const DiaryDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const diaryId = Number(id);

  if (isNaN(diaryId)) {
    notFound();
  }

  return <DiaryDetailClient diaryId={diaryId} />;
};

export default DiaryDetailPage; 