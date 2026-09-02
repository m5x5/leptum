// Mentions are oa:Annotations in the 'annotations' container. mentionToRdf
// needs an entityId → type map to build the body IRI in the right entity
// container, so the backend's `prepare` step loads entities once per call.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { createCollectionBackend } from './collectionBackend';
import { mentionToRdf } from './transform';
import { extractMentionFromDataset } from './mentionShape';
import { listEntities } from './entityBackend';
import type { Mention, Entity } from '../remoteStorage';

type EntityTypeMap = Map<string, Entity['type']>;

export const mentionBackend = createCollectionBackend<Mention, EntityTypeMap>({
  containerKey: 'annotations',
  toRdf: (ctx, m, entityTypeById) => mentionToRdf(ctx, m, entityTypeById),
  extract: extractMentionFromDataset,
  idOf: (m) => m.id,
  prepare: async (session, webId) => {
    const entities = await listEntities(session, webId);
    return new Map(entities.map((e) => [e.id, e.type]));
  },
});

export function listMentions(session: SolidSessionInstance, webId: string): Promise<Mention[]> {
  return mentionBackend.list(session, webId);
}

export function saveAllMentions(session: SolidSessionInstance, webId: string, mentions: Mention[]): Promise<void> {
  return mentionBackend.saveAll(session, webId, mentions);
}
