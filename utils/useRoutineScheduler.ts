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

      for (const routine of routines) {
        if (!routine.cron || !routine.tasks || routine.tasks.length === 0) {
          continue;
        }

        // Check if this routine should have triggered since last check
        if (shouldTrigger(routine.cron, lastCheck, now)) {
          await triggerRoutine(routine);
        }
      }

      // Update last check time
      localStorage.setItem(ROUTINE_CHECK_KEY, now.toString());
    } catch (error) {
      console.error('Failed to check routines:', error);
    }
  };

  const shouldTrigger = (cronExpression: string, lastCheck: number, now: number): boolean => {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: new Date(lastCheck || now - CHECK_INTERVAL)
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
      console.log('Triggering routine:', routine.name);

      // Create a unique instance ID for this routine trigger
      const routineInstanceId = `${routine.id}-${Date.now()}`;

      // Create standalone tasks for each task in the routine
      const standaloneTasks = await remoteStorageClient.getStandaloneTasks();

      for (const task of routine.tasks || []) {
        // Check if this task already exists as a due task for this routine instance
        const existingTask = standaloneTasks.find(
          (t: any) => t.routineInstanceId === routineInstanceId && t.name === task.name
        );

        if (!existingTask) {
          const newTask = {
            id: `${routine.id}-${task.id}-${Date.now()}`,
            name: task.name,
            description: task.description || `From routine: ${routine.name}`,
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
