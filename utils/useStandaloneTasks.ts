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
   routineId?: string;
   routineInstanceId?: string; // Unique ID for a specific routine trigger instance
   goalId?: string; // Optional - associated goal for this task
   tshirtSize?: 'XS' | 'S' | 'M' | 'L' | 'XL'; // T-shirt size effort estimation
   numericEstimate?: number; // Numeric points effort estimation
   emotions?: Emotion[]; // Emotions felt after completing the task
 }

export function useStandaloneTasks() {
  const [tasks, setTasks] = useState<StandaloneTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Load tasks from RemoteStorage and sync with todonna
  const loadTasks = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // First, try to import any new tasks from todonna
      await remoteStorageClient.importFromTodonna();
      
      // Then get all local tasks
      const remoteTasks = await remoteStorageClient.getStandaloneTasks();
      setTasks(remoteTasks);
    } catch (error) {
      console.error('Failed to load standalone tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync to todonna helper function
  const syncToTodonna = useCallback(async (task: StandaloneTask) => {
    try {
      await remoteStorageClient.saveToTodonna(task);
    } catch (error) {
      console.error('Failed to sync task to todonna:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Add a new standalone task
  const addTask = useCallback(async (name: string, description?: string, options?: { tshirtSize?: 'XS' | 'S' | 'M' | 'L' | 'XL', numericEstimate?: number }) => {
    const newTask: StandaloneTask = {
      id: uuidv4(),
      name,
      description,
      status: 'due',
      createdAt: Date.now(),
      tshirtSize: options?.tshirtSize,
      numericEstimate: options?.numericEstimate
    };

    try {
      await remoteStorageClient.addStandaloneTask(newTask);
      await syncToTodonna(newTask); // Sync to todonna
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (error) {
      console.error('Failed to add standalone task:', error);
      throw error;
    }
  }, [syncToTodonna]);

  // Update a task
  const updateTask = useCallback(async (taskId: string, updates: Partial<StandaloneTask>) => {
    try {
      await remoteStorageClient.updateStandaloneTask(taskId, updates);
      
      const updatedTask = tasks.find(task => task.id === taskId);
      if (updatedTask) {
        const taskToSync = { ...updatedTask, ...updates };
        await syncToTodonna(taskToSync); // Sync updated task to todonna
      }
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (error) {
      console.error('Failed to update standalone task:', error);
      throw error;
    }
  }, [tasks, syncToTodonna]);

  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await remoteStorageClient.deleteStandaloneTask(taskId);
      await remoteStorageClient.deleteFromTodonna(taskId); // Delete from todonna too
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

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    reload: loadTasks
  };
} 