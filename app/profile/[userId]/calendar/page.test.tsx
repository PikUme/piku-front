import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarPage from './page';

const { mockNotFound } = vi.hoisted(() => ({
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}));

vi.mock('@/components/profile/CalendarClient', () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="calendar-client">{userId}</div>
  ),
}));

describe('Profile CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 date 쿼리면 캘린더를 렌더링한다', async () => {
    const page = await CalendarPage({
      params: Promise.resolve({ userId: 'user-1' }),
      searchParams: Promise.resolve({ date: '2026-03-17' }),
    });

    render(page);

    expect(screen.getByTestId('calendar-client')).toHaveTextContent('user-1');
  });

  it('date 쿼리가 없으면 캘린더를 렌더링한다', async () => {
    const page = await CalendarPage({
      params: Promise.resolve({ userId: 'user-1' }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByTestId('calendar-client')).toHaveTextContent('user-1');
  });

  it('유효하지 않은 date 쿼리면 404 처리한다', async () => {
    await expect(
      CalendarPage({
        params: Promise.resolve({ userId: 'user-1' }),
        searchParams: Promise.resolve({ date: '2026-02-31' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });
});
