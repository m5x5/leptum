// @ldo/ldo-based replacement for fromRdf.ts's extractRoutineCompletion().
import type { LdoDataset } from '@ldo/ldo';
import type { RoutineCompletion } from '../remoteStorage';
import { RoutineCompletionShapeType } from './_ldo/routineCompletion.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractRoutineCompletionFromDataset(dataset: LdoDataset, url: string): RoutineCompletion | null {
  const c = dataset.usingType(RoutineCompletionShapeType).fromSubject(url);
  const routineRef = c.object?.['@id'];
  if (!c.name || !routineRef) return null;
  return {
    routineId: idFromUrl(routineRef),
    routineInstanceId: c.routineInstanceId ?? idFromUrl(url),
    routineName: c.name,
    completedAt: c.endTime ? new Date(c.endTime).getTime() : Date.now(),
    taskCount: c.taskCount ?? 0,
  };
}
