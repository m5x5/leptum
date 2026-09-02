// Bidirectional GoalType storage over Solid, same shape as taskBackend.ts —
// container resolved via the type index, never a hardcoded path.
import { createRdfBackend } from './backendFactory';
import { goalTypeToRdf } from './transform';
import { extractGoalTypeFromDataset } from './goalTypeShape';
import type { GoalType } from '../remoteStorage';

export const goalTypeBackend = createRdfBackend<GoalType>({
  containerKey: 'goalTypes',
  toRdf: goalTypeToRdf,
  extract: extractGoalTypeFromDataset,
  empty: (id) => ({ id, name: '' }),
});
