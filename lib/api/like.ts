import api from './api';

interface LikeRawResponse {
  diaryId: number;
  likeCount: number;
  liked: boolean;
}

export interface LikeResponse {
  diaryId: number;
  likeCount: number;
  isLiked: boolean;
}

const toLikeResponse = (raw: LikeRawResponse): LikeResponse => ({
  diaryId: raw.diaryId,
  likeCount: raw.likeCount,
  isLiked: raw.liked,
});

export const addLike = async (diaryId: number): Promise<LikeResponse> => {
  const response = await api.post<LikeRawResponse>(`/likes/diary/${diaryId}`);
  return toLikeResponse(response.data);
};

export const removeLike = async (diaryId: number): Promise<LikeResponse> => {
  const response = await api.delete<LikeRawResponse>(`/likes/diary/${diaryId}`);
  return toLikeResponse(response.data);
};
