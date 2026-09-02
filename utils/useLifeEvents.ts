import { useCallback } from 'react';
import { remoteStorageClient, LifeEvent } from '../lib/remoteStorage';
import { defineCollection } from '../lib/query/defineCollection';

export type { LifeEvent };

export const lifeEventsCollection = defineCollection<LifeEvent[]>(
  'lifeEvents',
  () => remoteStorageClient.getLifeEvents(),
  { initial: [], refreshOn: ['lifeEventsUpdated'] }
);

export function useLifeEvents() {
  const { data, isPending } = lifeEventsCollection.useQuery();
  const events = data ?? [];

  const saveEvent = useCallback(async (event: LifeEvent) => {
    lifeEventsCollection.markSelfWrite();
    lifeEventsCollection.set((prev) => {
      const idx = prev.findIndex((e) => e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = event;
        return next;
      }
      return [...prev, event].sort((a, b) => a.startWeek.localeCompare(b.startWeek));
    });
    try {
      await remoteStorageClient.saveLifeEvent(event);
    } catch (error) {
      console.error('Failed to save life event:', error);
      void lifeEventsCollection.invalidate(); // roll back to what the pod has
      throw error;
    }
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    lifeEventsCollection.markSelfWrite();
    lifeEventsCollection.set((prev) => prev.filter((e) => e.id !== id));
    try {
      await remoteStorageClient.deleteLifeEvent(id);
    } catch (error) {
      console.error('Failed to delete life event:', error);
      void lifeEventsCollection.invalidate();
      throw error;
    }
  }, []);

  return { events, loading: isPending, saveEvent, deleteEvent };
}
