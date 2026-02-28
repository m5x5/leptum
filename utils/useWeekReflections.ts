import { useEffect, useState, useCallback } from 'react';
import { remoteStorageClient, WeekReflection } from '../lib/remoteStorage';

export type { WeekReflection };

export function useWeekReflections() {
  const [reflections, setReflections] = useState<Record<string, WeekReflection>>({});
  const [loading, setLoading] = useState(true);

  const loadReflections = useCallback(async () => {
    try {
      const data = await remoteStorageClient.getWeekReflections();
      setReflections(data);
    } catch (error) {
      console.error('Failed to load week reflections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReflections();

    const handleChange = (event: { relativePath: string }) => {
      if (event.relativePath.startsWith('week-reflections/')) {
        loadReflections();
      }
    };

    remoteStorageClient.onChange(handleChange);
  }, [loadReflections]);

  const saveReflection = useCallback(async (weekKey: string, text: string) => {
    const existing = reflections[weekKey];
    const reflection: WeekReflection = {
      id: weekKey,
      text,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    setReflections(prev => ({ ...prev, [weekKey]: reflection }));
    await remoteStorageClient.saveWeekReflection(reflection);
  }, [reflections]);

  const deleteReflection = useCallback(async (weekKey: string) => {
    setReflections(prev => {
      const next = { ...prev };
      delete next[weekKey];
      return next;
    });
    await remoteStorageClient.deleteWeekReflection(weekKey);
  }, []);

  return { reflections, loading, saveReflection, deleteReflection };
}
