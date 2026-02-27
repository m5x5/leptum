import { useState, useEffect } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';

export interface Impact {
  id?: string;
  activity: string;
  date: number;
  goalId?: string;
  stress?: string | number;
  fulfillment?: string | number;
  motivation?: string | number;
  cleanliness?: string | number;
  happiness?: string | number;
  confidence?: string | number;
  energy?: string | number;
  focus?: string | number;
  shame?: string | number;
  guilt?: string | number;
  notes?: string;
  photoIds?: string[];
  endTime?: number;
}

export function useImpacts() {
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImpacts = async () => {
      try {
        const loadedImpacts = await remoteStorageClient.getImpacts();
        setImpacts(loadedImpacts);
      } catch (error) {
        console.error('Failed to load impacts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadImpacts();

    // Listen for changes
    const handleChange = (event: { relativePath: string }) => {
      if (event.relativePath === 'impacts') {
        loadImpacts();
      }
    };

    remoteStorageClient.onChange(handleChange);
  }, []);

  return { impacts, loading };
}
