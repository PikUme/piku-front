import { FeedDiary, CursorPage } from '@/types/diary';
import api from './api';

export type FeedSortMode = 'recommended' | 'latest';

export const getFeedCursor = async (
  cursor?: string | null,
  limit = 20,
  sort: FeedSortMode = 'recommended',
): Promise<CursorPage<FeedDiary>> => {
  const params: Record<string, unknown> = { limit };
  if (cursor != null) {
    params.cursor = cursor;
  }
  if (sort !== 'recommended') {
    params.sort = sort;
  }
  const response = await api.get<CursorPage<FeedDiary>>('/diary', { params });
  return response.data;
};
