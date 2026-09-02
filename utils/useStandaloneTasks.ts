import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { remoteStorageClient, StandaloneTask } from '../lib/remoteStorage';
import { v4 as uuidv4 } from 'uuid';
import { Emotion } from '../components/ui/emotion-selector';
import { useResource } from '@ldo/solid-react';
import {
  useTasksQuery,
  fetchActiveTasks,
  fetchRoutines,
  getActiveTasksCache,
  setTasksCache,
  setCompletionsCache,
  invalidate,
  markSelfWrite,
  isRecentSelfWrite,
} from '../lib/query/collections';

export type { StandaloneTask };

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NOTIFICATION_DEBOUNCE_MS = 2_000;

// Auto-archiving runs at most once per page load — it used to run on every
// refetch, and each run PUT every task it touched.
let autoArchiveRan = false;

export function useStandaloneTasks() {
  const query = useTasksQuery();
  const allTasks = query.data;

  // "Home" tasks = not archived. Memoised so consumers get a stable array
  // between refetches that return structurally-equal data.
  const tasks = useMemo(() => (allTasks ?? []).filter((t) => !t.archivedAt), [allTasks]);
  const loading = query.isPending;

  // Auto-archive tasks created more than a week ago (once per session).
  useEffect(() => {
    if (autoArchiveRan || !allTasks) return;
    const cutoff = Date.now() - ONE_WEEK_MS;
    const toArchive = allTasks.filter((t) => !t.archivedAt && t.createdAt <= cutoff);
    autoArchiveRan = true;
    if (toArchive.length === 0) return;
    const ids = new Set(toArchive.map((t) => t.id));
    const now = Date.now();
    markSelfWrite('tasks');
    setTasksCache((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, archivedAt: t.archivedAt ?? now } : t)));
    remoteStorageClient.appendArchivedTasks(toArchive).catch((error) => {
      console.error('Failed to auto-archive tasks:', error);
      void invalidate('tasks');
    });
  }, [allTasks]);

  // Same-tab writes from components that don't go through this hook.
  useEffect(() => {
    const handleTasksUpdated = () => {
      void invalidate('tasks');
    };
    window.addEventListener('tasksUpdated', handleTasksUpdated);
    return () => window.removeEventListener('tasksUpdated', handleTasksUpdated);
  }, []);

  // Live refresh via Solid Notifications on the tasks container. The LDO
  // resource is used purely as a change signal — data always comes from the
  // query cache. Notifications caused by our own writes are ignored (we already
  // updated the cache optimistically), and the rest are debounced so a burst
  // of pod changes costs one re-list.
  const [tasksContainerUrl, setTasksContainerUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    remoteStorageClient.getTasksContainerUrl().then((url) => {
      if (!cancelled && url) setTasksContainerUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // `{ subscribe: true }` keys its subscription on the stable underlying
  // resource, so this doesn't loop even though the returned proxy identity
  // changes on every update (that identity change is our signal).
  const tasksContainerResource = useResource(tasksContainerUrl, { subscribe: true });
  const debounceRef = useRef<number | null>(null);
  const firstSignalSeen = useRef(false);
  useEffect(() => {
    if (!tasksContainerResource) return;
    // The first identity is the initial read, not a change.
    if (!firstSignalSeen.current) {
      firstSignalSeen.current = true;
      return;
    }
    if (isRecentSelfWrite('tasks')) return;
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void invalidate('tasks');
    }, NOTIFICATION_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [tasksContainerResource]);

  const reload = useCallback(() => invalidate('tasks'), []);

  // Add a new standalone task
  const addTask = useCallback(async (name: string, description?: string, options?: { effort?: 'XS' | 'S' | 'M' | 'L' | 'XL', numericEstimate?: number }) => {
    const newTask: StandaloneTask = {
      id: uuidv4(),
      name,
      description,
      status: 'due',
      createdAt: Date.now(),
      effort: options?.effort,
      numericEstimate: options?.numericEstimate
    };

    markSelfWrite('tasks');
    setTasksCache((prev) => [...prev, newTask]);
    try {
      await remoteStorageClient.addStandaloneTask(newTask);
      return newTask;
    } catch (error) {
      console.error('Failed to add standalone task:', error);
      setTasksCache((prev) => prev.filter((t) => t.id !== newTask.id));
      throw error;
    }
  }, []);

  // Update a task
  const updateTask = useCallback(async (taskId: string, updates: Partial<StandaloneTask>) => {
    const previous = getActiveTasksCache().find((t) => t.id === taskId);
    markSelfWrite('tasks');
    setTasksCache((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
    try {
      await remoteStorageClient.updateStandaloneTask(taskId, updates);
    } catch (error) {
      console.error('Failed to update standalone task:', error);
      if (previous) setTasksCache((prev) => prev.map((t) => (t.id === taskId ? previous : t)));
      throw error;
    }
  }, []);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    const previous = getActiveTasksCache().find((t) => t.id === taskId);
    markSelfWrite('tasks');
    setTasksCache((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await remoteStorageClient.deleteStandaloneTask(taskId);
    } catch (error) {
      console.error('Failed to delete standalone task:', error);
      if (previous) setTasksCache((prev) => [...prev, previous]);
      throw error;
    }
  }, []);

  // Check if all tasks for a routine instance are completed
  const checkRoutineCompletion = useCallback(async (routineInstanceId: string, routineId?: string) => {
    try {
      const allActive = await fetchActiveTasks();
      const routineTasks = allActive.filter((t) => t.routineInstanceId === routineInstanceId);
      if (routineTasks.length === 0) return;

      const allCompleted = routineTasks.every((t) => t.status === 'completed');
      if (allCompleted && routineId) {
        const routines = await fetchRoutines();
        const routine = routines.find((r) => r.id === routineId);
        if (routine) {
          // Use the creation date of the routine tasks (when they were scheduled)
          // rather than when they were completed
          const routineCreatedAt = routineTasks[0]?.createdAt || Date.now();
          const completion = {
            routineId,
            routineInstanceId,
            routineName: routine.name,
            completedAt: routineCreatedAt,
            taskCount: routineTasks.length
          };
          markSelfWrite('completions');
          setCompletionsCache((prev) => [...prev, completion]);
          await remoteStorageClient.addRoutineCompletion(completion);
        }
      }
    } catch (error) {
      console.error('Failed to check routine completion:', error);
    }
  }, []);

  // Mark task as completed
  const completeTask = useCallback(async (taskId: string, emotions?: Emotion[]) => {
    const updates: Partial<StandaloneTask> = {
      status: 'completed' as const,
      completedAt: Date.now()
    };
    if (emotions && emotions.length > 0) {
      updates.emotions = emotions;
    }

    const task = getActiveTasksCache().find((t) => t.id === taskId);
    await updateTask(taskId, updates);

    // Record velocity data for completed task
    if (task) {
      const completedTask = { ...task, ...updates };
      await remoteStorageClient.recordTaskCompletionForVelocity(completedTask);
    }

    // Check if this completes a routine
    if (task && task.routineInstanceId) {
      await checkRoutineCompletion(task.routineInstanceId, task.routineId);
    }
  }, [updateTask, checkRoutineCompletion]);

  // Mark task as incomplete
  const uncompleteTask = useCallback(async (taskId: string) => {
    const task = getActiveTasksCache().find((t) => t.id === taskId);
    await updateTask(taskId, { status: 'due' as const });

    // If this task is part of a routine, delete the routine completion
    if (task && task.routineInstanceId) {
      const instanceId = task.routineInstanceId;
      try {
        markSelfWrite('completions');
        setCompletionsCache((prev) => prev.filter((c) => c.routineInstanceId !== instanceId));
        await remoteStorageClient.deleteRoutineCompletion(instanceId);
      } catch (error) {
        console.error('Failed to delete routine completion:', error);
        void invalidate('completions');
      }
    }
  }, [updateTask]);

  // Archive all home tasks that belong to a given day.
  const archiveDay = useCallback(async (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    const toArchive = getActiveTasksCache().filter((task) => {
      const taskDate = task.completedAt || task.createdAt;
      return taskDate >= dayStart && taskDate <= dayEnd;
    });
    if (toArchive.length === 0) return;
    const ids = new Set(toArchive.map((t) => t.id));
    const now = Date.now();

    markSelfWrite('tasks');
    setTasksCache((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, archivedAt: t.archivedAt ?? now } : t)));
    try {
      await remoteStorageClient.appendArchivedTasks(toArchive);
    } catch (error) {
      console.error('Failed to archive day:', error);
      void invalidate('tasks');
      throw error;
    }
  }, []);

  return {
    tasks,
    /** Every task including archived ones (for the archive view). */
    allTasks: allTasks ?? [],
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    archiveDay,
    reload
  };
}
