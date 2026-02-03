import { useState, useEffect, useMemo } from 'react';
import { Goal, GoalTrackingConfig } from '../../utils/useGoals';
import { remoteStorageClient } from '../../lib/remoteStorage';
import { useRoutineCompletions } from '../../utils/useRoutineCompletions';
import { v4 as uuidv4 } from 'uuid';
import { CheckIcon } from '@heroicons/react/solid';

interface TrackingChecklistProps {
  goal: Goal;
  config: GoalTrackingConfig;
  entries: any[]; // Not used anymore - we read from RoutineCompletions
  onUpdate: () => void;
  embedded?: boolean;
  showHistory?: boolean;
  showQuickAdd?: boolean;
  routineName?: string; // Optional: filter to show only the option matching this routine name
}

// Helper to get start of day timestamp
function getStartOfDay(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export function TrackingChecklist({ goal, config, entries, onUpdate, embedded = false, showHistory = true, showQuickAdd = true, routineName }: TrackingChecklistProps) {
  const { completions, reload: reloadCompletions, loading: completionsLoading } = useRoutineCompletions();
  
  // Find all linked routines for this goal (nutrition has multiple routines)
  const [linkedRoutines, setLinkedRoutines] = useState<any[]>([]);
  const [routineLoading, setRoutineLoading] = useState(true);
  
  // Map meal types to routines
  const [mealTypeToRoutine, setMealTypeToRoutine] = useState<Map<string, any>>(new Map());
  
  // Memoize options to prevent unnecessary re-renders
  // If routineName is provided, filter to show only the option matching that routine
  const allOptions = config.options || [];
  const options = useMemo(() => {
    if (routineName && allOptions.length > 0) {
      // Find the option that matches the routine name (e.g., "Breakfast Reminder" -> "Breakfast")
      const matchingOption = allOptions.find(option => 
        routineName.toLowerCase().includes(option.toLowerCase())
      );
      return matchingOption ? [matchingOption] : allOptions;
    }
    return allOptions;
  }, [allOptions, routineName]);
  const optionsString = JSON.stringify(options);
  
  useEffect(() => {
    const loadRoutines = async () => {
      setRoutineLoading(true);
      try {
        const routines = await remoteStorageClient.getRoutines();
        const goalRoutines = (routines as any[]).filter(
          (r: any) => r.goalIds?.includes(goal.id)
        );
        setLinkedRoutines(goalRoutines);
        
        // Map meal types to routines based on routine name
        const mealMap = new Map<string, any>();
        
        goalRoutines.forEach(routine => {
          const routineNameLower = routine.name.toLowerCase();
          options.forEach(option => {
            if (routineNameLower.includes(option.toLowerCase())) {
              mealMap.set(option, routine);
            }
          });
        });
        
        setMealTypeToRoutine(mealMap);
      } catch (error) {
        console.error('Failed to load routines:', error);
      } finally {
        setRoutineLoading(false);
      }
    };
    loadRoutines();
  }, [goal.id, optionsString]); // Use stringified options to avoid reference changes
  
  // Memoize today's start/end times to prevent recalculation on every render
  const [todayBounds, setTodayBounds] = useState(() => {
    const start = getStartOfDay();
    return [start, start + (24 * 60 * 60 * 1000) - 1] as const;
  });
  const [todayStart, todayEnd] = todayBounds;
  
  // Update start/end times once per day
  useEffect(() => {
    const updateDayBounds = () => {
      const start = getStartOfDay();
      setTodayBounds([start, start + (24 * 60 * 60 * 1000) - 1]);
    };
    
    // Update immediately
    updateDayBounds();
    
    // Set up interval to update at midnight
    const msUntilMidnight = (24 * 60 * 60 * 1000) - (Date.now() % (24 * 60 * 60 * 1000));
    const timeoutId = setTimeout(() => {
      updateDayBounds();
      // Then update every 24 hours
      const intervalId = setInterval(updateDayBounds, 24 * 60 * 60 * 1000);
      return () => clearInterval(intervalId);
    }, msUntilMidnight);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Memoize today's completions to prevent recalculation
  const todayCompletions = useMemo(() => {
    if (linkedRoutines.length === 0) return [];
    
    return completions.filter(
      c => {
        const matchesRoutine = linkedRoutines.some(
          r => r.id === c.routineId || r.name === c.routineName
        );
        const isToday = c.completedAt >= todayStart && c.completedAt <= todayEnd;
        return matchesRoutine && isToday;
      }
    );
  }, [completions, linkedRoutines, todayStart, todayEnd]);
  
  // Determine which items are completed based on task names in completions
  // We'll check the standalone tasks to see which meal types were logged
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (linkedRoutines.length === 0) {
      setCompletedItems(new Set());
      return;
    }
    
    // Map completions to meal types based on routine names
    const completed = new Set<string>();
    
    todayCompletions.forEach((completion: any) => {
      // Find which routine this completion belongs to
      const routine = linkedRoutines.find(
        r => r.id === completion.routineId || r.name === completion.routineName
      );
      
      if (routine) {
        // Match routine to meal type based on routine name
        options.forEach(option => {
          if (routine.name.toLowerCase().includes(option.toLowerCase())) {
            completed.add(option);
          }
        });
      }
    });
    
    setCompletedItems(completed);
  }, [todayCompletions, linkedRoutines, optionsString]); // Use stringified options
  
  const toggleItem = async (item: string) => {
    if (linkedRoutines.length === 0) return;
    
    const isCompleted = completedItems.has(item);
    
    // Find the routine for this meal type
    const routineForMeal = mealTypeToRoutine.get(item) || 
      linkedRoutines.find(r => r.name.toLowerCase().includes(item.toLowerCase()));
    
    if (!routineForMeal) {
      console.error(`No routine found for meal type: ${item}`);
      return;
    }
    
    if (isCompleted) {
      // Remove: Find and delete the most recent completion for this meal type
      try {
        const completionsForMeal = todayCompletions.filter(
          c => c.routineId === routineForMeal.id || c.routineName === routineForMeal.name
        );
        
        if (completionsForMeal.length > 0) {
          // Sort by completedAt descending and remove the most recent
          const sortedCompletions = completionsForMeal.sort(
            (a: any, b: any) => b.completedAt - a.completedAt
          );
          const completionToRemove = sortedCompletions[0];
          
          await remoteStorageClient.deleteRoutineCompletion(completionToRemove.routineInstanceId);
          
          // Also delete associated tasks (batch delete to avoid conflicts)
          const tasks = await remoteStorageClient.getStandaloneTasks();
          const tasksToDelete = tasks.filter(
            (t: any) => t.routineInstanceId === completionToRemove.routineInstanceId
          );
          
          // Batch delete: remove all tasks in one operation
          if (tasksToDelete.length > 0) {
            const taskIdsToDelete = new Set(tasksToDelete.map((t: any) => t.id));
            const remainingTasks = tasks.filter((t: any) => !taskIdsToDelete.has(t.id));
            await remoteStorageClient.saveStandaloneTasks(remainingTasks);
          }
        }
      } catch (error) {
        console.error('Failed to remove item:', error);
      }
    } else {
      // Add: Create a new completion for this meal type
      const routineInstanceId = `${routineForMeal.id}-${item.toLowerCase()}-${Date.now()}`;
      const completedAt = Date.now();
      
      // Create RoutineCompletion
      const completion = {
        routineId: routineForMeal.id,
        routineInstanceId,
        routineName: routineForMeal.name,
        completedAt,
        taskCount: routineForMeal.tasks?.length || 1
      };
      await remoteStorageClient.addRoutineCompletion(completion);
      
      // Small delay to prevent overwhelming RemoteStorage sync
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create StandaloneTask with meal name
      const task = {
        id: uuidv4(),
        name: `${item} - ${routineForMeal.name}`,
        status: 'completed' as const,
        createdAt: completedAt,
        completedAt,
        routineId: routineForMeal.id,
        routineInstanceId,
        goalId: goal.id,
        effort: 'XS' as const
      };
      await remoteStorageClient.addStandaloneTask(task);
    }
    
    await reloadCompletions();
    window.dispatchEvent(new CustomEvent('tasksUpdated'));
    onUpdate();
  };
  
  // Show loading state
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
  
  // Show message if no routines are linked
  if (linkedRoutines.length === 0) {
    if (embedded) {
      return (
        <div className="text-sm text-muted-foreground">
          No routines linked to this goal. Apply the template to create meal reminder routines.
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
          No routines linked to this goal. Apply the template to create meal reminder routines.
        </div>
      </div>
    );
  }
  
  const completedCount = completedItems.size;
  const target = config.dailyTarget || options.length;
  
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
          <span className={embedded ? "text-lg font-bold text-foreground" : "text-2xl font-bold text-foreground"}>
            Today: {completedCount}
          </span>
          <span className={embedded ? "text-xs text-muted-foreground" : "text-muted-foreground"}>
            / {target} {config.unit}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className={`w-full bg-muted rounded-full h-3 ${embedded ? 'mb-3' : 'mb-4'}`}>
          <div
            className="bg-primary rounded-full h-3 transition-all"
            style={{ width: `${Math.min((completedCount / target) * 100, 100)}%` }}
          />
        </div>
        
        {/* Checklist items */}
        <div className={`space-y-2 ${embedded ? 'mb-0' : 'mb-4'}`}>
          {options.map((option, index) => {
            const isChecked = completedItems.has(option);
            return (
              <button
                key={index}
                onClick={() => toggleItem(option)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isChecked
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isChecked ? 'bg-primary border-primary' : 'border-border'
                }`}>
                  {isChecked && <CheckIcon className="w-4 h-4 text-primary-foreground" />}
                </div>
                <span className={`flex-1 text-left font-medium ${isChecked ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* 7-day history */}
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
              
              // Count unique meal types for this day
              const dayCompletions = linkedRoutines.length > 0
                ? completions.filter(
                    c => {
                      const matchesRoutine = linkedRoutines.some(
                        r => c.routineId === r.id || c.routineName === r.name
                      );
                      const isInDateRange = c.completedAt >= dateStart.getTime() && c.completedAt <= dateEnd.getTime();
                      return matchesRoutine && isInDateRange;
                    }
                  )
                : [];
              
              // Count unique meal types (one per routine)
              const uniqueMeals = new Set<string>();
              dayCompletions.forEach((c: any) => {
                const routine = linkedRoutines.find(
                  r => r.id === c.routineId || r.name === c.routineName
                );
                if (routine) {
                  options.forEach(option => {
                    if (routine.name.toLowerCase().includes(option.toLowerCase())) {
                      uniqueMeals.add(option);
                    }
                  });
                }
              });
              
              const value = uniqueMeals.size;
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
