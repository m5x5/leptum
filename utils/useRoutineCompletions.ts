import { useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { calculateStreaks, StreakInfo } from './streakUtils';
import { useCompletionsQuery, setCompletionsCache, invalidate, markSelfWrite } from '../lib/query/collections';

export interface RoutineCompletion {
  routineId: string;
  routineInstanceId: string;
  routineName: string;
  completedAt: number;
  taskCount: number;
}

const EMPTY: RoutineCompletion[] = [];

export function useRoutineCompletions() {
  const query = useCompletionsQuery();
  const completions = query.data ?? EMPTY;
  const loading = query.isPending;

  const loadCompletions = useCallback(() => invalidate('completions'), []);

  const addCompletion = useCallback(async (completion: RoutineCompletion) => {
    markSelfWrite('completions');
    setCompletionsCache((prev) => [...prev, completion]);
    try {
      await remoteStorageClient.addRoutineCompletion(completion);
    } catch (error) {
      console.error('Failed to add routine completion:', error);
      void invalidate('completions');
    }
  }, []);

  const getCompletionsForRoutine = useCallback((routineId: string) => {
    return completions.filter(c => c.routineId === routineId);
  }, [completions]);

  const getCompletionsForDateRange = useCallback((startDate: number, endDate: number) => {
    return completions.filter(c => c.completedAt >= startDate && c.completedAt <= endDate);
  }, [completions]);

  const getStreaksForRoutine = useCallback((routineId: string): StreakInfo => {
    const routineCompletions = completions.filter(c => c.routineId === routineId);
    return calculateStreaks(routineCompletions);
  }, [completions]);

  return {
    completions,
    loading,
    addCompletion,
    getCompletionsForRoutine,
    getCompletionsForDateRange,
    getStreaksForRoutine,
    reload: loadCompletions,
  };
}
