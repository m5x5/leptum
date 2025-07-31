import { useEffect, useState } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { v4 as uuidv4 } from 'uuid';

export interface Goal {
  id: string;
  name: string;
  type: string;
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
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

    loadGoals();

    // Listen for changes from RemoteStorage
    const handleChange = (event: any) => {
      if (event.relativePath.startsWith('goals/')) {
        loadGoals();
      }
    };

    remoteStorageClient.onChange(handleChange);
  }, []);

  const addGoal = async (goalName: string, type: string) => {
    try {
      const newGoal: Goal = {
        id: uuidv4(),
        name: goalName,
        type
      };
      
      await remoteStorageClient.saveGoal(newGoal);
      setGoals(prev => [...prev, newGoal]);
    } catch (error) {
      console.error("Failed to add goal:", error);
      setIsError(true);
    }
  };

  const updateGoal = async (goalName: string, id: string) => {
    try {
      const existingGoal = goals.find(g => g.id === id);
      if (existingGoal) {
        const updatedGoal = { ...existingGoal, name: goalName };
        await remoteStorageClient.saveGoal(updatedGoal);
        setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g));
      }
    } catch (error) {
      console.error("Failed to update goal:", error);
      setIsError(true);
    }
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
  };
}
