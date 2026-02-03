import { useState, useEffect } from 'react';
import { Goal, GoalTrackingConfig } from '../../utils/useGoals';
import { remoteStorageClient } from '../../lib/remoteStorage';
import { PlusIcon } from '@heroicons/react/solid';
import { useRoutineCompletions } from '../../utils/useRoutineCompletions';
import { v4 as uuidv4 } from 'uuid';

interface TrackingCounterProps {
  goal: Goal;
  config: GoalTrackingConfig;
  entries: any[]; // Not used anymore - we read from RoutineCompletions
  onUpdate: () => void;
  embedded?: boolean; // When true, removes card border and title for integration into routine view
  showHistory?: boolean; // When false, hides the 7-day history chart
  showQuickAdd?: boolean; // When false, hides the quick add buttons
}

// Helper to format date consistently (YYYY-MM-DD in local timezone)
function formatDateLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Helper to get start of day timestamp
function getStartOfDay(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export function TrackingCounter({ goal, config, entries, onUpdate, embedded = false, showHistory = true, showQuickAdd = true }: TrackingCounterProps) {
  const { completions, reload: reloadCompletions, loading: completionsLoading } = useRoutineCompletions();
  
  // Find the linked routine for this goal
  const [linkedRoutine, setLinkedRoutine] = useState<any>(null);
  const [routineLoading, setRoutineLoading] = useState(true);
  
  useEffect(() => {
    const loadRoutine = async () => {
      setRoutineLoading(true);
      try {
        const routines = await remoteStorageClient.getRoutines();
        const routine = (routines as any[]).find(
          (r: any) => r.goalIds?.includes(goal.id)
        );
        setLinkedRoutine(routine);
        
        if (!routine) {
          console.warn(`TrackingCounter: No linked routine found for goal "${goal.name}" (ID: ${goal.id})`);
        }
      } catch (error) {
        console.error('Failed to load routine:', error);
      } finally {
        setRoutineLoading(false);
      }
    };
    loadRoutine();
  }, [goal.id]);
  
  // Count today's completions for this routine
  const todayStart = getStartOfDay();
  const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1; // End of today
  
  // Count today's completions - check by routine ID first, fallback to routine name
  // (in case routine ID changed but name stayed the same)
  const todayCompletions = linkedRoutine
    ? completions.filter(
        c => {
          const matchesId = c.routineId === linkedRoutine.id;
          const matchesName = c.routineName === linkedRoutine.name;
          const isToday = c.completedAt >= todayStart && c.completedAt <= todayEnd;
          return (matchesId || matchesName) && isToday;
        }
      )
    : [];
  const todayValue = todayCompletions.length;
  
  const target = config.dailyTarget || 8;
  const maxPerDay = config.maxPerDay || target * 1.5;
  
  const addValue = async (increment: number) => {
    if (!linkedRoutine) return;
    
    // Handle increment (adding)
    if (increment > 0) {
      const newValue = todayValue + increment;
      if (newValue > maxPerDay) return;
      
      // For each increment, create:
      // 1. A RoutineCompletion (for tracking/streaks)
      // 2. A StandaloneTask marked as completed (so it shows in task list)
      for (let i = 0; i < increment; i++) {
        const routineInstanceId = `${linkedRoutine.id}-manual-${Date.now()}-${i}`;
        const completedAt = Date.now();
        
        // Create RoutineCompletion
        const completion = {
          routineId: linkedRoutine.id,
          routineInstanceId,
          routineName: linkedRoutine.name,
          completedAt,
          taskCount: linkedRoutine.tasks?.length || 1
        };
        await remoteStorageClient.addRoutineCompletion(completion);
        
        // Create a StandaloneTask for each task in the routine, marked as completed
        // This makes it show up in the task list as a completed task
        if (linkedRoutine.tasks && linkedRoutine.tasks.length > 0) {
          for (const taskName of linkedRoutine.tasks) {
            const task = {
              id: uuidv4(),
              name: taskName,
              status: 'completed' as const,
              createdAt: completedAt,
              completedAt,
              routineId: linkedRoutine.id,
              routineInstanceId,
              goalId: goal.id,
              effort: 'XS' as const // Quick tracking actions are minimal effort
            };
            await remoteStorageClient.addStandaloneTask(task);
          }
        } else {
          // If routine has no tasks, create a single task representing the completion
          const task = {
            id: uuidv4(),
            name: `${linkedRoutine.name} - ${config.unit}`,
            status: 'completed' as const,
            createdAt: completedAt,
            completedAt,
            routineId: linkedRoutine.id,
            routineInstanceId,
            goalId: goal.id,
            effort: 'XS' as const
          };
          await remoteStorageClient.addStandaloneTask(task);
        }
      }
    } 
    // Handle decrement (removing) - clicking on a filled glass
    else if (increment < 0 && todayValue > 0) {
      const removeCount = Math.min(Math.abs(increment), todayValue);
      
      // Remove the most recent completions
      const toRemove = todayCompletions
        .sort((a, b) => b.completedAt - a.completedAt) // Most recent first
        .slice(0, removeCount);
      
      for (const completion of toRemove) {
        // Delete RoutineCompletion
        await remoteStorageClient.deleteRoutineCompletion(completion.routineInstanceId);
        
        // Delete associated StandaloneTasks (batch delete to avoid conflicts)
        const tasks = await remoteStorageClient.getStandaloneTasks();
        const tasksToDelete = tasks.filter(
          (t: any) => t.routineInstanceId === completion.routineInstanceId
        );
        
        // Batch delete: remove all tasks in one operation
        if (tasksToDelete.length > 0) {
          const taskIdsToDelete = new Set(tasksToDelete.map((t: any) => t.id));
          const remainingTasks = tasks.filter((t: any) => !taskIdsToDelete.has(t.id));
          await remoteStorageClient.saveStandaloneTasks(remainingTasks);
        }
      }
    }
    
    // Reload completions to update display
    await reloadCompletions();
    
    // Trigger task list reload
    window.dispatchEvent(new CustomEvent('tasksUpdated'));
    
    onUpdate();
  };

  const handleCupClick = async (index: number) => {
    if (!linkedRoutine) return;
    
    const cupNumber = index + 1; // Convert 0-based index to 1-based cup number
    const isFilled = index < todayValue;
    
    if (isFilled) {
      // Clicking a filled cup: unfill this cup and all cups after it
      const cupsToRemove = todayValue - cupNumber;
      if (cupsToRemove > 0) {
        await addValue(-cupsToRemove);
      }
    } else {
      // Clicking an unfilled cup: fill this cup and all cups before it
      const cupsToAdd = cupNumber - todayValue;
      if (cupsToAdd > 0) {
        await addValue(cupsToAdd);
      }
    }
  };
  
  const getIconForIndex = (index: number) => {
    // Use cup emoji for hydration, fallback to config icon
    // 🥤 = beverage box, 💧 = water drop, 🍶 = sake bottle and cup
    return '🥤';
  };
  
  // Show loading state while routine is being loaded
  if (routineLoading || completionsLoading) {
    if (embedded) {
      return <div className="text-sm text-muted-foreground">Loading...</div>;
    }
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{config.icon}</span>
          <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
        </div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  // Show message if no routine is linked
  if (!linkedRoutine) {
    if (embedded) {
      return (
        <div className="text-sm text-muted-foreground">
          No routine linked to this goal. Link a routine to enable tracking.
        </div>
      );
    }
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{config.icon}</span>
          <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          No routine linked to this goal. Link a routine to enable tracking.
        </div>
      </div>
    );
  }
  
  const containerClass = embedded ? "" : "bg-card border border-border rounded-lg p-4";
  const titleSection = embedded ? null : (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-2xl">{config.icon}</span>
      <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
    </div>
  );
  
  return (
    <div className={containerClass}>
      {titleSection}
      
      <div className={embedded ? "mb-0" : "mb-4"}>
        <div className="flex items-baseline gap-2 mb-2">
          <span className={embedded ? "text-lg font-bold text-foreground" : "text-2xl font-bold text-foreground"}>Today: {todayValue}</span>
          <span className={embedded ? "text-xs text-muted-foreground" : "text-muted-foreground"}>/ {target} {config.unit}</span>
        </div>
        
        {/* Progress bar */}
        <div className={`w-full bg-muted rounded-full h-3 ${embedded ? 'mb-3' : 'mb-4'}`}>
          <div
            className="bg-primary rounded-full h-3 transition-all"
            style={{ width: `${Math.min((todayValue / target) * 100, 100)}%` }}
          />
        </div>
        
        {/* Glass icons */}
        <div className={`flex flex-wrap gap-2 ${embedded ? 'mb-0' : 'mb-4'}`}>
          {Array.from({ length: target }).map((_, index) => {
            const isFilled = index < todayValue;
            const cupNumber = index + 1;
            return (
              <button
                key={index}
                onClick={() => handleCupClick(index)}
                className={`${embedded ? 'text-3xl' : 'text-3xl'} transition-all hover:scale-110 ${
                  isFilled ? 'opacity-100' : 'opacity-30 hover:opacity-50'
                }`}
                title={isFilled 
                  ? `Click to set to ${cupNumber - 1} ${config.unit} (unfill this and all after)` 
                  : `Click to set to ${cupNumber} ${config.unit} (fill this and all before)`}
              >
                {getIconForIndex(index)}
              </button>
            );
          })}
        </div>
        
        {/* Quick add buttons */}
        {showQuickAdd && config.increments && config.increments.length > 0 && (
          <div className="flex gap-2">
            {config.increments.map((increment) => (
              <button
                key={increment}
                onClick={() => addValue(increment)}
                disabled={todayValue >= maxPerDay}
                className={`${embedded ? 'px-2 py-1 text-xs' : 'px-3 py-1.5'} bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
              >
                <PlusIcon className={embedded ? "w-3 h-3" : "w-4 h-4"} />
                <span>+{increment}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* 7-day history - calculated from RoutineCompletions */}
      {showHistory && (
        <div className={`${embedded ? 'mt-3 pt-3' : 'mt-4 pt-4'} border-t border-border`}>
          <h4 className={`${embedded ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground mb-2`}>Last 7 days</h4>
          <div className="flex gap-1 items-end h-16">
            {Array.from({ length: 7 }).map((_, index) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - index));
              const dateStart = new Date(date);
              dateStart.setHours(0, 0, 0, 0);
              const dateEnd = new Date(date);
              dateEnd.setHours(23, 59, 59, 999);
              
              // Count completions for this day - check by routine ID or name
              const dayCompletions = linkedRoutine
                ? completions.filter(
                    c => {
                      const matchesId = c.routineId === linkedRoutine.id;
                      const matchesName = c.routineName === linkedRoutine.name;
                      const isInDateRange = c.completedAt >= dateStart.getTime() && c.completedAt <= dateEnd.getTime();
                      return (matchesId || matchesName) && isInDateRange;
                    }
                  )
                : [];
              const value = dayCompletions.length;
              const height = target > 0 ? Math.min((value / target) * 100, 100) : 0;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary rounded-t transition-all"
                    style={{ height: `${height}%`, minHeight: value > 0 ? '4px' : '0' }}
                    title={`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${value} ${config.unit}`}
                  />
                  <span className={`${embedded ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
                    {date.toLocaleDateString('en-US', { day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
