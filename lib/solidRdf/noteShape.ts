// @ldo/ldo-based replacement for fromRdf.ts's extractQuickNote()/
// extractWeekReflection() family. QuickNote and WeekReflection share the
// 'notes' container (both as:Note) — disambiguated the same way today:
// leptum:weekStart present means WeekReflection, not QuickNote.
import type { LdoDataset } from '@ldo/ldo';
import type { QuickNote, WeekReflection } from '../remoteStorage';
import { NoteShapeType } from './_ldo/note.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractQuickNoteFromDataset(dataset: LdoDataset, url: string): QuickNote | null {
  const n = dataset.usingType(NoteShapeType).fromSubject(url);
  if (n.weekStart !== undefined) return null;
  if (!n.published) return null;
  const note: QuickNote = { id: idFromUrl(url), createdAt: new Date(n.published).getTime() };
  if (n.content) note.text = n.content;
  if (n.updated) note.updatedAt = new Date(n.updated).getTime();
  const photoRefs = Array.from(n.attachment ?? []);
  if (photoRefs.length) note.photoIds = photoRefs.map((ref) => idFromUrl(ref['@id']));
  if (n.audio?.contentUrl) note.audioPath = n.audio.contentUrl['@id'];
  if (n.audio?.duration != null) note.audioDuration = n.audio.duration;
  return note;
}

/** WeekReflection's id comes from leptum:weekStart, not the resource URL (see resourceUrl() in weekReflectionBackend.ts). */
export function extractWeekReflectionFromDataset(dataset: LdoDataset, url: string): WeekReflection | null {
  const n = dataset.usingType(NoteShapeType).fromSubject(url);
  if (!n.published || !n.weekStart) return null;
  const reflection: WeekReflection = { id: n.weekStart, createdAt: new Date(n.published).getTime() };
  if (n.content) reflection.text = n.content;
  if (n.updated) reflection.updatedAt = new Date(n.updated).getTime();
  return reflection;
}
