// LDO-based replacement for fromRdf.ts's extractTask() — same StandaloneTask
// extraction, but backed by a real RDF dataset (via ldoParse.ts) instead of
// the hand-rolled fact flattener, so nested/foreign data isn't silently
// dropped (e.g. schema:geo's blank node, which extractTask() never read).
import type { LdoDataset, LdSet } from '@ldo/ldo';
import type { StandaloneTask } from '../remoteStorage';
import { TaskShapeType } from './_ldo/task.shapeTypes';
import type { Task } from './_ldo/task.typings';
import { idFromUrl } from './fromRdf';

// @ldo/cli 1.0.0-alpha.51 types actionStatus as a single value, but the
// JSON-LD context it also generates marks the same field `@isCollection:
// true` (a generator bug affecting every IRI value-set enum in this shape) —
// at runtime it's actually returned as an LdSet. Corrected locally rather
// than hand-editing the generated file, which the next `ldo build` overwrites.
type TaskFixed = Omit<Task, 'actionStatus'> & {
  actionStatus?: LdSet<{ '@id': string }>;
};

function toEpochMs(iso: string | undefined): number | undefined {
  return iso ? new Date(iso).getTime() : undefined;
}

/**
 * Extracts a StandaloneTask from any resource typed schema:Action (+
 * ical:Vtodo) — Leptum's own JSON-LD, or another app's Turtle (e.g. Focus's
 * `ical:summary` + `schema:actionStatus` shape). Returns null if it doesn't
 * look like a task at all.
 */
export function extractTaskFromDataset(dataset: LdoDataset, url: string): StandaloneTask | null {
  const task = dataset.usingType(TaskShapeType).fromSubject(url) as unknown as TaskFixed;

  // Tasks and Routines share the 'tasks' container (see routineToRdf in
  // transform.ts); a resource with ical:rrule is a Routine, not a Task.
  if (task.rrule !== undefined) return null;

  const name = task.name ?? task.summary;
  if (!name) return null;

  const statusIri = Array.from(task.actionStatus ?? [])[0]?.['@id'];
  const status: StandaloneTask['status'] = statusIri?.includes('Completed') ? 'completed' : 'due';

  const createdAt = toEpochMs(task.created ?? task.createdAt) ?? Date.now();
  const goalRefs = Array.from(task.about ?? []);

  // Built via conditional assignment, not `field: value ?? undefined` — an
  // object literal with an explicit `undefined` value still has that key
  // present, which remotestorage.js's schema validator rejects on the next
  // write this task takes part in. Omit means omit (same as extractTask()).
  const result: StandaloneTask = { id: idFromUrl(url), name, status, createdAt };
  if (task.description) result.description = task.description;
  const completedAt = toEpochMs(task.completedAt);
  if (completedAt) result.completedAt = completedAt;
  const archivedAt = toEpochMs(task.archivedAt);
  if (archivedAt) result.archivedAt = archivedAt;
  if (task.effort) result.effort = task.effort as StandaloneTask['effort'];
  if (task.numericEstimate != null) result.numericEstimate = task.numericEstimate;
  if (goalRefs.length) result.goalId = idFromUrl(goalRefs[0]['@id']);
  if (task.partOfRoutine) result.routineId = idFromUrl(task.partOfRoutine['@id']);
  if (task.routineInstanceId) result.routineInstanceId = task.routineInstanceId;
  if (task.emotions?.size) result.emotions = Array.from(task.emotions) as StandaloneTask['emotions'];
  if (task.geo) {
    result.lat = task.geo.latitude;
    result.lon = task.geo.longitude;
  }
  if (task.indoorX != null) result.indoorX = task.indoorX;
  if (task.indoorY != null) result.indoorY = task.indoorY;
  if (task.sortIndex != null) result.sortIndex = task.sortIndex;
  return result;
}
