// Tiny in-process bus: remoteStorageClient announces successful writes so the
// query layer can invalidate the affected collection — without lib/remoteStorage
// importing lib/query (which imports remoteStorage back).
export type PodCollection = 'tasks' | 'routines' | 'completions';

type Listener = (collection: PodCollection) => void;
const listeners = new Set<Listener>();

export function emitPodWrite(collection: PodCollection): void {
  listeners.forEach((l) => l(collection));
}

export function onPodWrite(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
