'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isEqual,
  getDay,
  differenceInCalendarDays,
} from 'date-fns';
import type { SwipeableHandlers } from 'react-swipeable';
import useAuthStore from '../store/authStore';
import type { Friend } from '@/types/friend';

export type ImageRecoveryStatus = 'idle' | 'recovering' | 'exhausted';

interface PikuCalendarProps {
  targetUser: Friend | undefined;
  currentDate: Date;
  pikus: { [key: string]: { id: number; imageUrl: string } };
  handlers: SwipeableHandlers;
  today: Date;
  onDayClick: (diaryId: number) => void;
  onMonthChange?: (date: Date) => void;
  isMyCalendar: boolean;
  imageRecoveryStatus: ImageRecoveryStatus;
  onImageError: () => void;
}

interface CalendarDayImageProps {
  dateKey: string;
  imageUrl: string;
  imageRecoveryStatus: ImageRecoveryStatus;
  onImageError: () => void;
  fallback: ReactNode;
}

type CalendarDayImageStatus = 'loading' | 'loaded' | 'failed';

const CalendarDayImage = ({
  dateKey,
  imageUrl,
  imageRecoveryStatus,
  onImageError,
  fallback,
}: CalendarDayImageProps) => {
  const [status, setStatus] = useState<CalendarDayImageStatus>('loading');
  const hasReportedErrorRef = useRef(false);

  const skeleton = (
    <div
      data-testid={`calendar-skeleton-${dateKey}`}
      className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700"
    />
  );

  const handleError = () => {
    if (hasReportedErrorRef.current) return;

    hasReportedErrorRef.current = true;
    setStatus('failed');
    onImageError();
  };

  if (status === 'failed') {
    return imageRecoveryStatus === 'exhausted' ? fallback : skeleton;
  }

  return (
    <>
      {status === 'loading' && skeleton}
      <Image
        data-testid={`calendar-image-${dateKey}`}
        src={imageUrl}
        alt=""
        fill
        onLoad={() => setStatus('loaded')}
        onError={handleError}
        className={`object-cover transition-opacity duration-200 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        sizes="(max-width: 768px) 12vw, (max-width: 1200px) 8vw, 6vw"
      />
    </>
  );
};

const PikuCalendar = ({
  targetUser,
  currentDate,
  pikus,
  handlers,
  today,
  onDayClick,
  onMonthChange,
  isMyCalendar,
  imageRecoveryStatus,
  onImageError,
}: PikuCalendarProps) => {
  const router = useRouter();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const { user } = useAuthStore();
  
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const rowCount = Math.ceil(days.length / 7);

  const getDayClassName = (
    day: Date,
    isCurrentMonth: boolean,
    isFuture: boolean
  ) => {
    if (!isCurrentMonth || isFuture) return 'text-gray-300 dark:text-gray-600';
    const dayOfWeek = getDay(day);
    if (dayOfWeek === 0) return 'text-red-500 dark:text-red-400'; // Sunday
    if (dayOfWeek === 6) return 'text-blue-500 dark:text-blue-400'; // Saturday
    return 'text-black dark:text-white';
  };

  return (
    <main {...handlers} className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden">
      <div className="grid grid-cols-7 text-center text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
        {dayNames.map(day => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-7 flex-1 gap-1 min-h-0"
        style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}
      >
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const pikuData = pikus[dateKey];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isEqual(day, today);
          const isFutureDate = differenceInCalendarDays(day, today) > 0;

          const canView = pikuData && isCurrentMonth;
          const canCreate =
            isMyCalendar && !pikuData && isCurrentMonth && !isFutureDate;
          const dayNumber = (
            <span
              className={`${getDayClassName(
                day,
                isCurrentMonth,
                isFutureDate
              )} font-medium`}
            >
              {format(day, 'd')}
            </span>
          );

          const handleClick = () => {
            if (canView) {
              onDayClick(pikuData.id);
            } else if (canCreate) {
              router.push(`/diary/new/${dateKey}`);
            } else if (!isCurrentMonth && onMonthChange) {
              // 이전/다음 달 날짜 클릭 시 해당 월로 변경
              onMonthChange(day);
            }
          };

          return (
            <div
              key={day.toString()}
              onClick={handleClick}
              data-testid={`calendar-cell-${dateKey}`}
              className={`relative flex justify-center items-center overflow-hidden rounded-md  ${
                isCurrentDay ? 'border-yellow-400 border-2' : ''
              } ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
              } ${((canCreate || canView) || (!isCurrentMonth && onMonthChange)) ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
            >
              {pikuData && isCurrentMonth ? (
                <CalendarDayImage
                  key={pikuData.imageUrl}
                  dateKey={dateKey}
                  imageUrl={pikuData.imageUrl}
                  imageRecoveryStatus={imageRecoveryStatus}
                  onImageError={onImageError}
                  fallback={dayNumber}
                />
              ) : (
                dayNumber
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default PikuCalendar;
