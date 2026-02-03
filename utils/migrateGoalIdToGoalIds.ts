/**
 * Migration script to convert routine.goalId (single) to routine.goalIds (array)
 * 
 * This enables many-to-many relationships between routines and goals.
 * 
 * Run this once after deploying the schema changes.
 */

import { remoteStorageClient } from '../lib/remoteStorage';
import { Routine } from '../components/Job/api';

export async function migrateGoalIdToGoalIds(): Promise<{ migrated: number; skipped: number; errors: number }> {
  const stats = { migrated: 0, skipped: 0, errors: 0 };

  try {
    const routines = await remoteStorageClient.getRoutines() as Routine[];

    for (const routine of routines) {
      try {
        // Skip if already migrated (has goalIds array)
        if (routine.goalIds && Array.isArray(routine.goalIds)) {
          stats.skipped++;
          continue;
        }

        // Convert goalId to goalIds array
        const goalIds = routine.goalId ? [routine.goalId] : [];
        
        // Update routine with goalIds array
        const updatedRoutine: Routine = {
          ...routine,
          goalIds,
          // Keep goalId for backward compatibility during transition
          // Can be removed in a future version
        };

        await remoteStorageClient.saveRoutine(updatedRoutine);
        stats.migrated++;
      } catch (error) {
        console.error(`Failed to migrate routine "${routine.name}":`, error);
        stats.errors++;
      }
    }

    return stats;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Auto-run migration on import (only in browser, not SSR)
if (typeof window !== 'undefined') {
  // Check if migration has already run
  const MIGRATION_KEY = 'leptum_goalId_to_goalIds_migrated';
  const hasMigrated = localStorage.getItem(MIGRATION_KEY);
  
  if (!hasMigrated) {
    // Run migration automatically on first load
    migrateGoalIdToGoalIds()
      .then((stats) => {
        if (stats.migrated > 0 || stats.errors === 0) {
          localStorage.setItem(MIGRATION_KEY, 'true');
        }
      })
      .catch((error) => {
        console.error('Auto-migration failed:', error);
      });
  }
}
