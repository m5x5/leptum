// Generic Solid-primary CRUD for "one resource per record" containers — the
// same list/save/update/delete shape taskBackend.ts already proved out for
// Tasks, factored out so each new type only needs a toRdf/extract pair, not
// another hand-written copy of the HTTP plumbing.
//
// Only fits types whose container holds one resource per record with a
// stable id-derived URL. Types with a different pod shape (RoutineCompletions'
// append/remove-by-field list, Impacts' single collection resource) need
// their own module instead of forcing the fit here.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import type { LdoDataset } from '@ldo/ldo';
import { getResolvedContainers } from './activeContainers';
import type { ContainerKey } from './containers';
import type { ExportContext, RdfResource } from './transform';
import { listContainer } from './fromRdf';
import { docToTurtle } from './toTurtle';
import { fetchResourceCached, forgetResource, pruneResources } from './resourceCache';

export interface RdfBackend<T> {
  list(session: SolidSessionInstance, webId: string): Promise<T[]>;
  save(session: SolidSessionInstance, webId: string, item: T): Promise<void>;
  update(session: SolidSessionInstance, webId: string, id: string, updates: Partial<T>): Promise<void>;
  delete(session: SolidSessionInstance, webId: string, id: string): Promise<void>;
}

export function createRdfBackend<T extends { id: string }>(opts: {
  containerKey: ContainerKey;
  toRdf: (ctx: ExportContext, item: T) => RdfResource;
  extract: (dataset: LdoDataset, url: string) => T | null;
  empty: (id: string) => T;
}): RdfBackend<T> {
  const { containerKey, toRdf, extract, empty } = opts;

  async function resourceUrl(session: SolidSessionInstance, webId: string, id: string): Promise<string> {
    const containers = await getResolvedContainers(session, webId);
    return `${containers[containerKey]}${encodeURIComponent(id)}`;
  }

  function fetchItem(session: SolidSessionInstance, webId: string, url: string): Promise<T | null> {
    return fetchResourceCached(session, webId, url, extract, containerKey);
  }

  async function list(session: SolidSessionInstance, webId: string): Promise<T[]> {
    const containers = await getResolvedContainers(session, webId);
    const containerUrl = containers[containerKey];
    const urls = await listContainer(session, containerUrl);
    pruneResources(webId, containerUrl, urls);
    const items = await Promise.all(urls.map((url) => fetchItem(session, webId, url)));
    return items.filter((t) => t !== null) as T[];
  }

  async function save(session: SolidSessionInstance, webId: string, item: T): Promise<void> {
    const containers = await getResolvedContainers(session, webId);
    const ctx: ExportContext = { containers };
    const { url, doc } = toRdf(ctx, item);
    const res = await session.authFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/turtle' },
      body: await docToTurtle(doc, url),
    });
    if (!res.ok) throw new Error(`Failed to save ${containerKey} to pod (${res.status})`);
    forgetResource(webId, url);
  }

  /** Read-modify-write, since the pod resource is a whole document (there's no partial-field PUT). */
  async function update(session: SolidSessionInstance, webId: string, id: string, updates: Partial<T>): Promise<void> {
    const url = await resourceUrl(session, webId, id);
    const existing = await fetchItem(session, webId, url);
    const merged = { ...(existing ?? empty(id)), ...updates, id } as T;
    await save(session, webId, merged);
  }

  async function del(session: SolidSessionInstance, webId: string, id: string): Promise<void> {
    const url = await resourceUrl(session, webId, id);
    const res = await session.authFetch(url, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to delete ${containerKey} from pod (${res.status})`);
    forgetResource(webId, url);
  }

  return { list, save, update, delete: del };
}
