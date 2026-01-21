import { useEffect, useRef } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { Routine } from '../components/Job/api';
import cronParser from 'cron-parser';

const ROUTINE_CHECK_KEY = 'routine-last-check';
const CHECK_INTERVAL = 60000; // Check every minute

export function useRoutineScheduler(onTasksCreated?: () => void) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Run immediately on mount
    checkAndTriggerRoutines();

    // Then check every minute
    intervalRef.current = setInterval(() => {
      checkAndTriggerRoutines();
    }, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const checkAndTriggerRoutines = async () => {
    try {
      const routines = await remoteStorageClient.getRoutines() as Routine[];
      const now = Date.now();
      const lastCheck = parseInt(localStorage.getItem(ROUTINE_CHECK_KEY) || '0', 10);
      
      // Get all existing tasks from RemoteStorage (this syncs across devices)
      const existingTasks = await remoteStorageClient.getStandaloneTasks();
      
      // Get start of today to check for tasks created today
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      for (const routine of routines) {
        if (!routine.cron || !routine.tasks || routine.tasks.length === 0) {
          continue;
        }

        // Check if tasks from this routine were already created today in RemoteStorage
        // This works across devices because RemoteStorage syncs
        const hasTasksToday = routine.tasks.some(task =>
          existingTasks.some((t: any) =>
            t.routineId === routine.id &&
            t.name === task.name &&
            t.status === 'due' &&
            t.createdAt >= todayStart
          )
        );

        // If tasks already exist for today, skip this routine (already triggered on another device)
        if (hasTasksToday) {
          continue;
        }
        
        // Check if this routine should have triggered since last check
        if (shouldTrigger(routine.cron, lastCheck, now)) {
          await triggerRoutine(routine);
        }
      }

      // Update last check time (localStorage is just for performance optimization)
      localStorage.setItem(ROUTINE_CHECK_KEY, now.toString());
    } catch (error) {
      console.error('Failed to check routines:', error);
    }
  };

  const shouldTrigger = (
    cronExpression: string, 
    lastCheck: number, 
    now: number
  ): boolean => {
    try {
      // If this is the first check, check if routine should have triggered today
      if (lastCheck === 0) {
        // Start from beginning of today
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        const interval = cronParser.parseExpression(cronExpression, {
          currentDate: today
        });

        // Get the first occurrence today
        const next = interval.next();
        const nextTime = next.toDate().getTime();

        // If the occurrence is today and has passed, it should trigger
        return nextTime <= now && nextTime > 0;
      }

      // For subsequent checks, use the normal logic
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: new Date(lastCheck)
      });

      // Get the next occurrence after last check
      const next = interval.next();
      const nextTime = next.toDate().getTime();

      // If the next occurrence is between last check and now, it should trigger
      return nextTime > lastCheck && nextTime <= now;
    } catch (error) {
      console.error('Failed to parse cron expression:', cronExpression, error);
      return false;
    }
  };

  const triggerRoutine = async (routine: Routine) => {
    try {
      // Create a unique instance ID for this routine trigger
      const routineInstanceId = `${routine.id}-${Date.now()}`;

      // Create standalone tasks for each task in the routine
      const standaloneTasks = await remoteStorageClient.getStandaloneTasks();
      
      // Get start of today to check for existing tasks from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      for (const task of routine.tasks || []) {
        // Check if this task already exists as a due task for this routine instance
        const existingTaskByInstance = standaloneTasks.find(
          (t: any) => t.routineInstanceId === routineInstanceId && t.name === task.name
        );
        
        // Also check if a task with the same name from this routine was created today
        // This prevents duplicates if the routine is triggered multiple times in the same day
        const existingTaskToday = standaloneTasks.find(
          (t: any) => 
            t.routineId === routine.id && 
            t.name === task.name && 
            t.status === 'due' &&
            t.createdAt >= todayStart
        );

        if (!existingTaskByInstance && !existingTaskToday) {
          const newTask = {
            id: `${routine.id}-${task.id}-${Date.now()}`,
            name: task.name,
            description: task.description || `Routine: ${routine.name}`,
            status: 'due' as const,
            createdAt: Date.now(),
            routineId: routine.id,
            routineInstanceId,
            ...(routine.goalId && { goalId: routine.goalId })
          };

          await remoteStorageClient.addStandaloneTask(newTask);
        }
      }

      // Callback to notify that tasks were created
      if (onTasksCreated) {
        onTasksCreated();
      }
    } catch (error) {
      console.error('Failed to trigger routine:', routine.name, error);
    }
  };
}
