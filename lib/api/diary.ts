import api from './api';
import type {
  CursorPage,
  DiaryDetail,
  DiaryUpdateRequest,
  DiaryUpdateResponse,
} from '@/types/diary';

interface DiaryImageInfo {
  type: 'AI_IMAGE' | 'USER_IMAGE';
  order: number;
  aiPhotoId?: number;
  photoIndex?: number;
}

interface DiaryDTO {
  status: string;
  content: string;
  imageInfos: DiaryImageInfo[];
  date: string;
}

export interface DiaryCreateRequest {
  diary: DiaryDTO;
  photos?: File[];
}

export const createDiary = async (diaryData: DiaryCreateRequest) => {
  const formData = new FormData();

  // DiaryDTO를 JSON 문자열로 변환하여 추가
  formData.append('diary', new Blob([JSON.stringify(diaryData.diary)], { type: 'application/json' }));

  // 사용자 사진 파일 추가
  if (diaryData.photos) {
    diaryData.photos.forEach(photoFile => {
      formData.append('photos', photoFile);
    });
  }

  const response = await api.post('/diary', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateDiary = async (
  diaryId: number,
  diaryData: DiaryUpdateRequest,
): Promise<DiaryUpdateResponse> => {
  const response = await api.patch(`/diary/${diaryId}`, {
    status: diaryData.status,
    content: diaryData.content,
  });
  return response.data;
};

export const getRemainingAiRequests = async (): Promise<number> => {
  const response = await api.get('/diary/ai/generate');
  return response.data.remainingRequests;
};

export const generateAiPhotos = async (content: string) => {
   if (!content || content.trim().length === 0) {
    return Promise.resolve(null);
  }

  const photo = await api.post('/diary/ai/generate', {
    content,
  });
  return photo.data;

};

export interface CalendarDiaryResponseDTO {
  diaryId: number;
  coverPhotoUrl: string;
  date: string; // 'yyyy-MM-dd'
  imageCount?: number;
  status?: 'PUBLIC' | 'PRIVATE';
}

export const getUserGallery = async (
  userId: string,
  cursor?: string | null,
  limit = 10,
): Promise<CursorPage<CalendarDiaryResponseDTO>> => {
  const params: { cursor?: string; limit: number } = { limit };

  if (cursor != null) {
    params.cursor = cursor;
  }

  const response = await api.get<CursorPage<CalendarDiaryResponseDTO>>(
    `/diary/user/${userId}/gallery`,
    { params },
  );

  return response.data;
};

export const getMonthlyDiaries = async (
  userId: string,
  year: number,
  month: number
): Promise<CalendarDiaryResponseDTO[]> => {
  try {
    const response = await api.get(
      `/diary/user/${userId}/monthly?year=${year}&month=${month}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly diaries:', error);
    throw error;
  }
};

export const getDiaryById = async (diaryId: number): Promise<DiaryDetail> => {
  try {
    const response = await api.get<DiaryDetail>(`/diary/${diaryId}`);
    return response.data;
  } catch (error) {
    console.error('일기 상세 조회 API 오류:', error);
    throw error;
  }
};

export const deleteDiary = async (diaryId: number): Promise<void> => {
  try {
    await api.delete(`/diary/${diaryId}`);
  } catch (error) {
    console.error('일기 삭제 API 오류:', error);
    throw error;
  }
};
