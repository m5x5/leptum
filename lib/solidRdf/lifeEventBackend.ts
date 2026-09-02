// LifeEvent shares the 'events' container with Impact — both are
// schema:Event; extractLifeEventFromDataset filters to only the date-only
// (week-band) resources (see eventShape.ts).
import { createRdfBackend } from './backendFactory';
import { lifeEventToRdf } from './transform';
import { extractLifeEventFromDataset } from './eventShape';
import type { LifeEvent } from '../remoteStorage';

export const lifeEventBackend = createRdfBackend<LifeEvent>({
  containerKey: 'events',
  toRdf: lifeEventToRdf,
  extract: extractLifeEventFromDataset,
  empty: (id) => ({ id, label: '', startWeek: '', endWeek: '', color: '#3b82f6', createdAt: Date.now() }),
});
