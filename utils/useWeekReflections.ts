import { useCallback } from 'react';
import { remoteStorageClient, WeekReflection } from '../lib/remoteStorage';
import { defineCollection } from '../lib/query/defineCollection';

export type { WeekReflection };

export const weekReflectionsCollection = defineCollection<Record<string, WeekReflection>>(
  'weekReflections',
  () => remoteStorageClient.getWeekReflections(),
  { initial: {} }
);

export function useWeekReflections() {
  const { data, isPending } = weekReflectionsCollection.useQuery();
  const reflections = data ?? {};

  const saveReflection = useCallback(async (weekKey: string, text: string) => {
    const existing = weekReflectionsCollection.get()[weekKey];
    const reflection: WeekReflection = {
      id: weekKey,
      text,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    weekReflectionsCollection.markSelfWrite();
    weekReflectionsCollection.set((prev) => ({ ...prev, [weekKey]: reflection }));
    try {
      await remoteStorageClient.saveWeekReflection(reflection);
    } catch (error) {
      console.error('Failed to save week reflection:', error);
      void weekReflectionsCollection.invalidate();
      throw error;
    }
  }, []);

  const deleteReflection = useCallback(async (weekKey: string) => {
    weekReflectionsCollection.markSelfWrite();
    weekReflectionsCollection.set((prev) => {
      const next = { ...prev };
      delete next[weekKey];
      return next;
    });
    try {
      await remoteStorageClient.deleteWeekReflection(weekKey);
    } catch (error) {
      console.error('Failed to delete week reflection:', error);
      void weekReflectionsCollection.invalidate();
      throw error;
    }
  }, []);

  return { reflections, loading: isPending, saveReflection, deleteReflection };
}
