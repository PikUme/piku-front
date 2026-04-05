import { existsSync } from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DiaryDetailModal from '../DiaryDetailModal';
import type { DiaryDetail } from '@/types/diary';

vi.mock('@/lib/api/comment', () => ({
  createComment: vi.fn(),
  getRootComments: vi.fn().mockResolvedValue({
    content: [],
    totalPages: 0,
    totalElements: 0,
    size: 10,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  }),
  getReplies: vi.fn(),
  deleteComment: vi.fn(),
  updateComment: vi.fn(),
}));

vi.mock('@/lib/api/diary', () => ({
  deleteDiary: vi.fn(),
}));

vi.mock('@/components/store/authStore', () => ({
  default: () => ({
    isLoggedIn: true,
    user: {
      id: 'user-1',
      email: 'user@example.com',
      nickname: 'tester',
      avatar: '',
    },
  }),
}));

vi.mock('@/components/feed/ProfileHoverCard', () => ({
  default: () => null,
}));

vi.mock('../CommentItem', () => ({
  default: () => null,
}));

vi.mock('../CommentInput', () => ({
  default: () => null,
}));

const diary: DiaryDetail = {
  diaryId: 1,
  content: '테스트 일기',
  date: '2026-04-05',
  status: 'PUBLIC',
  createdAt: '2026-04-05T10:00:00',
  updatedAt: '2026-04-05T10:00:00',
  isLiked: false,
  likeCount: 0,
  commentCount: 0,
  imgUrls: ['https://example.com/image.png'],
  nickname: 'tester',
  avatar: '',
  userId: 'user-1',
  comments: [],
};

describe('diary edit access removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose the diary edit route file', () => {
    const routePath = path.resolve(
      process.cwd(),
      'app/diary/edit/[id]/page.tsx',
    );

    expect(existsSync(routePath)).toBe(false);
  });

  it('does not show an edit action in the diary owner menu', async () => {
    const { container } = render(
      <DiaryDetailModal diary={diary} onClose={vi.fn()} />,
    );

    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[1]);

    await waitFor(() => {
      expect(screen.getByText('일기 삭제')).toBeInTheDocument();
    });
    expect(screen.queryByText('일기 수정')).not.toBeInTheDocument();
  });
});
