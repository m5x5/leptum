// Impacts (timeline entries) share the 'events' container with LifeEvent —
// both are schema:Event; extractImpactFromDataset filters out LifeEvent
// resources by their date-only schema:startDate shape (see eventShape.ts).
import { createCollectionBackend } from './collectionBackend';
import { impactToRdf } from './transform';
import { extractImpactFromDataset } from './eventShape';
import type { Impact } from '../remoteStorage';

export const impactBackend = createCollectionBackend<Impact>({
  containerKey: 'events',
  // Impact.id is optional in the type; items without one are skipped on
  // write by collectionBackend (idOf) instead of producing an ".../undefined" URL.
  toRdf: (ctx, impact) => impactToRdf(ctx, impact, impact.id ?? ''),
  extract: extractImpactFromDataset,
  idOf: (impact) => impact.id,
});
