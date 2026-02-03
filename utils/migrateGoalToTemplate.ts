/**
 * Migrate an existing goal to use a template
 * Converts impacts (activities) to tracking data
 */

import { remoteStorageClient } from '../lib/remoteStorage';
import { Goal, DailyTrackingEntry } from './useGoals';
import { getTemplateById, createRoutineFromTemplate, createRoutinesFromTemplate } from './goalTemplatesWithTracking';
import { Routine } from '../components/Job/api';

/**
 * Migrate routine completions to tracking data for a goal
 * Groups completions by date and counts them (each completion = +1 unit)
 */
export async function migrateRoutineCompletionsToTracking(routineId: string): Promise<DailyTrackingEntry[]> {
  try {
    const completions = await remoteStorageClient.getRoutineCompletions();
    const routineCompletions = completions.filter((c: any) => c.routineId === routineId);
    
    // Group by date (YYYY-MM-DD)
    const dailyEntries: Record<string, number> = {};
    
    // Helper to format date consistently (YYYY-MM-DD in local timezone)
    const formatDateLocal = (date: Date): string => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    
    routineCompletions.forEach((completion: any) => {
      // Use consistent date formatting (YYYY-MM-DD in local timezone)
      const completionDate = new Date(completion.completedAt);
      const date = formatDateLocal(completionDate);
      // Count each completion as +1 (assuming each completion = 1 glass/unit)
      dailyEntries[date] = (dailyEntries[date] || 0) + 1;
    });
    
    // Convert to tracking entries
    const trackingEntries: DailyTrackingEntry[] = Object.entries(dailyEntries).map(([date, count]) => ({
      date,
      value: count,
      timestamp: new Date(date).getTime()
    }));
    
    return trackingEntries;
  } catch (error) {
    console.error('Failed to migrate routine completions to tracking:', error);
    return [];
  }
}

/**
 * Migrate impacts to tracking data for a goal
 * Groups impacts by date and counts them
 */
export async function migrateImpactsToTracking(goalId: string): Promise<DailyTrackingEntry[]> {
  try {
    const impacts = await remoteStorageClient.getImpacts();
    const goalImpacts = impacts.filter((i: any) => i.goalId === goalId);
    
    // Group by date (YYYY-MM-DD)
    const dailyEntries: Record<string, number> = {};
    
    goalImpacts.forEach((impact: any) => {
      const date = new Date(impact.date).toISOString().split('T')[0]; // YYYY-MM-DD
      // Count each impact as +1 (assuming each impact = 1 glass/unit)
      dailyEntries[date] = (dailyEntries[date] || 0) + 1;
    });
    
    // Convert to tracking entries
    const trackingEntries: DailyTrackingEntry[] = Object.entries(dailyEntries).map(([date, count]) => ({
      date,
      value: count,
      timestamp: new Date(date).getTime()
    }));
    
    return trackingEntries;
  } catch (error) {
    console.error('Failed to migrate impacts to tracking:', error);
    return [];
  }
}

/**
 * Apply a template to an existing goal
 * - Migrates routine completions → trackingData (if routine linked)
 * - Falls back to impacts → trackingData (if no routine)
 * - Links existing routine to goal (if routineId provided)
 * - Creates routine if template has routineConfig and no routine linked
 * - Updates goal with template config
 */
