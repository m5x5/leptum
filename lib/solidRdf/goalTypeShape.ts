// @ldo/ldo-based replacement for fromRdf.ts's extractGoalType() — same
// GoalType extraction, backed by a real RDF dataset (via ldoParse.ts).
import type { LdoDataset } from '@ldo/ldo';
import type { GoalType } from '../remoteStorage';
import { GoalTypeShapeType } from './_ldo/goalType.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractGoalTypeFromDataset(dataset: LdoDataset, url: string): GoalType | null {
  const goalType = dataset.usingType(GoalTypeShapeType).fromSubject(url);
  if (!goalType.name) return null;
  const result: GoalType = { id: idFromUrl(url), name: goalType.name };
  if (goalType.description) result.description = goalType.description;
  return result;
}
