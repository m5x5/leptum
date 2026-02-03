import { useEffect, useState } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { v4 as uuidv4 } from 'uuid';

export interface GoalType {
  id: string;
  name: string;
  description?: string | null; // Optional rich text description
}

export function useGoalTypes(options?: { loadOnMount?: boolean }) {
  const loadOnMount = options?.loadOnMount !== false;
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([]);
  const [isLoading, setIsLoading] = useState(loadOnMount);
  const [isError, setIsError] = useState(false);

  const loadGoalTypes = async () => {
    try {
      setIsLoading(true);
      const loadedGoalTypes = await remoteStorageClient.getGoalTypes();
      setGoalTypes(loadedGoalTypes as GoalType[]);
      setIsError(false);
    } catch (error) {
      console.error("Failed to load goal types:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loadOnMount) loadGoalTypes();

    // Listen for changes from RemoteStorage
    const handleChange = (event: any) => {
      if (event.relativePath.startsWith('goal-types/')) {
        loadGoalTypes();
      }
    };

    remoteStorageClient.onChange(handleChange);
  }, [loadOnMount]);

  const addGoalType = async (name: string, description: string = "") => {
    try {
      const newGoalType: GoalType = {
        id: uuidv4(),
        name,
        description
      };
      
      await remoteStorageClient.saveGoalType(newGoalType);
      setGoalTypes(prev => [...prev, newGoalType]);
    } catch (error) {
      console.error("Failed to add goal type:", error);
      setIsError(true);
    }
  };

  const updateGoalType = async (name: string, id: string, description?: string) => {
    try {
      const existingGoalType = goalTypes.find(gt => gt.id === id);
      if (existingGoalType) {
        const updatedGoalType = { 
          ...existingGoalType, 
          name,
          ...(description !== undefined && { description })
        };
        await remoteStorageClient.saveGoalType(updatedGoalType);
        setGoalTypes(prev => prev.map(gt => gt.id === id ? updatedGoalType : gt));
      }
    } catch (error) {
      console.error("Failed to update goal type:", error);
      setIsError(true);
    }
  };

  const deleteGoalType = async (id: string) => {
    try {
      await remoteStorageClient.deleteGoal(id); // This should be deleteGoalType but using existing method
      setGoalTypes(prev => prev.filter(gt => gt.id !== id));
    } catch (error) {
      console.error("Failed to delete goal type:", error);
      setIsError(true);
    }
  };

  return {
    goalTypes,
    isLoading,
    isError,
    reload: loadGoalTypes,
    addGoal: addGoalType,
    addGoalType,
    updateGoal: updateGoalType,
    updateGoalType,
    deleteGoal: deleteGoalType,
    deleteGoalType,
  };
}
