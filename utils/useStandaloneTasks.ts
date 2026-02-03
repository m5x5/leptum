import { useState, useEffect, useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { v4 as uuidv4 } from 'uuid';
import { Emotion } from '../components/ui/emotion-selector';

export interface StandaloneTask {
   id: string;
   name: string;
   description?: string;
   status: 'due' | 'completed' | 'pending';
   createdAt: number;
   completedAt?: number;
   archivedAt?: number; // Timestamp when the task was archived
   routineId?: string;
   routineInstanceId?: string; // Unique ID for a specific routine trigger instance
   goalId?: string; // Optional - associated goal for this task
   effort?: 'XS' | 'S' | 'M' | 'L' | 'XL'; // Effort estimation
   numericEstimate?: number; // Numeric points effort estimation
   emotions?: Emotion[]; // Emotions felt after completing the task
 }

export function useStandaloneTasks() {
  const [tasks, setTasks] = useState<StandaloneTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Load home tasks: migrate once if needed, then read from home-tasks.
  // Auto-archive tasks created more than a week ago.
  const loadTasks = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      await remoteStorageClient.migrateToHomeAndArchivedIfNeeded();
      const remoteTasks = (await remoteStorageClient.getHomeTasks()) as StandaloneTask[];

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = remoteTasks.filter((t: StandaloneTask) => t.createdAt > oneWeekAgo);
      const toArchive = remoteTasks.filter((t: StandaloneTask) => t.createdAt <= oneWeekAgo);
      if (toArchive.length > 0) {
        await remoteStorageClient.saveHomeTasks(recent);
        await remoteStorageClient.appendArchivedTasks(toArchive);
        setTasks(recent);
      } else {
        setTasks(remoteTasks);
      }
    } catch (error) {
      console.error('Failed to load standalone tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTasks();
    
    // Listen for task updates from other components (e.g., TrackingCounter)
    const handleTasksUpdated = () => {
      loadTasks();
    };
    window.addEventListener('tasksUpdated', handleTasksUpdated);
    
    return () => {
      window.removeEventListener('tasksUpdated', handleTasksUpdated);
    };
  }, [loadTasks]);

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

    try {
      await remoteStorageClient.addStandaloneTask(newTask);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (error) {
      console.error('Failed to add standalone task:', error);
      throw error;
    }
  }, []);

  // Update a task
  const updateTask = useCallback(async (taskId: string, updates: Partial<StandaloneTask>) => {
    try {
      await remoteStorageClient.updateStandaloneTask(taskId, updates);
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (error) {
      console.error('Failed to update standalone task:', error);
      throw error;
    }
  }, [tasks]);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await remoteStorageClient.deleteStandaloneTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete standalone task:', error);
      throw error;
    }
  }, []);

  // Check if all tasks for a routine instance are completed
  const checkRoutineCompletion = useCallback(async (routineInstanceId: string, routineId?: string) => {
    try {
      const allTasks = await remoteStorageClient.getStandaloneTasks();
      const routineTasks = allTasks.filter((t: StandaloneTask) => t.routineInstanceId === routineInstanceId);

      if (routineTasks.length === 0) return;

      // Check if all tasks are completed
      const allCompleted = routineTasks.every((t: StandaloneTask) => t.status === 'completed');

      if (allCompleted && routineId) {
        // Get routine name
        const routines = await remoteStorageClient.getRoutines();
        const routine = routines.find((r: any) => r.id === routineId);

        if (routine) {
          // Use the creation date of the routine tasks (when they were scheduled)
          // rather than when they were completed
          const routineCreatedAt = routineTasks[0]?.createdAt || Date.now();

          // Save the completion
          const completion = {
            routineId,
            routineInstanceId,
            routineName: (routine as any).name as string,
            completedAt: routineCreatedAt,
            taskCount: routineTasks.length
          };

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
    
    // Add emotions if provided
    if (emotions && emotions.length > 0) {
      updates.emotions = emotions;
    }
    
    await updateTask(taskId, updates);

    // Record velocity data for completed task
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const completedTask = { ...task, ...updates };
      await remoteStorageClient.recordTaskCompletionForVelocity(completedTask);
    }

    // Check if this completes a routine
    if (task && task.routineInstanceId) {
      await checkRoutineCompletion(task.routineInstanceId, task.routineId);
    }
  }, [updateTask, tasks, checkRoutineCompletion]);

  // Mark task as incomplete
  const uncompleteTask = useCallback(async (taskId: string) => {
    const updates = {
      status: 'due' as const,
    };
    await updateTask(taskId, updates);

    // If this task is part of a routine, delete the routine completion
    const task = tasks.find(t => t.id === taskId);
    if (task && task.routineInstanceId) {
      try {
        await remoteStorageClient.deleteRoutineCompletion(task.routineInstanceId);
      } catch (error) {
        console.error('Failed to delete routine completion:', error);
      }
    }
  }, [updateTask, tasks]);

  // Archive all tasks for a specific day: move from home to archived bucket
  const archiveDay = useCallback(async (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    try {
      const homeTasks = await remoteStorageClient.getHomeTasks();
      const toArchive = homeTasks.filter((task: StandaloneTask) => {
        const taskDate = task.completedAt || task.createdAt;
        return taskDate >= dayStart && taskDate <= dayEnd;
      });
      if (toArchive.length === 0) return;
      const remaining = homeTasks.filter((task: StandaloneTask) => {
        const taskDate = task.completedAt || task.createdAt;
        return taskDate < dayStart || taskDate > dayEnd;
      });
      await remoteStorageClient.saveHomeTasks(remaining);
      await remoteStorageClient.appendArchivedTasks(toArchive);
      setTasks(remaining);
    } catch (error) {
      console.error('Failed to archive day:', error);
      throw error;
    }
  }, []);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    archiveDay,
    reload: loadTasks
  };
} 