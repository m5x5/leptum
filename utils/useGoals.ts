import { useCallback } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { v4 as uuidv4 } from 'uuid';
import { defineCollection } from "../lib/query/defineCollection";

export interface GoalMilestone {
  id: string;
  name: string;
  targetDate?: number;  // Unix timestamp
  completed: boolean;
  completedAt?: number; // Unix timestamp
  order: number;
}

export interface DailyTrackingEntry {
  date: string; // YYYY-MM-DD format
  value: number; // For counters/amounts
  completed?: boolean; // For checklists
  notes?: string; // Optional notes
  timestamp?: number; // When logged
}

export interface GoalTrackingConfig {
  type: 'counter' | 'checklist' | 'timer' | 'amount';
  unit: string; // e.g., "glasses", "cups", "liters"
  icon: string; // emoji or icon name
  dailyTarget?: number; // e.g., 8 glasses
  maxPerDay?: number; // e.g., 12 glasses
  increments?: number[]; // e.g., [1, 2, 3] for quick add buttons
  options?: string[]; // For checklist items
}

export interface Goal {
  id: string;
  name: string;
  type: string;
  color?: string;
  description?: string;
  targetDate?: number;      // Unix timestamp for deadline
  createdAt?: number;       // Unix timestamp for creation
  completedAt?: number;     // Unix timestamp if goal completed
  status?: 'active' | 'completed' | 'archived';
  milestones?: GoalMilestone[];
  templateId?: string; // Reference to goal template (e.g., "stay-hydrated")
  trackingConfig?: GoalTrackingConfig; // Configuration for visual tracking
  trackingData?: {
    entries: DailyTrackingEntry[];
  };
}

// Shared by every useGoals() consumer; `goalUpdated` (dispatched by
// components that write goals directly, e.g. WebMCP) invalidates it.
export const goalsCollection = defineCollection<Goal[]>(
  'goals',
  () => remoteStorageClient.getGoals() as Promise<Goal[]>,
  { initial: [], refreshOn: ['goalUpdated', 'goalsUpdated'] }
);

/** Optimistically replace one goal in the cache, persist it, roll back on failure. */
async function persistGoal(updated: Goal, label: string): Promise<void> {
  goalsCollection.markSelfWrite();
  goalsCollection.set((prev) =>
    prev.some((g) => g.id === updated.id) ? prev.map((g) => (g.id === updated.id ? updated : g)) : [...prev, updated]
  );
  try {
    await remoteStorageClient.saveGoal(updated);
  } catch (error) {
    console.error(`Failed to ${label}:`, error);
    void goalsCollection.invalidate();
    throw error;
  }
}

