import { useState, useEffect } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';

export interface AffectedMetric {
  metric: string;
  effect: 'positive' | 'negative';
}

export interface Insight {
  id: string;
  name: string;
  affectedMetrics: AffectedMetric[];
  notes?: string;
  category?: string;
  createdAt: number;
}

export function useInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  // Load insights on mount
  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const loadedInsights = await remoteStorageClient.getInsights();
      setInsights(loadedInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const addInsight = async (insight: Omit<Insight, 'id' | 'createdAt'>) => {
    const newInsight: Insight = {
      ...insight,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };

    const updatedInsights = [...insights, newInsight];
    setInsights(updatedInsights);
    await remoteStorageClient.saveInsights(updatedInsights);
    return newInsight;
  };

  const updateInsight = async (id: string, updates: Partial<Insight>) => {
    const updatedInsights = insights.map(insight =>
      insight.id === id ? { ...insight, ...updates } : insight
    );
    setInsights(updatedInsights);
    await remoteStorageClient.saveInsights(updatedInsights);
  };

  const deleteInsight = async (id: string) => {
    const updatedInsights = insights.filter(insight => insight.id !== id);
    setInsights(updatedInsights);
    await remoteStorageClient.saveInsights(updatedInsights);
  };

  return {
    insights,
    loading,
    addInsight,
    updateInsight,
    deleteInsight,
    refreshInsights: loadInsights,
  };
}
