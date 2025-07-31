import { useState, useEffect, useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import { v4 as uuidv4 } from 'uuid';

export interface StandaloneTask {
  id: string;
  name: string;
  description?: string;
  status: 'due' | 'completed' | 'pending';
  createdAt: number;
  completedAt?: number;
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
  const addTask = useCallback(async (name: string, description?: string) => {
    const newTask: StandaloneTask = {
      id: uuidv4(),
      name,
      description,
      status: 'due',
      createdAt: Date.now()
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

  // Mark task as completed
  const completeTask = useCallback(async (taskId: string) => {
    const updates = {
      status: 'completed' as const,
      completedAt: Date.now()
    };
    await updateTask(taskId, updates);
  }, [updateTask]);

  // Mark task as incomplete
  const uncompleteTask = useCallback(async (taskId: string) => {
    const updates = {
      status: 'due' as const,
      completedAt: undefined
    };
    await updateTask(taskId, updates);
  }, [updateTask]);

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