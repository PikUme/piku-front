import { FeedDiary, CursorPage } from '@/types/diary';
import api from './api';

export const getFeedCursor = async (
  cursor?: string | null,
  limit = 20,
): Promise<CursorPage<FeedDiary>> => {
  const params: Record<string, unknown> = { limit };
  if (cursor != null) {
    params.cursor = cursor;
  }
  const response = await api.get<CursorPage<FeedDiary>>('/diary', { params });
  return response.data;
};