export async function applyTemplateToGoal(
  goalId: string,
  templateId: string,
  routineId?: string // Optional: link existing routine to goal
): Promise<{ goal: Goal; routine?: Routine }> {
  try {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Get goal
    const goals = await remoteStorageClient.getGoals() as Goal[];
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }
    
    let routine: Routine | undefined | null;
    let trackingEntries: DailyTrackingEntry[] = [];
    
    // First, check if there's already a routine linked to this goal
    const allRoutines = await remoteStorageClient.getRoutines();
    const alreadyLinkedRoutine = (allRoutines as Routine[]).find(
      r => r.goalIds?.includes(goalId)
    );
    
    // If routineId provided, link that specific routine and migrate its completions
    if (routineId) {
      routine = (allRoutines as Routine[]).find(r => r.id === routineId);
      
      if (routine) {
        // Link routine to goal (add goalId to routine's goalIds array)
        const goalIds = routine.goalIds || [];
        if (!goalIds.includes(goalId)) {
          routine.goalIds = [...goalIds, goalId];
          await remoteStorageClient.saveRoutine(routine);
        }
        
        // Migrate routine completions to tracking data
        const migratedEntries = await migrateRoutineCompletionsToTracking(routineId);
        trackingEntries = migratedEntries;
      }
    }
    // If no routineId provided but there's already a linked routine, use that one
    else if (alreadyLinkedRoutine) {
      routine = alreadyLinkedRoutine;
      // Migrate routine completions
      trackingEntries = await migrateRoutineCompletionsToTracking(alreadyLinkedRoutine.id);
    }
    // If no routine linked, handle routine creation
    else if (!routine) {
      // Check if template uses multiple routines (nutrition)
      if (template.routineConfigs && template.routineConfigs.length > 0) {
        // Check if any of the routines already exist
        const existingRoutines = template.routineConfigs
          .map(config => (allRoutines as Routine[]).find(r => r.name === config.name))
          .filter(Boolean) as Routine[];
        
        if (existingRoutines.length > 0) {
          // Link all existing routines to goal (batch updates)
          const routinesToSave: Routine[] = [];
          for (const existingRoutine of existingRoutines) {
            const goalIds = existingRoutine.goalIds || [];
            if (!goalIds.includes(goalId)) {
              existingRoutine.goalIds = [...goalIds, goalId];
              routinesToSave.push(existingRoutine);
            }
          }
          // Save all routine updates in sequence with small delays to avoid debt
          for (let i = 0; i < routinesToSave.length; i++) {
            await remoteStorageClient.saveRoutine(routinesToSave[i]);
            // Small delay between saves to prevent overwhelming RemoteStorage
            if (i < routinesToSave.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          // Migrate completions from all routines
          const allEntries: DailyTrackingEntry[] = [];
          for (const existingRoutine of existingRoutines) {
            const entries = await migrateRoutineCompletionsToTracking(existingRoutine.id);
            // Merge entries by date
            entries.forEach(entry => {
              const existing = allEntries.find(e => e.date === entry.date);
              if (existing) {
                existing.value += entry.value;
              } else {
                allEntries.push(entry);
              }
            });
          }
          trackingEntries = allEntries;
        } else {
          // Create all routines from template (with delays to avoid debt)
          const newRoutines = createRoutinesFromTemplate(template, goalId, allRoutines.length);
          // Save routines sequentially with delays to prevent "maximum debt" errors
          for (let i = 0; i < newRoutines.length; i++) {
            await remoteStorageClient.saveRoutine(newRoutines[i]);
            // Small delay between saves to prevent overwhelming RemoteStorage sync
            if (i < newRoutines.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          // Set the first routine as the "main" one for backwards compatibility
          routine = newRoutines[0];
        }
      } 
      // Single routine template (hydration)
      else if (template.routineConfig) {
        const existingRoutineByName = (allRoutines as Routine[]).find(
          r => r.name === template.routineConfig?.name
        );
        
        if (existingRoutineByName) {
          routine = existingRoutineByName;
          // Link routine to goal
          const goalIds = routine.goalIds || [];
          if (!goalIds.includes(goalId)) {
            routine.goalIds = [...goalIds, goalId];
            await remoteStorageClient.saveRoutine(routine);
          }
          // Migrate routine completions
          trackingEntries = await migrateRoutineCompletionsToTracking(existingRoutineByName.id);
        } else {
          // Only create new routine if none exists
          routine = createRoutineFromTemplate(template, goalId, allRoutines.length);
          if (routine) {
            await remoteStorageClient.saveRoutine(routine);
          }
        }
      }
    }
    
    // Fallback: migrate impacts if no routine completions found
    if (trackingEntries.length === 0) {
      trackingEntries = await migrateImpactsToTracking(goalId);
    }
    
    // Update goal with template config
    const updatedGoal: Goal = {
      ...goal,
      templateId: templateId,
      trackingConfig: template.trackingConfig,
      trackingData: {
        entries: trackingEntries
      },
      // Add milestones if template has them
      milestones: template.milestones?.map((m, index) => ({
        id: `milestone-${Date.now()}-${index}`,
        name: m.name,
        order: m.order,
        completed: false,
        targetDate: goal.createdAt ? goal.createdAt + (m.daysOffset || 0) * 24 * 60 * 60 * 1000 : undefined
      })) || goal.milestones
    };
    
    await remoteStorageClient.saveGoal(updatedGoal);
    
    return { goal: updatedGoal, routine: routine || undefined };
  } catch (error) {
    console.error('Failed to apply template to goal:', error);
    throw error;
  }
}
