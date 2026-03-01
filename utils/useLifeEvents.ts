import { useEffect, useState, useCallback } from 'react';
import { remoteStorageClient, LifeEvent } from '../lib/remoteStorage';

export type { LifeEvent };

export function useLifeEvents() {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      const data = await remoteStorageClient.getLifeEvents();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load life events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();

    const handleChange = (event: { relativePath: string }) => {
      if (event.relativePath.startsWith('life-events/')) {
        loadEvents();
      }
    };

    remoteStorageClient.onChange(handleChange);
  }, [loadEvents]);

  const saveEvent = useCallback(async (event: LifeEvent) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = event;
        return next;
      }
      return [...prev, event].sort((a, b) => a.startWeek.localeCompare(b.startWeek));
    });
    await remoteStorageClient.saveLifeEvent(event);
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    await remoteStorageClient.deleteLifeEvent(id);
  }, []);

  return { events, loading, saveEvent, deleteEvent };
}
