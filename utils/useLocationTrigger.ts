import { useEffect, useRef, useState } from 'react';
import type { StandaloneTask } from '../lib/remoteStorage';
import { Routine } from '../components/Job/api';
import { useGeolocation } from './useGeolocation';
import { haversineDistance, triggerRoutine } from './routineTriggerUtils';
import { fetchRoutines, fetchActiveTasks } from '../lib/query/collections';

const LOCATION_COOLDOWN_PREFIX = 'location-trigger-';
const ROUTINES_REFRESH_INTERVAL = 300000; // 5 minutes

export interface UseLocationTriggerOptions {
  currentTasks?: StandaloneTask[];
  tasksLoading?: boolean;
}

export function useLocationTrigger(
  onTasksCreated?: () => void,
  options?: UseLocationTriggerOptions
) {
  const [hasLocationRoutines, setHasLocationRoutines] = useState(false);
  const optionsRef = useRef(options);
  const routinesRef = useRef<Routine[]>([]);

  useEffect(() => {
    optionsRef.current = options;
  });

  // Check if any routines have location triggers
  useEffect(() => {
    let cancelled = false;

    const checkRoutines = async () => {
      try {
        const routines = await fetchRoutines();
        if (cancelled) return;
        routinesRef.current = routines;
        setHasLocationRoutines(routines.some(r => r.locationTrigger));
      } catch {
        // ignore
      }
    };

    checkRoutines();
    const interval = setInterval(checkRoutines, ROUTINES_REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Only request geolocation if location-triggered routines exist
  const { position } = useGeolocation(hasLocationRoutines);

  // Check proximity when position updates
  useEffect(() => {
    if (!position || !hasLocationRoutines) return;

    const checkProximity = async () => {
      try {
        const opts = optionsRef.current;
        let existingTasks: StandaloneTask[];

        if (opts?.currentTasks !== undefined && !opts?.tasksLoading) {
          existingTasks = opts.currentTasks;
        } else {
          existingTasks = await fetchActiveTasks();
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();
        const now = Date.now();

        for (const routine of routinesRef.current) {
          const loc = routine.locationTrigger;
          if (!loc || !routine.tasks || routine.tasks.length === 0) continue;

          const distance = haversineDistance(
            position.lat, position.lon,
            loc.lat, loc.lon
          );

          if (distance > loc.radius) continue;

          // Check cooldown
          const cooldownKey = `${LOCATION_COOLDOWN_PREFIX}${routine.id}`;
          const lastTrigger = parseInt(localStorage.getItem(cooldownKey) || '0', 10);
          const cooldownMs = loc.cooldownHours * 3600000;
          if (now - lastTrigger < cooldownMs) continue;

          // Check if tasks already exist today
          const hasTasksToday = routine.tasks.some(task =>
            existingTasks.some(t =>
              t.routineId === routine.id &&
              t.name === task.name &&
              t.status === 'due' &&
              t.createdAt >= todayStart
            )
          );
          if (hasTasksToday) continue;

          // Trigger!
          await triggerRoutine(routine, existingTasks, onTasksCreated);
          localStorage.setItem(cooldownKey, now.toString());
        }
      } catch (error) {
        console.error('Location trigger check failed:', error);
      }
    };

    checkProximity();
  }, [position, hasLocationRoutines, onTasksCreated]);
}