export function useGoals(options?: { loadOnMount?: boolean }) {
  // `loadOnMount: false` used to skip the fetch; with a shared, de-duplicated
  // query the option is accepted but no longer changes anything.
  void options;
  const { data, isPending, isError } = goalsCollection.useQuery();
  const goals = data ?? [];

  const addGoal = useCallback(async (
    goalName: string,
    type: string,
    color?: string,
    options?: {
      description?: string;
      targetDate?: number;
      milestones?: Omit<GoalMilestone, 'id'>[];
    }
  ): Promise<Goal | undefined> => {
    const milestones = options?.milestones?.map((m, index) => ({
      ...m,
      id: uuidv4(),
      order: m.order ?? index,
      completed: m.completed ?? false
    }));
    const newGoal: Goal = {
      id: uuidv4(),
      name: goalName,
      type,
      color,
      description: options?.description,
      targetDate: options?.targetDate,
      createdAt: Date.now(),
      status: 'active',
      milestones
    };
    try {
      await persistGoal(newGoal, 'add goal');
      return newGoal;
    } catch {
      return undefined;
    }
  }, []);

  const updateGoal = useCallback(async (
    goalName: string,
    id: string,
    color?: string,
    options?: {
      description?: string;
      targetDate?: number | null;
      status?: 'active' | 'completed' | 'archived';
      milestones?: GoalMilestone[];
    }
  ) => {
    const existingGoal = goalsCollection.get().find((g) => g.id === id);
    if (!existingGoal) return;
    const updatedGoal: Goal = {
      ...existingGoal,
      name: goalName,
      ...(color !== undefined && { color }),
      ...(options?.description !== undefined && { description: options.description }),
      ...(options?.targetDate !== undefined && {
        targetDate: options.targetDate === null ? undefined : options.targetDate
      }),
      ...(options?.status !== undefined && { status: options.status }),
      ...(options?.milestones !== undefined && { milestones: options.milestones }),
      ...(options?.status === 'completed' && !existingGoal.completedAt && { completedAt: Date.now() })
    };
    await persistGoal(updatedGoal, 'update goal').catch(() => {});
  }, []);

  const patchGoal = useCallback(async (id: string, patch: (goal: Goal) => Goal, label: string) => {
    const existingGoal = goalsCollection.get().find((g) => g.id === id);
    if (!existingGoal) return undefined;
    const updatedGoal = patch(existingGoal);
    await persistGoal(updatedGoal, label).catch(() => {});
    return updatedGoal;
  }, []);

  const completeGoal = useCallback(async (id: string) => {
    await patchGoal(id, (g) => ({ ...g, status: 'completed', completedAt: Date.now() }), 'complete goal');
  }, [patchGoal]);

  const addMilestone = useCallback(async (goalId: string, milestone: Omit<GoalMilestone, 'id' | 'order'>) => {
    let newMilestone: GoalMilestone | undefined;
    await patchGoal(goalId, (g) => {
      const currentMilestones = g.milestones || [];
      newMilestone = { ...milestone, id: uuidv4(), order: currentMilestones.length, completed: milestone.completed ?? false };
      return { ...g, milestones: [...currentMilestones, newMilestone] };
    }, 'add milestone');
    return newMilestone;
  }, [patchGoal]);

  const updateMilestone = useCallback(async (goalId: string, milestoneId: string, updates: Partial<GoalMilestone>) => {
    await patchGoal(goalId, (g) => ({
      ...g,
      milestones: (g.milestones ?? []).map((m) =>
        m.id === milestoneId
          ? { ...m, ...updates, ...(updates.completed && !m.completedAt && { completedAt: Date.now() }) }
          : m
      ),
    }), 'update milestone');
  }, [patchGoal]);

  const deleteMilestone = useCallback(async (goalId: string, milestoneId: string) => {
    await patchGoal(goalId, (g) => ({
      ...g,
      milestones: (g.milestones ?? []).filter((m) => m.id !== milestoneId).map((m, index) => ({ ...m, order: index })),
    }), 'delete milestone');
  }, [patchGoal]);

  const completeMilestone = useCallback(async (goalId: string, milestoneId: string) => {
    await updateMilestone(goalId, milestoneId, { completed: true, completedAt: Date.now() });
  }, [updateMilestone]);

  const archiveGoal = useCallback(async (id: string) => {
    await patchGoal(id, (g) => ({ ...g, status: 'archived' }), 'archive goal');
  }, [patchGoal]);

  const unarchiveGoal = useCallback(async (id: string) => {
    await patchGoal(id, (g) => ({ ...g, status: 'active' }), 'unarchive goal');
  }, [patchGoal]);

  const deleteGoal = useCallback(async (id: string) => {
    goalsCollection.markSelfWrite();
    goalsCollection.set((prev) => prev.filter((g) => g.id !== id));
    try {
      await remoteStorageClient.deleteGoal(id);
    } catch (error) {
      console.error("Failed to delete goal:", error);
      void goalsCollection.invalidate();
    }
  }, []);

  return {
    goals,
    isLoading: isPending,
    isError,
    addGoal,
    updateGoal,
    deleteGoal,
    archiveGoal,
    unarchiveGoal,
    completeGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    reload: goalsCollection.invalidate,
  };
}
