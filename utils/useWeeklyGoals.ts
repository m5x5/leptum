import { useEffect, useState } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { v4 as uuidv4 } from 'uuid';

export interface WeeklyGoal {
  id: string;
  weekStart: string; // ISO date string (Monday of the week)
  goals: {
    monday: string[];
    tuesday: string[];
    wednesday: string[];
    thursday: string[];
    friday: string[];
    saturday: string[];
    sunday: string[];
  };
}

// Helper function to get the Monday of the current week
export function getMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function useWeeklyGoals() {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getMonday());
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    loadWeeklyGoal(currentWeekStart);

    // Listen for changes from RemoteStorage
    const handleChange = (event: any) => {
      if (event.relativePath.startsWith('weekly-goals/')) {
        loadWeeklyGoal(currentWeekStart);
      }
    };

    remoteStorageClient.onChange(handleChange);
  }, [currentWeekStart]);

  const loadWeeklyGoal = async (weekStart: string) => {
    try {
      setIsLoading(true);
      let goal = await remoteStorageClient.getWeeklyGoal(weekStart);

      // If no goal exists for this week, create a new one
      if (!goal) {
        goal = {
          id: uuidv4(),
          weekStart,
          goals: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
          }
        };
        await remoteStorageClient.saveWeeklyGoal(goal);
      }

      setWeeklyGoal(goal as WeeklyGoal);
      setIsError(false);
    } catch (error) {
      console.error("Failed to load weekly goal:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addGoal = async (day: keyof WeeklyGoal['goals'], goalText: string) => {
    if (!weeklyGoal) return;

    try {
      const updatedGoal = {
        ...weeklyGoal,
        goals: {
          ...weeklyGoal.goals,
          [day]: [...weeklyGoal.goals[day], goalText]
        }
      };

      await remoteStorageClient.saveWeeklyGoal(updatedGoal);
      setWeeklyGoal(updatedGoal);
    } catch (error) {
      console.error("Failed to add goal:", error);
      setIsError(true);
    }
  };

  const removeGoal = async (day: keyof WeeklyGoal['goals'], index: number) => {
    if (!weeklyGoal) return;

    try {
      const updatedGoals = [...weeklyGoal.goals[day]];
      updatedGoals.splice(index, 1);

      const updatedGoal = {
        ...weeklyGoal,
        goals: {
          ...weeklyGoal.goals,
          [day]: updatedGoals
        }
      };

      await remoteStorageClient.saveWeeklyGoal(updatedGoal);
      setWeeklyGoal(updatedGoal);
    } catch (error) {
      console.error("Failed to remove goal:", error);
      setIsError(true);
    }
  };

  const updateGoal = async (day: keyof WeeklyGoal['goals'], index: number, newText: string) => {
    if (!weeklyGoal) return;

    try {
      const updatedGoals = [...weeklyGoal.goals[day]];
      updatedGoals[index] = newText;

      const updatedGoal = {
        ...weeklyGoal,
        goals: {
          ...weeklyGoal.goals,
          [day]: updatedGoals
        }
      };

      await remoteStorageClient.saveWeeklyGoal(updatedGoal);
      setWeeklyGoal(updatedGoal);
    } catch (error) {
      console.error("Failed to update goal:", error);
      setIsError(true);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(currentWeekStart);
    const offset = direction === 'next' ? 7 : -7;
    currentDate.setDate(currentDate.getDate() + offset);
    const newWeekStart = getMonday(currentDate);
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getMonday());
  };

  return {
    weeklyGoal,
    currentWeekStart,
    isLoading,
    isError,
    addGoal,
    removeGoal,
    updateGoal,
    navigateWeek,
    goToCurrentWeek
  };
}
