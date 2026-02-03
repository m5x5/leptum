import { useEffect, useRef } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { Routine } from '../components/Job/api';
import cronParser from 'cron-parser';

const ROUTINE_CHECK_KEY = 'routine-last-check';
const CHECK_INTERVAL = 60000; // Check every minute

export interface UseRoutineSchedulerOptions {
  currentTasks?: any[];
  tasksLoading?: boolean;
}

export function useRoutineScheduler(
  onTasksCreated?: () => void,
  options?: UseRoutineSchedulerOptions
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    checkAndTriggerRoutines();

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
      const opts = optionsRef.current;
      const now = Date.now();
      const lastCheck = parseInt(localStorage.getItem(ROUTINE_CHECK_KEY) || '0', 10);

      let routines: Routine[];
      let existingTasks: any[];

      if (opts?.currentTasks !== undefined && !opts?.tasksLoading) {
        existingTasks = opts.currentTasks;
        routines = await remoteStorageClient.getRoutines() as Routine[];
      } else {
        [routines, existingTasks] = await Promise.all([
          remoteStorageClient.getRoutines() as Promise<Routine[]>,
          remoteStorageClient.getStandaloneTasks()
        ]);
      }

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      for (const routine of routines) {
        if (!routine.cron || !routine.tasks || routine.tasks.length === 0) {
          continue;
        }

        const hasTasksToday = routine.tasks.some(task =>
          existingTasks.some((t: any) =>
            t.routineId === routine.id &&
            t.name === task.name &&
            t.status === 'due' &&
            t.createdAt >= todayStart
          )
        );

        if (hasTasksToday) {
          continue;
        }

        if (shouldTrigger(routine.cron, lastCheck, now)) {
          await triggerRoutine(routine, existingTasks);
        }
      }

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

  const triggerRoutine = async (routine: Routine, existingTasks: any[]) => {
    try {
      const routineInstanceId = `${routine.id}-${Date.now()}`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      for (const task of routine.tasks || []) {
        const existingTaskByInstance = existingTasks.find(
          (t: any) => t.routineInstanceId === routineInstanceId && t.name === task.name
        );
        const existingTaskToday = existingTasks.find(
          (t: any) =>
            t.routineId === routine.id &&
            t.name === task.name &&
            t.status === 'due' &&
            t.createdAt >= todayStart
        );

        if (!existingTaskByInstance && !existingTaskToday) {
          const goalIds = routine.goalIds || (routine.goalId ? [routine.goalId] : []);
          const newTask = {
            id: `${routine.id}-${task.id}-${Date.now()}`,
            name: task.name,
            description: task.description || `Routine: ${routine.name}`,
            status: 'due' as const,
            createdAt: Date.now(),
            routineId: routine.id,
            routineInstanceId,
            ...(goalIds.length > 0 && { goalId: goalIds[0] })
          };

          await remoteStorageClient.addStandaloneTask(newTask);
        }
      }

      if (onTasksCreated) {
        onTasksCreated();
      }
    } catch (error) {
      console.error('Failed to trigger routine:', routine.name, error);
    }
  };
}
