import { useEffect, useRef } from 'react';
import { remoteStorageClient, StandaloneTask } from '../lib/remoteStorage';
import { Routine } from '../components/Job/api';
import cronParser from 'cron-parser';
import { triggerRoutine } from './routineTriggerUtils';
import { fetchRoutines, fetchActiveTasks, setTasksCache, markSelfWrite } from '../lib/query/collections';

const ROUTINE_CHECK_KEY = 'routine-last-check';
const CHECK_INTERVAL = 60000; // Check every minute

export interface UseRoutineSchedulerOptions {
  currentTasks?: StandaloneTask[];
  tasksLoading?: boolean;
}

export function useRoutineScheduler(
  onTasksCreated?: () => void,
  options?: UseRoutineSchedulerOptions
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);
  const checkAndTriggerRoutinesRef = useRef<(now: number) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    optionsRef.current = options;
  });

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

  const checkAndTriggerRoutines = async (now: number) => {
    try {
      const opts = optionsRef.current;
      const lastCheck = parseInt(localStorage.getItem(ROUTINE_CHECK_KEY) || '0', 10);

      let routines: Routine[];
      let existingTasks: StandaloneTask[];

      if (opts?.currentTasks !== undefined && !opts?.tasksLoading) {
        existingTasks = opts.currentTasks;
        routines = await fetchRoutines();
      } else {
        // Served from the query cache when fresh — no extra pod round trip.
        [routines, existingTasks] = await Promise.all([fetchRoutines(), fetchActiveTasks()]);
      }

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      // Clean up stale 'due' routine tasks from previous days
      // and deduplicate same-day routine tasks (keep newest per routine+name)
      const toDelete: string[] = [];
      const seen = new Map<string, { id: string; createdAt: number }>();

      for (const t of existingTasks) {
        if (!t.routineId || t.status !== 'due') continue;

        // Previous day — always remove
        if (t.createdAt < todayStart) {
          toDelete.push(t.id);
          continue;
        }

        // Deduplicate today's tasks by routineId+name: keep the newest
        const key = `${t.routineId}:${t.name}`;
        const existing = seen.get(key);
        if (existing) {
          // Delete the older one
          if (t.createdAt > existing.createdAt) {
            toDelete.push(existing.id);
            seen.set(key, { id: t.id, createdAt: t.createdAt });
          } else {
            toDelete.push(t.id);
          }
        } else {
          seen.set(key, { id: t.id, createdAt: t.createdAt });
        }
      }

      for (const id of toDelete) {
        markSelfWrite('tasks');
        setTasksCache((prev) => prev.filter((t) => t.id !== id));
        await remoteStorageClient.deleteStandaloneTask(id);
      }
      if (toDelete.length > 0) {
        const deleteSet = new Set(toDelete);
        existingTasks = existingTasks.filter(t => !deleteSet.has(t.id));
      }

      for (const routine of routines) {
        if (!routine.cron || !routine.tasks || routine.tasks.length === 0) {
          continue;
        }

        // Check if tasks for today already exist (deterministic ID or old-format)
        const allTasksExist = routine.tasks.every(task =>
          existingTasks.some(t =>
            t.id === `${routine.id}-${task.id}-${todayStart}` ||
            (t.routineId === routine.id && t.name === task.name && t.createdAt >= todayStart)
          )
        );

        if (allTasksExist) {
          continue;
        }

        // Check if the cron should have fired today (even if lastCheck missed it)
        const shouldHaveFiredToday = shouldTrigger(routine.cron, 0, now);

        if (shouldHaveFiredToday || shouldTrigger(routine.cron, lastCheck, now)) {
          await triggerRoutine(routine, existingTasks, onTasksCreated, now);
        }
      }

      localStorage.setItem(ROUTINE_CHECK_KEY, now.toString());
    } catch (error) {
      console.error('Failed to check routines:', error);
    }
  };

  useEffect(() => {
    checkAndTriggerRoutinesRef.current = checkAndTriggerRoutines;
  });

  useEffect(() => {
    queueMicrotask(() => checkAndTriggerRoutinesRef.current(Date.now()));

    intervalRef.current = setInterval(() => {
      checkAndTriggerRoutinesRef.current(Date.now());
    }, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
