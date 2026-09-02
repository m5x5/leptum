import { useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { defineCollection } from '../lib/query/defineCollection';

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

export const insightsCollection = defineCollection<Insight[]>(
  'insights',
  () => remoteStorageClient.getInsights(),
  { initial: [], refreshOn: ['insightsUpdated'] }
);

export function useInsights() {
  const { data, isPending } = insightsCollection.useQuery();
  const insights = data ?? [];

  const addInsight = useCallback(async (insight: Omit<Insight, 'id' | 'createdAt'>) => {
    const newInsight: Insight = { ...insight, id: Date.now().toString(), createdAt: Date.now() };
    insightsCollection.markSelfWrite();
    insightsCollection.set((prev) => [...prev, newInsight]);
    try {
      await remoteStorageClient.saveInsight(newInsight);
    } catch (error) {
      console.error('Failed to add insight:', error);
      void insightsCollection.invalidate();
      throw error;
    }
    return newInsight;
  }, []);

  const updateInsight = useCallback(async (id: string, updates: Partial<Insight>) => {
    const existing = insightsCollection.get().find((i) => i.id === id);
    if (!existing) return;
    const updated: Insight = { ...existing, ...updates };
    insightsCollection.markSelfWrite();
    insightsCollection.set((prev) => prev.map((i) => (i.id === id ? updated : i)));
    try {
      await remoteStorageClient.saveInsight(updated);
    } catch (error) {
      console.error('Failed to update insight:', error);
      void insightsCollection.invalidate();
      throw error;
    }
  }, []);

  const deleteInsight = useCallback(async (id: string) => {
    insightsCollection.markSelfWrite();
    insightsCollection.set((prev) => prev.filter((i) => i.id !== id));
    try {
      await remoteStorageClient.deleteInsight(id);
    } catch (error) {
      console.error('Failed to delete insight:', error);
      void insightsCollection.invalidate();
      throw error;
    }
  }, []);

  return {
    insights,
    loading: isPending,
    addInsight,
    updateInsight,
    deleteInsight,
    refreshInsights: insightsCollection.invalidate,
  };
}
