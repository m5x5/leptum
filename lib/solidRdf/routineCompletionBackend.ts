import { createCollectionBackend } from './collectionBackend';
import { routineCompletionToRdf } from './transform';
import { extractRoutineCompletionFromDataset } from './routineCompletionShape';
import type { RoutineCompletion } from '../remoteStorage';

export const routineCompletionBackend = createCollectionBackend<RoutineCompletion>({
  containerKey: 'completions',
  toRdf: routineCompletionToRdf,
  extract: extractRoutineCompletionFromDataset,
  idOf: (c) => c.routineInstanceId,
});
