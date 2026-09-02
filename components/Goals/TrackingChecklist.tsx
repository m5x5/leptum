import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { Goal, GoalTrackingConfig, DailyTrackingEntry } from '../../utils/useGoals';
import { remoteStorageClient, Routine } from '../../lib/remoteStorage';
import { fetchActiveTasks, setTasksCache, markSelfWrite } from '../../lib/query/collections';
import { useRoutineCompletions } from '../../utils/useRoutineCompletions';
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from '../ui/checkbox';

interface TrackingChecklistProps {
  goal: Goal;
  config: GoalTrackingConfig;
  entries: DailyTrackingEntry[]; // Not used anymore - we read from RoutineCompletions
  onUpdate: () => void;
  embedded?: boolean;
  showHistory?: boolean;
  showQuickAdd?: boolean;
  routineName?: string; // Optional: filter to show only the option matching this routine name
  /** When set with routineCardActions + embedded: checkbox sits in the lead column; title row is not duplicated below */
  routineCardHeader?: ReactNode;
  routineCardActions?: ReactNode;
}

// Helper to get start of day timestamp
function getStartOfDay(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export function TrackingChecklist({
  goal,
  config,
  entries: _entries,
  onUpdate,
  embedded = false,
  showHistory = true,
  showQuickAdd: _showQuickAdd = true,
  routineName,
  routineCardHeader,
  routineCardActions,
}: TrackingChecklistProps) {
  const mergedRoutineHeader = Boolean(embedded && routineCardHeader && routineCardActions);
  const { completions, reload: reloadCompletions, loading: completionsLoading } = useRoutineCompletions();
  
  // Find all linked routines for this goal (nutrition has multiple routines)
  const [linkedRoutines, setLinkedRoutines] = useState<Routine[]>([]);
  const [routineLoading, setRoutineLoading] = useState(true);

  // Map meal types to routines
  const [mealTypeToRoutine, setMealTypeToRoutine] = useState<Map<string, Routine>>(new Map());
  
  // Memoize options to prevent unnecessary re-renders
  // If routineName is provided, filter to show only the option matching that routine
  const allOptions = useMemo(() => config.options || [], [config.options]);
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
        const goalRoutines = routines.filter(
          r => r.goalIds?.includes(goal.id)
        );
        setLinkedRoutines(goalRoutines);

        // Map meal types to routines based on routine name
        const mealMap = new Map<string, Routine>();
        
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
  }, [goal.id, optionsString, options]);
  
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
  const completedItems = useMemo(() => {
    if (linkedRoutines.length === 0) return new Set<string>();

    // Map completions to meal types based on routine names
    const completed = new Set<string>();

    todayCompletions.forEach((completion) => {
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

    return completed;
  }, [todayCompletions, linkedRoutines, options]);
  
  const toggleItem = useCallback(async (item: string) => {
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
            (a, b) => b.completedAt - a.completedAt
          );
          const completionToRemove = sortedCompletions[0];
          
          await remoteStorageClient.deleteRoutineCompletion(completionToRemove.routineInstanceId);
          
          // Also delete the tasks that belonged to that routine instance — one
          // DELETE each, against the cached task list.
          const tasks = await fetchActiveTasks();
          const tasksToDelete = tasks.filter(
            (t) => t.routineInstanceId === completionToRemove.routineInstanceId
          );
          if (tasksToDelete.length > 0) {
            const ids = new Set(tasksToDelete.map((t) => t.id));
            markSelfWrite('tasks');
            setTasksCache((prev) => prev.filter((t) => !ids.has(t.id)));
            await Promise.all(tasksToDelete.map((t) => remoteStorageClient.deleteStandaloneTask(t.id)));
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
      
      // Small delay to avoid overwhelming storage writes
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
  }, [linkedRoutines, completedItems, mealTypeToRoutine, todayCompletions, goal.id, reloadCompletions, onUpdate]);
  
  // Show loading state
  if (routineLoading || completionsLoading) {
    if (mergedRoutineHeader) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="flex shrink-0 flex-col gap-2" aria-hidden>
                <div className="h-5 w-5 shrink-0 animate-pulse rounded-md bg-muted/50" />
              </div>
              {routineCardHeader}
            </div>
            {routineCardActions}
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      );
    }
    if (embedded) {
      return <div className="text-sm text-muted-foreground">Loading...</div>;
    }
    return (
      <div className="bg-card border border-border rounded-control p-4">
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
    if (mergedRoutineHeader) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="shrink-0 pt-0.5" aria-hidden>
                <div className="h-5 w-5 rounded-md border border-dashed border-border bg-muted/20" />
              </div>
              {routineCardHeader}
            </div>
            {routineCardActions}
          </div>
          <p className="text-sm text-muted-foreground">
            No routines linked to this goal. Apply the template to create meal reminder routines.
          </p>
        </div>
      );
    }
    if (embedded) {
      return (
        <div className="text-sm text-muted-foreground">
          No routines linked to this goal. Apply the template to create meal reminder routines.
        </div>
      );
    }
    return (
      <div className="bg-card border border-border rounded-control p-4">
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
  
  const containerClass = embedded ? "" : "bg-card border border-border rounded-control p-4";
  const titleSection = embedded ? null : (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-2xl">{config.icon}</span>
      <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
    </div>
  );

  const historyBlock =
    showHistory && (
      <div className={`${embedded ? "mt-3 pt-3" : "mt-4 pt-4"} border-t border-border`}>
        <h4 className={`${embedded ? "text-xs" : "text-sm"} mb-2 font-medium text-muted-foreground`}>Last 7 days</h4>
        <div className="flex h-16 items-end gap-1">
          {Array.from({ length: 7 }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            const dateStart = new Date(date);
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(date);
            dateEnd.setHours(23, 59, 59, 999);

            const dayCompletions =
              linkedRoutines.length > 0
                ? completions.filter((c) => {
                    const matchesRoutine = linkedRoutines.some(
                      (r) => c.routineId === r.id || c.routineName === r.name
                    );
                    const isInDateRange =
                      c.completedAt >= dateStart.getTime() && c.completedAt <= dateEnd.getTime();
                    return matchesRoutine && isInDateRange;
                  })
                : [];

            const uniqueMeals = new Set<string>();
            dayCompletions.forEach((c) => {
              const routine = linkedRoutines.find((r) => r.id === c.routineId || r.name === c.routineName);
              if (routine) {
                options.forEach((option) => {
                  if (routine.name.toLowerCase().includes(option.toLowerCase())) {
                    uniqueMeals.add(option);
                  }
                });
              }
            });

            const value = uniqueMeals.size;
            const height = target > 0 ? Math.min((value / target) * 100, 100) : 0;

            return (
              <div key={index} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary transition-all"
                  style={{ height: `${height}%`, minHeight: value > 0 ? "4px" : "0" }}
                  title={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${value} ${config.unit}`}
                />
                <span className="text-xs text-muted-foreground">
                  {date.toLocaleDateString("en-US", { day: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className={containerClass}>
      {titleSection}

      {mergedRoutineHeader ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex shrink-0 flex-col gap-2">
                {options.map((option, index) => {
                  const isChecked = completedItems.has(option);
                  const inputId = `tracking-check-${goal.id}-${index}`;
                  return (
                    <Checkbox
                      key={inputId}
                      id={inputId}
                      boxSize="lg"
                      compact
                      checked={isChecked}
                      onCheckedChange={() => {
                        void toggleItem(option);
                      }}
                      aria-label={option}
                      className={isChecked ? "border border-primary/40" : "border border-muted-foreground/30 bg-muted/40"}
                    />
                  );
                })}
              </div>
              <div className="min-w-0 flex-1">{routineCardHeader}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">{routineCardActions}</div>
          </div>
          {historyBlock}
        </>
      ) : (
        <>
          <div className={embedded ? "mb-0" : "mb-4"}>
            {!embedded && (
              <>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-foreground">Today: {completedCount}</span>
                  <span className="text-muted-foreground">
                    / {target} {config.unit}
                  </span>
                </div>

                <div className="mb-4 h-3 w-full rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min((completedCount / target) * 100, 100)}%` }}
                  />
                </div>
              </>
            )}

            <div className={`space-y-2 ${embedded ? "mb-0" : "mb-4"}`}>
              {options.map((option, index) => {
                const isChecked = completedItems.has(option);
                const inputId = `tracking-check-${goal.id}-${index}`;
                return (
                  <div key={index} className="flex min-h-[44px] items-center gap-3 py-0.5">
                    <Checkbox
                      id={inputId}
                      checked={isChecked}
                      onCheckedChange={() => {
                        void toggleItem(option);
                      }}
                    />
                    <label
                      htmlFor={inputId}
                      className={`flex-1 cursor-pointer text-left text-sm font-medium leading-snug ${
                        isChecked ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {option}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {historyBlock}
        </>
      )}
    </div>
  );
}
