// @ldo/ldo-based replacement for fromRdf.ts's extractVelocityEntry().
import type { LdoDataset } from '@ldo/ldo';
import type { VelocityEntry } from '../remoteStorage';
import { VelocityEntryShapeType } from './_ldo/velocityEntry.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractVelocityEntryFromDataset(dataset: LdoDataset, url: string): VelocityEntry | null {
  const v = dataset.usingType(VelocityEntryShapeType).fromSubject(url);
  const taskRef = v.about?.['@id'];
  if (!v.name || !taskRef || !v.endTime) return null;
  const entry: VelocityEntry = {
    id: idFromUrl(url),
    taskId: idFromUrl(taskRef),
    taskName: v.name,
    completedAt: new Date(v.endTime).getTime(),
    period: v.period ?? '',
  };
  if (v.effort) entry.effort = v.effort as VelocityEntry['effort'];
  if (v.numericEstimate != null) entry.numericEstimate = v.numericEstimate;
  return entry;
}
