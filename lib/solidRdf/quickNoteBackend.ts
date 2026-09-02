import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { createCollectionBackend } from './collectionBackend';
import { quickNoteToRdf } from './transform';
import { extractQuickNoteFromDataset } from './noteShape';
import { getResolvedContainers } from './activeContainers';
import type { QuickNote } from '../remoteStorage';

export const quickNoteBackend = createCollectionBackend<QuickNote>({
  containerKey: 'notes',
  toRdf: quickNoteToRdf,
  extract: extractQuickNoteFromDataset,
  idOf: (n) => n.id,
});

/**
 * Audio is a real Solid binary resource, separate from the note's own RDF
 * resource (see note.shex's NoteAudioShape) — not embedded/local-path like
 * the old storage layer. Returns the binary resource's URL, for QuickNote.audioPath.
 */
export async function saveQuickNoteAudio(session: SolidSessionInstance, webId: string, noteId: string, audioBlob: Blob): Promise<string | null> {
  const containers = await getResolvedContainers(session, webId);
  const url = `${containers.notes}${encodeURIComponent(noteId)}.audio`;
  const res = await session.authFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': audioBlob.type || 'audio/mp4' },
    body: await audioBlob.arrayBuffer(),
  });
  return res.ok ? url : null;
}

export async function getQuickNoteAudio(session: SolidSessionInstance, url: string): Promise<Blob | null> {
  const res = await session.authFetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return await res.blob();
}
