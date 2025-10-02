'use client';

import { useRouter } from 'next/navigation';
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

interface PikuCalendarProps {
  targetUser: Friend | undefined;
  currentDate: Date;
  pikus: { [key: string]: { id: number; imageUrl: string } };
  handlers: SwipeableHandlers;
  today: Date;
  onDayClick: (diaryId: number) => void;
  onMonthChange?: (date: Date) => void;
  isMyCalendar: boolean;
}

const PikuCalendar = ({
  targetUser,
  currentDate,
  pikus,
  handlers,
  today,
  onDayClick,
  onMonthChange,
  isMyCalendar,
}: PikuCalendarProps) => {
  const router = useRouter();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const { user } = useAuthStore();
  
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

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
    <main {...handlers} className="flex-grow flex flex-col p-2">
      <div className="grid grid-cols-7 text-center text-sm text-gray-500 dark:text-gray-400">
        {dayNames.map(day => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-grow gap-1">
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const pikuData = pikus[dateKey];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isEqual(day, today);
          const isFutureDate = differenceInCalendarDays(day, today) > 0;

          const canView = pikuData && isCurrentMonth;
          const canCreate =
            isMyCalendar && !pikuData && isCurrentMonth && !isFutureDate;

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
              className={`relative flex justify-center items-center overflow-hidden rounded-md  ${
                isCurrentDay ? 'border-yellow-400 border-2' : ''
              } ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
              } ${((canCreate || canView) || (!isCurrentMonth && onMonthChange)) ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
            >
              {pikuData && isCurrentMonth ? (
                <img
                  src={pikuData.imageUrl}
                  alt={`piku for ${dateKey}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className={`${getDayClassName(
                    day,
                    isCurrentMonth,
                    isFutureDate
                  )} font-medium`}
                >
                  {format(day, 'd')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default PikuCalendar; 