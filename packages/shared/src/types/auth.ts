// 인증 관련 타입
export interface User {
  id: number;
  email: string;
  nickname: string;
  profileImage?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}
