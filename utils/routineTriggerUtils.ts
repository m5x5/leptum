import { remoteStorageClient, StandaloneTask } from '../lib/remoteStorage';
import { setTasksCache, markSelfWrite } from '../lib/query/collections';
import { Routine } from '../components/Job/api';

/** Haversine distance between two WGS84 points, in meters. */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Create standalone tasks for a routine trigger.
 *  @param scheduledFor - The timestamp the routine was scheduled to run (cron
 *    occurrence time). Used to build deterministic IDs so that two clients
 *    triggering the same execution produce identical tasks instead of duplicates.
 */
export async function triggerRoutine(
  routine: Routine,
  existingTasks: StandaloneTask[],
  onTasksCreated?: () => void,
  scheduledFor?: number
): Promise<void> {
  try {
    // Floor to start-of-day so the ID is stable regardless of the exact
    // second the check ran.
    const scheduled = new Date(scheduledFor ?? Date.now());
    scheduled.setHours(0, 0, 0, 0);
    const scheduledDay = scheduled.getTime();

    const routineInstanceId = `${routine.id}-${scheduledDay}`;

    for (const task of routine.tasks || []) {
      const taskId = `${routine.id}-${task.id}-${scheduledDay}`;

      // Skip if a task with this deterministic ID already exists,
      // or if a task for this routine+name was already created today
      // (handles old-format IDs from before deterministic IDs were introduced)
      const alreadyExists = existingTasks.some(t =>
        t.id === taskId ||
        (t.routineId === routine.id && t.name === task.name && t.createdAt >= scheduledDay)
      );
      if (alreadyExists) {
        continue;
      }

      const goalIds = routine.goalIds || (routine.goalId ? [routine.goalId] : []);
      const newTask = {
        id: taskId,
        name: task.name,
        description: task.description || `Routine: ${routine.name}`,
        status: 'due' as const,
        createdAt: scheduledDay,
        routineId: routine.id,
        routineInstanceId,
        ...(task.effort && { effort: task.effort }),
        ...(task.numericEstimate !== undefined && { numericEstimate: task.numericEstimate }),
        ...(goalIds.length > 0 && { goalId: goalIds[0] })
      };

      markSelfWrite('tasks');
      setTasksCache((prev) => [...prev, newTask]);
      await remoteStorageClient.addStandaloneTask(newTask);
    }

    if (onTasksCreated) {
      onTasksCreated();
    }
  } catch (error) {
    console.error('Failed to trigger routine:', routine.name, error);
  }
}
