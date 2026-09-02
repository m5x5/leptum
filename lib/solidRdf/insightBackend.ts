import { createCollectionBackend } from './collectionBackend';
import { insightToRdf } from './transform';
import { extractInsightFromDataset } from './insightShape';
import type { Insight } from '../remoteStorage';

export const insightBackend = createCollectionBackend<Insight>({
  containerKey: 'insights',
  toRdf: insightToRdf,
  extract: extractInsightFromDataset,
  idOf: (i) => i.id,
});
