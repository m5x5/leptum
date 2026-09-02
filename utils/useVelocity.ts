import { useState, useEffect } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';

interface VelocityData {
  week: string;
  totalNumeric: number;
  effortCounts: Record<string, number>;
  taskCount: number;
}

export function useVelocity() {
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVelocityData = async () => {
    try {
      const data = await remoteStorageClient.getWeeklyVelocity();
      setVelocityData(data);
    } catch (error) {
      console.error('Failed to load velocity data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadVelocityData();
    })();
  }, []);

  return {
    velocityData,
    loading,
    reload: loadVelocityData
  };
}