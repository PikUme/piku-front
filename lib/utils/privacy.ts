import type { PrivacyStatus } from '@/types/diary';

export interface PrivacyOption {
  value: PrivacyStatus;
  label: string;
  description: string;
}

export const PRIVACY_OPTIONS: PrivacyOption[] = [
  { value: 'PUBLIC', label: '전체 공개', description: '모든 사용자가 볼 수 있습니다.' },
  { value: 'FRIENDS', label: '친구 공개', description: '나를 팔로우하는 친구들만 볼 수 있습니다.' },
  { value: 'PRIVATE', label: '나만 보기', description: '나만 볼 수 있습니다.' },
  { value: 'ANONYMOUS', label: '익명', description: '작성자 정보를 숨깁니다.' },
];

const labelMap = Object.fromEntries(
  PRIVACY_OPTIONS.map(o => [o.value, o.label]),
) as Record<PrivacyStatus, string>;

export const getPrivacyLabel = (status: PrivacyStatus): string => {
  return labelMap[status];
};

export const isAnonymousDiaryIdentity = ({
  status,
  userId,
  friendStatus,
}: {
  status?: PrivacyStatus | null;
  userId?: string | null;
  friendStatus?: string | null;
}): boolean => {
  return status === 'ANONYMOUS' || userId === null || friendStatus === 'ANONYMOUS';
};
