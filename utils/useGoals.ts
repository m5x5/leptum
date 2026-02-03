import { useEffect, useState } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { v4 as uuidv4 } from 'uuid';

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

export function useGoals(options?: { loadOnMount?: boolean }) {
  const loadOnMount = options?.loadOnMount !== false;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(loadOnMount);
  const [isError, setIsError] = useState(false);

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      const loadedGoals = await remoteStorageClient.getGoals();
      setGoals(loadedGoals as Goal[]);
      setIsError(false);
    } catch (error) {
      console.error("Failed to load goals:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loadOnMount) loadGoals();

    // Listen for changes from RemoteStorage
    const handleChange = (event: any) => {
      if (event.relativePath.startsWith('goals/')) {
        loadGoals();
      }
    };

    remoteStorageClient.onChange(handleChange);

    // Listen for goal update events
    const handleGoalUpdate = () => {
      loadGoals();
    };
    window.addEventListener('goalUpdated', handleGoalUpdate);
    
    return () => {
      window.removeEventListener('goalUpdated', handleGoalUpdate);
    };
  }, [loadOnMount]);

  const addGoal = async (
    goalName: string,
    type: string,
    color?: string,
    options?: {
      description?: string;
      targetDate?: number;
      milestones?: Omit<GoalMilestone, 'id'>[];
    }
  ): Promise<Goal | undefined> => {
    try {
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

      await remoteStorageClient.saveGoal(newGoal);
      setGoals(prev => [...prev, newGoal]);
      return newGoal;
    } catch (error) {
      console.error("Failed to add goal:", error);
      setIsError(true);
      return undefined;
    }
  };

  const updateGoal = async (
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
    try {
      const existingGoal = goals.find(g => g.id === id);
      if (existingGoal) {
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
        await remoteStorageClient.saveGoal(updatedGoal);
        setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
      }
    } catch (error) {
      console.error("Failed to update goal:", error);
      setIsError(true);
    }
  };

  const completeGoal = async (id: string) => {
    try {
      const existingGoal = goals.find(g => g.id === id);
      if (existingGoal) {
        const updatedGoal: Goal = {
          ...existingGoal,
          status: 'completed',
          completedAt: Date.now()
        };
        await remoteStorageClient.saveGoal(updatedGoal);
        setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
      }
    } catch (error) {
      console.error("Failed to complete goal:", error);
      setIsError(true);
    }
  };

  const addMilestone = async (goalId: string, milestone: Omit<GoalMilestone, 'id' | 'order'>) => {
    try {
      const existingGoal = goals.find(g => g.id === goalId);
      if (existingGoal) {
        const currentMilestones = existingGoal.milestones || [];
        const newMilestone: GoalMilestone = {
          ...milestone,
          id: uuidv4(),
          order: currentMilestones.length,
          completed: milestone.completed ?? false
        };
        const updatedGoal: Goal = {
          ...existingGoal,
          milestones: [...currentMilestones, newMilestone]
        };
        await remoteStorageClient.saveGoal(updatedGoal);
        setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
        return newMilestone;
      }
    } catch (error) {
      console.error("Failed to add milestone:", error);
      setIsError(true);
    }
  };

  const updateMilestone = async (goalId: string, milestoneId: string, updates: Partial<GoalMilestone>) => {
    try {
      const existingGoal = goals.find(g => g.id === goalId);
      if (existingGoal && existingGoal.milestones) {
        const updatedMilestones = existingGoal.milestones.map(m =>
          m.id === milestoneId
            ? {
                ...m,
                ...updates,
                ...(updates.completed && !m.completedAt && { completedAt: Date.now() })
              }
            : m
        );
        const updatedGoal: Goal = {
          ...existingGoal,
          milestones: updatedMilestones
        };
        await remoteStorageClient.saveGoal(updatedGoal);
        setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
      }
    } catch (error) {
      console.error("Failed to update milestone:", error);
      setIsError(true);
    }
  };

  const deleteMilestone = async (goalId: string, milestoneId: string) => {
    try {
      const existingGoal = goals.find(g => g.id === goalId);
      if (existingGoal && existingGoal.milestones) {
        const filteredMilestones = existingGoal.milestones
          .filter(m => m.id !== milestoneId)
          .map((m, index) => ({ ...m, order: index }));
        const updatedGoal: Goal = {
          ...existingGoal,
          milestones: filteredMilestones
        };
        await remoteStorageClient.saveGoal(updatedGoal);
        setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
      }
    } catch (error) {
      console.error("Failed to delete milestone:", error);
      setIsError(true);
    }
  };

  const completeMilestone = async (goalId: string, milestoneId: string) => {
    await updateMilestone(goalId, milestoneId, { completed: true, completedAt: Date.now() });
  };

  const deleteGoal = async (id: string) => {
    try {
      await remoteStorageClient.deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error("Failed to delete goal:", error);
      setIsError(true);
    }
  };

  return {
    goals,
    isLoading,
    isError,
    addGoal,
    updateGoal,
    deleteGoal,
    completeGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    reload: loadGoals,
  };
}
