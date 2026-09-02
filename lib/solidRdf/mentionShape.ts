// @ldo/ldo-based replacement for fromRdf.ts's extractMention().
import type { LdoDataset } from '@ldo/ldo';
import type { Mention } from '../remoteStorage';
import { MentionShapeType } from './_ldo/mention.shapeTypes';
import { idFromUrl } from './fromRdf';

const isExternalIri = (value: string) => /^https?:\/\//.test(value) && !/\/(people|projects|contexts)\//.test(value);

export function extractMentionFromDataset(dataset: LdoDataset, url: string): Mention | null {
  const m = dataset.usingType(MentionShapeType).fromSubject(url);
  const targetRef = m.hasTarget?.['@id'];
  const bodyRef = m.hasBody?.['@id'];
  if (!targetRef || !bodyRef) return null;
  const mention: Mention = {
    id: idFromUrl(url),
    // Can't be recovered from oa:hasTarget alone — see mention.shex's comment.
    sourceType: 'unknown',
    sourceId: idFromUrl(targetRef),
    entityId: isExternalIri(bodyRef) ? bodyRef : idFromUrl(bodyRef),
    createdAt: m.created ? new Date(m.created).getTime() : Date.now(),
  };
  if (m.fieldName) mention.fieldName = m.fieldName;
  if (m.context) mention.context = m.context;
  if (m.position != null) mention.position = m.position;
  return mention;
}
