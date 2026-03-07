import { useState, useEffect, useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { calculateStreaks, StreakInfo } from './streakUtils';

export interface RoutineCompletion {
  routineId: string;
  routineInstanceId: string;
  routineName: string;
  completedAt: number;
  taskCount: number;
}

let cachedCompletions: RoutineCompletion[] | null = null;

export function useRoutineCompletions() {
  const [completions, setCompletions] = useState<RoutineCompletion[]>(() => cachedCompletions ?? []);
  const [loading, setLoading] = useState(cachedCompletions === null);

  const loadCompletions = useCallback(async () => {
    try {
      const data = await remoteStorageClient.getRoutineCompletions();
      cachedCompletions = data;
      setCompletions(data);
    } catch (error) {
      console.error('Failed to load routine completions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompletions();
  }, [loadCompletions]);

  const addCompletion = useCallback(async (completion: RoutineCompletion) => {
    try {
      await remoteStorageClient.addRoutineCompletion(completion);
      setCompletions(prev => {
        const next = [...prev, completion];
        cachedCompletions = next;
        return next;
      });
    } catch (error) {
      console.error('Failed to add routine completion:', error);
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
    reload: loadCompletions
  };
}
