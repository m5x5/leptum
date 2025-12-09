import { useState, useEffect, useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';

export interface RoutineCompletion {
  routineId: string;
  routineInstanceId: string;
  routineName: string;
  completedAt: number;
  taskCount: number;
}

export function useRoutineCompletions() {
  const [completions, setCompletions] = useState<RoutineCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompletions = useCallback(async () => {
    try {
      const data = await remoteStorageClient.getRoutineCompletions();
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
      setCompletions(prev => [...prev, completion]);
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

  return {
    completions,
    loading,
    addCompletion,
    getCompletionsForRoutine,
    getCompletionsForDateRange,
    reload: loadCompletions
  };
}
