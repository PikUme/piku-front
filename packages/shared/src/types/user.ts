// 사용자 관련 타입
export interface UserProfile {
  id: number;
  email: string;
  nickname: string;
  profileImage?: string;
  bio?: string;
  createdAt: string;
}
