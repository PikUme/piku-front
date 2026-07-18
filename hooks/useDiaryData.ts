import { useState, useEffect, useCallback, useRef } from 'react';
import { getMonthlyDiaries, getDiaryById } from '@/lib/api/diary';
import type { DiaryDetail, MonthlyDiary } from '@/types/diary';
import type { Friend } from '@/types/friend';
import type { User } from '@/types/auth';

type Pikus = {
  [key: string]: { id: number; imageUrl: string };
};

export const useDiaryData = (
  currentDate: Date,
  user: User | null,
  viewedUser?: Friend | null,
) => {
  const [selectedDiary, setSelectedDiary] = useState<DiaryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const targetUser = viewedUser || user;
  const targetUserId = targetUser
    ? 'userId' in targetUser
      ? targetUser.userId
      : targetUser.id
    : null;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const scopeKey = `${targetUserId ?? 'none'}:${year}-${month}`;
  const [pikusState, setPikusState] = useState<{
    scopeKey: string;
    data: Pikus;
  }>({
    scopeKey,
    data: {},
  });
  const pikus = pikusState.scopeKey === scopeKey ? pikusState.data : {};
  const activeScopeRef = useRef<string | null>(scopeKey);
  const latestMonthlyRequestRef = useRef(0);

  const fetchMonthlyDiaries = useCallback(async (clearOnError = false) => {
    if (!targetUserId) return;

    const requestedScope = scopeKey;
    const requestSequence = ++latestMonthlyRequestRef.current;

    try {
      const diaries: MonthlyDiary[] = await getMonthlyDiaries(
        targetUserId,
        year,
        month,
      );
      const newPikus = diaries.reduce<Pikus>((acc, diary) => {
        acc[diary.date] = {
          id: diary.diaryId,
          imageUrl: diary.coverPhotoUrl,
        };
        return acc;
      }, {});

      if (
        activeScopeRef.current === requestedScope &&
        latestMonthlyRequestRef.current === requestSequence
      ) {
        setPikusState({
          scopeKey: requestedScope,
          data: newPikus,
        });
      }
    } catch (error) {
      if (
        activeScopeRef.current !== requestedScope ||
        latestMonthlyRequestRef.current !== requestSequence
      ) {
        return;
      }

      if (clearOnError) {
        setPikusState({
          scopeKey: requestedScope,
          data: {},
        });
      }
      throw error;
    }
  }, [month, scopeKey, targetUserId, year]);

  useEffect(() => {
    activeScopeRef.current = scopeKey;
    setPikusState(currentState =>
      currentState.scopeKey === scopeKey
        ? currentState
        : {
            scopeKey,
            data: {},
          },
    );

    if (!targetUserId) {
      latestMonthlyRequestRef.current += 1;
      setPikusState({
        scopeKey,
        data: {},
      });
      return;
    }

    void fetchMonthlyDiaries(true).catch(error => {
      if (activeScopeRef.current === scopeKey) {
        console.error('Failed to fetch monthly diaries:', error);
      }
    });

    return () => {
      if (activeScopeRef.current === scopeKey) {
        activeScopeRef.current = null;
      }
    };
  }, [fetchMonthlyDiaries, scopeKey, targetUserId]);

  const refetchMonthlyDiaries = useCallback(async () => {
    try {
      await fetchMonthlyDiaries();
    } catch (error) {
      if (activeScopeRef.current === scopeKey) {
        throw error;
      }
    }
  }, [fetchMonthlyDiaries, scopeKey]);

  const loadDiaryDetail = useCallback(async (diaryId: number) => {
    setIsLoading(true);
    try {
      const diaryDetail = await getDiaryById(diaryId);
      setSelectedDiary(diaryDetail);
    } catch (error) {
      console.error('Failed to fetch diary details:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeDiaryDetail = useCallback(() => {
    setSelectedDiary(null);
  }, []);

  const removeDiary = useCallback((diaryId: number) => {
    setPikusState(prev => {
      if (prev.scopeKey !== scopeKey) return prev;

      const next = { ...prev.data };
      const dateKey = Object.keys(next).find(k => next[k].id === diaryId);
      if (dateKey) delete next[dateKey];
      return {
        ...prev,
        data: next,
      };
    });
    setSelectedDiary(null);
  }, [scopeKey]);

  return {
    pikus,
    selectedDiary,
    isLoading,
    refetchMonthlyDiaries,
    loadDiaryDetail,
    closeDiaryDetail,
    removeDiary,
  };
};
