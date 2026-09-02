import { createCollectionBackend } from './collectionBackend';
import { patternNoteToRdf } from './transform';
import { extractPatternNoteFromDataset } from './patternNoteShape';
import type { PatternNote } from '../remoteStorage';

export const patternNoteBackend = createCollectionBackend<PatternNote>({
  containerKey: 'patternNotes',
  toRdf: (ctx, p) => patternNoteToRdf(ctx, p, p.activity),
  extract: extractPatternNoteFromDataset,
  idOf: (p) => p.activity,
});
