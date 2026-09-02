// Bidirectional Goal storage over Solid, same shape as taskBackend.ts —
// container resolved via the type index, never a hardcoded path.
import { createRdfBackend } from './backendFactory';
import { goalToRdf } from './transform';
import { extractGoalFromDataset } from './goalShape';
import type { Goal } from '../remoteStorage';

export const goalBackend = createRdfBackend<Goal>({
  containerKey: 'goals',
  toRdf: goalToRdf,
  extract: extractGoalFromDataset,
  empty: (id) => ({ id, name: '', type: '' }),
});
