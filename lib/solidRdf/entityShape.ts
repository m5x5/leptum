// @ldo/ldo-based replacement for fromRdf.ts's extractEntity().
import type { LdoDataset } from '@ldo/ldo';
import type { Entity } from '../remoteStorage';
import { EntityShapeType } from './_ldo/entity.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractEntityFromDataset(dataset: LdoDataset, url: string, type: Entity['type']): Entity | null {
  const e = dataset.usingType(EntityShapeType).fromSubject(url);
  // foaf:name (people) -> `name`, schema:name (projects/contexts) -> `name2` —
  // see entity.shex's comment for why these are two separate fields.
  const name = e.name ?? e.name2;
  if (!name) return null;
  const entity: Entity = {
    id: idFromUrl(url),
    name,
    createdAt: e.created ? new Date(e.created).getTime() : Date.now(),
  };
  if (type) entity.type = type;
  if (e.description) entity.description = e.description;
  const tags = Array.from(e.tag ?? []);
  if (tags.length) entity.tags = tags;
  return entity;
}
