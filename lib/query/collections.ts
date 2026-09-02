// Pod collections as TanStack queries.
//
// Rules:
//   * Components use the use*Query hooks. Non-React code (schedulers, event
//     handlers) uses the fetch* helpers — they return cached data when it's
//     fresh (STALE_MS) and only hit the pod otherwise, so five callers on one
//     page cost one round of requests.
//   * After a write, update the cache optimistically (set* helpers) and call
//     markSelfWrite(): the tasks-container WebSocket notification that our own
//     write triggers is then ignored instead of causing a full re-list.
//   * LDO stays the RDF codec inside remoteStorageClient; nothing here reads
//     through @ldo/solid-react.
//
// Other collections (goals, impacts, notes, …) are defined next to their hook
// with defineCollection(); these three live here because non-hook code
// (scheduler, AppShell, WebMCP) reads them too.
import { remoteStorageClient, type StandaloneTask } from '../remoteStorage';
import type { Routine } from '../../components/Job/api';
import type { RoutineCompletion } from '../../utils/useRoutineCompletions';
import { defineCollection } from './defineCollection';
import { onPodWrite } from '../podWriteBus';

export const tasksCollection = defineCollection<StandaloneTask[]>(
  'tasks', // every task, archived ones included
  () => remoteStorageClient.getAllTasks(),
  { initial: [], refreshOn: ['tasksUpdated'] }
);

export const routinesCollection = defineCollection<Routine[]>(
  'routines',
  () => remoteStorageClient.getRoutines() as Promise<Routine[]>,
  { initial: [] }
);

export const completionsCollection = defineCollection<RoutineCompletion[]>(
  'completions',
  () => remoteStorageClient.getRoutineCompletions() as Promise<RoutineCompletion[]>,
  { initial: [] }
);

const byName = { tasks: tasksCollection, routines: routinesCollection, completions: completionsCollection };
type CollectionName = keyof typeof byName;


// --- self-write suppression -------------------------------------------------
export function markSelfWrite(name: CollectionName): void {
  byName[name].markSelfWrite();
}

/** True if we wrote to this collection within the last few seconds (so a pod notification is our own echo). */
export function isRecentSelfWrite(name: CollectionName): boolean {
  return byName[name].isRecentSelfWrite();
}

// --- hooks ------------------------------------------------------------------
export const useTasksQuery = () => tasksCollection.useQuery();
export const useCompletionsQuery = () => completionsCollection.useQuery();

// --- imperative access (respects staleTime → cache hit when fresh) -----------
export const fetchAllTasks = () => tasksCollection.fetch();
export const fetchRoutines = () => routinesCollection.fetch();
export const fetchCompletions = () => completionsCollection.fetch();

export async function fetchActiveTasks(): Promise<StandaloneTask[]> {
  return (await fetchAllTasks()).filter((t) => !t.archivedAt);
}

/** Current cached tasks (active only) without triggering a fetch. */
export function getActiveTasksCache(): StandaloneTask[] {
  return tasksCollection.get().filter((t) => !t.archivedAt);
}

// --- cache updates ----------------------------------------------------------
export const setTasksCache = (updater: (prev: StandaloneTask[]) => StandaloneTask[]) => tasksCollection.set(updater);
export const setCompletionsCache = (updater: (prev: RoutineCompletion[]) => RoutineCompletion[]) =>
  completionsCollection.set(updater);

export function invalidate(name: CollectionName): Promise<void> {
  return byName[name].invalidate();
}

// Any write through remoteStorageClient invalidates its collection — unless a
// hook already applied the change to the cache and marked it as a self-write.
onPodWrite((name) => {
  if (!isRecentSelfWrite(name)) void invalidate(name);
});
