// Entities span 3 containers by type (people/projects/contexts — see
// entityContainerKey in transform.ts). Each container is an ordinary
// collectionBackend, so the same conservative reconcile / single-record
// semantics apply per container; this module just fans out across the three.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { createCollectionBackend, type CollectionBackend } from './collectionBackend';
import { entityToRdf, entityContainerKey } from './transform';
import { extractEntityFromDataset } from './entityShape';
import type { Entity } from '../remoteStorage';

const CONTAINER_KEYS = ['people', 'projects', 'contexts'] as const;
type EntityContainerKey = (typeof CONTAINER_KEYS)[number];

const TYPE_BY_CONTAINER: Record<EntityContainerKey, Entity['type']> = {
  people: 'person',
  projects: 'project',
  contexts: 'context',
};

const backends: Record<EntityContainerKey, CollectionBackend<Entity>> = Object.fromEntries(
  CONTAINER_KEYS.map((key) => [
    key,
    createCollectionBackend<Entity>({
      containerKey: key,
      toRdf: (ctx, e) => entityToRdf(ctx, e),
      extract: (dataset, url) => extractEntityFromDataset(dataset, url, TYPE_BY_CONTAINER[key]),
      idOf: (e) => e.id,
    }),
  ])
) as Record<EntityContainerKey, CollectionBackend<Entity>>;

function backendFor(entity: Entity): CollectionBackend<Entity> {
  return backends[entityContainerKey(entity.type) as EntityContainerKey];
}

export async function listEntities(session: SolidSessionInstance, webId: string): Promise<Entity[]> {
  const perContainer = await Promise.all(CONTAINER_KEYS.map((key) => backends[key].list(session, webId)));
  return perContainer.flat();
}

export async function saveAllEntities(session: SolidSessionInstance, webId: string, entities: Entity[]): Promise<void> {
  const byContainer: Record<EntityContainerKey, Entity[]> = { people: [], projects: [], contexts: [] };
  for (const e of entities) byContainer[entityContainerKey(e.type) as EntityContainerKey].push(e);
  await Promise.all(CONTAINER_KEYS.map((key) => backends[key].saveAll(session, webId, byContainer[key])));
}

export function saveEntity(session: SolidSessionInstance, webId: string, entity: Entity): Promise<void> {
  return backendFor(entity).save(session, webId, entity);
}

/** The container depends on the entity's type; without it we try all three (404s are fine). */
export async function deleteEntity(session: SolidSessionInstance, webId: string, id: string, type?: Entity['type']): Promise<void> {
  if (type !== undefined) {
    await backends[entityContainerKey(type) as EntityContainerKey].delete(session, webId, id);
    return;
  }
  await Promise.all(CONTAINER_KEYS.map((key) => backends[key].delete(session, webId, id)));
}
