// 일기 관련 타입
export interface Diary {
  id: number;
  userId: number;
  title: string;
  content: string;
  images: string[];
  date: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
