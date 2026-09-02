import { createCollectionBackend } from './collectionBackend';
import { velocityEntryToRdf } from './transform';
import { extractVelocityEntryFromDataset } from './velocityEntryShape';
import type { VelocityEntry } from '../remoteStorage';

export const velocityBackend = createCollectionBackend<VelocityEntry>({
  containerKey: 'velocity',
  toRdf: velocityEntryToRdf,
  extract: extractVelocityEntryFromDataset,
  idOf: (v) => v.id,
});
