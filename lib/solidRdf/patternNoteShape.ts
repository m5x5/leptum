// @ldo/ldo-based replacement for fromRdf.ts's extractPatternNote().
import type { LdoDataset } from '@ldo/ldo';
import type { PatternNote } from '../remoteStorage';
import { PatternNoteShapeType } from './_ldo/patternNote.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractPatternNoteFromDataset(dataset: LdoDataset, url: string): PatternNote | null {
  const p = dataset.usingType(PatternNoteShapeType).fromSubject(url);
  if (!p.content) return null;
  const note: PatternNote = {
    activity: p.activity ?? idFromUrl(url),
    notes: p.content,
    createdAt: p.created ? new Date(p.created).getTime() : Date.now(),
  };
  if (p.modified) note.updatedAt = new Date(p.modified).getTime();
  return note;
}
