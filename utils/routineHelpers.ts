/**
 * Helper functions for querying routines by goals
 */

import { Routine } from '../components/Job/api';

/**
 * Get all routines that support a specific goal
 * Supports both goalIds (new) and goalId (old) for backward compatibility
 */
export function getRoutinesForGoal(routines: Routine[], goalId: string): Routine[] {
  return routines.filter(routine => {
    // Check new goalIds array
    if (routine.goalIds && Array.isArray(routine.goalIds)) {
      return routine.goalIds.includes(goalId);
    }
    // Fallback to old goalId for backward compatibility
    return routine.goalId === goalId;
  });
}

/**
 * Get all goal IDs that a routine supports
 * Supports both goalIds (new) and goalId (old) for backward compatibility
 */
export function getGoalIdsForRoutine(routine: Routine): string[] {
  if (routine.goalIds && Array.isArray(routine.goalIds)) {
    return routine.goalIds;
  }
  // Fallback to old goalId for backward compatibility
  return routine.goalId ? [routine.goalId] : [];
}

/**
 * Check if a routine supports a specific goal
 */
export function routineSupportsGoal(routine: Routine, goalId: string): boolean {
  const goalIds = getGoalIdsForRoutine(routine);
  return goalIds.includes(goalId);
}
