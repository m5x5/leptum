import { useCallback } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { v4 as uuidv4 } from 'uuid';
import { defineCollection } from "../lib/query/defineCollection";

export interface GoalType {
  id: string;
  name: string;
  description?: string | null; // Optional rich text description
}

export const goalTypesCollection = defineCollection<GoalType[]>(
  'goalTypes',
  () => remoteStorageClient.getGoalTypes() as Promise<GoalType[]>,
  { initial: [], refreshOn: ['goalTypesUpdated'] }
);

export function useGoalTypes(options?: { loadOnMount?: boolean }) {
  // `loadOnMount: false` used to skip the fetch; with a shared cache the query
  // is cheap and de-duplicated, so the option is accepted but no longer needed.
  void options;
  const { data, isPending, isError } = goalTypesCollection.useQuery();
  const goalTypes = data ?? [];

  const addGoalType = useCallback(async (name: string, description: string = "") => {
    const newGoalType: GoalType = { id: uuidv4(), name, description };
    goalTypesCollection.markSelfWrite();
    goalTypesCollection.set((prev) => [...prev, newGoalType]);
    try {
      await remoteStorageClient.saveGoalType(newGoalType);
    } catch (error) {
      console.error("Failed to add goal type:", error);
      void goalTypesCollection.invalidate();
    }
  }, []);

  const updateGoalType = useCallback(async (name: string, id: string, description?: string) => {
    const existing = goalTypesCollection.get().find((gt) => gt.id === id);
    if (!existing) return;
    const updated = { ...existing, name, ...(description !== undefined && { description }) };
    goalTypesCollection.markSelfWrite();
    goalTypesCollection.set((prev) => prev.map((gt) => (gt.id === id ? updated : gt)));
    try {
      await remoteStorageClient.saveGoalType(updated);
    } catch (error) {
      console.error("Failed to update goal type:", error);
      void goalTypesCollection.invalidate();
    }
  }, []);

  const deleteGoalType = useCallback(async (id: string) => {
    goalTypesCollection.markSelfWrite();
    goalTypesCollection.set((prev) => prev.filter((gt) => gt.id !== id));
    try {
      await remoteStorageClient.deleteGoalType(id);
    } catch (error) {
      console.error("Failed to delete goal type:", error);
      void goalTypesCollection.invalidate();
    }
  }, []);

  return {
    goalTypes,
    isLoading: isPending,
    isError,
    reload: goalTypesCollection.invalidate,
    addGoal: addGoalType,
    addGoalType,
    updateGoal: updateGoalType,
    updateGoalType,
    deleteGoal: deleteGoalType,
    deleteGoalType,
  };
}
