import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getDiaryById } from '@/lib/api/diary';

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

vi.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('@/lib/api/diary', () => ({
  getDiaryById: vi.fn(),
}));

vi.mock('@/lib/api/comment', () => ({
  createComment: vi.fn(),
  getRootComments: vi.fn(),
}));

vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('swiper/modules', () => ({
  Pagination: {},
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('../DiaryDetailModal', () => ({
  default: () => null,
}));

vi.mock('../CommentModal', () => ({
  default: () => null,
}));

vi.mock('../../store/authStore', () => ({
  default: () => ({
    user: null,
    isLoggedIn: false,
  }),
}));

describe('DiaryDetailClient', () => {
  it('일기 상세 조회 실패 시 404 이미지를 보여준다', async () => {
    const { default: DiaryDetailClient } = await import('../DiaryDetailClient');

    vi.mocked(getDiaryById).mockRejectedValue({
      response: {
        data: {
          type: 'https://api.pikume.com/problems/diary/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: '이 일기를 볼 권한이 없습니다.',
          instance: '/api/diary/42',
        },
      },
    });

    render(<DiaryDetailClient diaryId={42} />);

    expect(
      await screen.findByRole('img', { name: '일기를 찾을 수 없습니다.' }),
    ).toHaveAttribute('src', '/404.png');
  });
});
