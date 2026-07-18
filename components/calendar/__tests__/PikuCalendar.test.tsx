import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PikuCalendar from '../PikuCalendar';
import type { SwipeableHandlers } from 'react-swipeable';

const routerPushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
  }) => <img {...props} />,
}));

vi.mock('@/components/store/authStore', () => ({
  default: () => ({
    user: {
      id: 'user-1',
    },
  }),
}));

type ImageRecoveryStatus = 'idle' | 'recovering' | 'exhausted';

const currentDate = new Date('2026-05-15T00:00:00');
const today = new Date('2026-05-15T00:00:00');
const handlers = {} as SwipeableHandlers;

const renderCalendar = ({
  imageRecoveryStatus = 'idle',
  onImageError = vi.fn(),
  onDayClick = vi.fn(),
  pikus = {
    '2026-05-15': {
      id: 15,
      imageUrl: '/old.png',
    },
  },
}: {
  imageRecoveryStatus?: ImageRecoveryStatus;
  onImageError?: () => void;
  onDayClick?: (diaryId: number) => void;
  pikus?: { [key: string]: { id: number; imageUrl: string } };
} = {}) =>
  render(
    <PikuCalendar
      targetUser={undefined}
      currentDate={currentDate}
      pikus={pikus}
      handlers={handlers}
      today={today}
      onDayClick={onDayClick}
      isMyCalendar
      imageRecoveryStatus={imageRecoveryStatus}
      onImageError={onImageError}
    />,
  );

describe('PikuCalendar image recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('이미지가 로드되면 스켈레톤을 제거하고 대표 이미지를 표시한다', () => {
    renderCalendar();

    const image = screen.getByTestId('calendar-image-2026-05-15');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveClass('opacity-0');
    expect(
      screen.getByTestId('calendar-skeleton-2026-05-15'),
    ).toBeInTheDocument();

    fireEvent.load(image);

    expect(
      screen.queryByTestId('calendar-skeleton-2026-05-15'),
    ).not.toBeInTheDocument();
    expect(image).toHaveClass('opacity-100');
  });

  it('첫 이미지 오류를 한 번 알리고 복구 중에는 실패 요소 없이 스켈레톤을 유지한다', () => {
    const onImageError = vi.fn();
    renderCalendar({ onImageError });

    const image = screen.getByTestId('calendar-image-2026-05-15');

    act(() => {
      image.dispatchEvent(new Event('error', { bubbles: true }));
      image.dispatchEvent(new Event('error', { bubbles: true }));
    });

    expect(onImageError).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId('calendar-image-2026-05-15'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('calendar-skeleton-2026-05-15'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('calendar-cell-2026-05-15')).queryByText('15'),
    ).not.toBeInTheDocument();
  });

  it('복구가 소진된 뒤 실패한 셀을 날짜 숫자로 전환하고 클릭 동작을 유지한다', () => {
    const onDayClick = vi.fn();
    const { rerender } = renderCalendar({ onDayClick });

    fireEvent.error(screen.getByTestId('calendar-image-2026-05-15'));

    rerender(
      <PikuCalendar
        targetUser={undefined}
        currentDate={currentDate}
        pikus={{
          '2026-05-15': {
            id: 15,
            imageUrl: '/old.png',
          },
        }}
        handlers={handlers}
        today={today}
        onDayClick={onDayClick}
        isMyCalendar
        imageRecoveryStatus="exhausted"
        onImageError={vi.fn()}
      />,
    );

    const cell = screen.getByTestId('calendar-cell-2026-05-15');
    expect(cell).toHaveClass('border-yellow-400', 'border-2');
    expect(
      screen.queryByTestId('calendar-image-2026-05-15'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('calendar-skeleton-2026-05-15'),
    ).not.toBeInTheDocument();
    expect(within(cell).getByText('15')).toBeInTheDocument();

    fireEvent.click(cell);

    expect(onDayClick).toHaveBeenCalledWith(15);
  });

  it('재조회로 이미지 URL이 바뀌면 새 이미지의 로딩 상태로 초기화한다', () => {
    const { rerender } = renderCalendar();

    fireEvent.error(screen.getByTestId('calendar-image-2026-05-15'));

    rerender(
      <PikuCalendar
        targetUser={undefined}
        currentDate={currentDate}
        pikus={{
          '2026-05-15': {
            id: 15,
            imageUrl: '/new.png',
          },
        }}
        handlers={handlers}
        today={today}
        onDayClick={vi.fn()}
        isMyCalendar
        imageRecoveryStatus="exhausted"
        onImageError={vi.fn()}
      />,
    );

    expect(screen.getByTestId('calendar-image-2026-05-15')).toHaveAttribute(
      'src',
      '/new.png',
    );
    expect(
      screen.getByTestId('calendar-skeleton-2026-05-15'),
    ).toBeInTheDocument();
  });

  it('한 셀의 최종 실패가 다른 정상 이미지에 영향을 주지 않는다', () => {
    const pikus = {
      '2026-05-15': {
        id: 15,
        imageUrl: '/fail.png',
      },
      '2026-05-16': {
        id: 16,
        imageUrl: '/success.png',
      },
    };
    const { rerender } = renderCalendar({ pikus });

    fireEvent.load(screen.getByTestId('calendar-image-2026-05-16'));
    fireEvent.error(screen.getByTestId('calendar-image-2026-05-15'));

    rerender(
      <PikuCalendar
        targetUser={undefined}
        currentDate={currentDate}
        pikus={pikus}
        handlers={handlers}
        today={today}
        onDayClick={vi.fn()}
        isMyCalendar
        imageRecoveryStatus="exhausted"
        onImageError={vi.fn()}
      />,
    );

    expect(
      within(screen.getByTestId('calendar-cell-2026-05-15')).getByText('15'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('calendar-image-2026-05-16'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('calendar-skeleton-2026-05-16'),
    ).not.toBeInTheDocument();
  });

  it('이미지가 없는 과거 날짜는 기존 날짜 셀과 생성 클릭 동작을 유지한다', () => {
    renderCalendar({ pikus: {} });

    const cell = screen.getByTestId('calendar-cell-2026-05-14');
    expect(within(cell).getByText('14')).toBeInTheDocument();

    fireEvent.click(cell);

    expect(routerPushMock).toHaveBeenCalledWith('/diary/new/2026-05-14');
  });

  it('최종 대체 날짜 숫자에 토요일과 일요일 색상을 유지한다', () => {
    const pikus = {
      '2026-05-09': {
        id: 9,
        imageUrl: '/saturday.png',
      },
      '2026-05-10': {
        id: 10,
        imageUrl: '/sunday.png',
      },
    };
    const { rerender } = renderCalendar({ pikus });

    fireEvent.error(screen.getByTestId('calendar-image-2026-05-09'));
    fireEvent.error(screen.getByTestId('calendar-image-2026-05-10'));

    rerender(
      <PikuCalendar
        targetUser={undefined}
        currentDate={currentDate}
        pikus={pikus}
        handlers={handlers}
        today={today}
        onDayClick={vi.fn()}
        isMyCalendar
        imageRecoveryStatus="exhausted"
        onImageError={vi.fn()}
      />,
    );

    expect(
      within(screen.getByTestId('calendar-cell-2026-05-09')).getByText('9'),
    ).toHaveClass('text-blue-500', 'dark:text-blue-400');
    expect(
      within(screen.getByTestId('calendar-cell-2026-05-10')).getByText('10'),
    ).toHaveClass('text-red-500', 'dark:text-red-400');
  });
});
