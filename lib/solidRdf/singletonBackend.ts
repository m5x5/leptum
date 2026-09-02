// For the handful of RS records that are a single fixed resource with no
// listing — UserSettings, the current LocationUpdate.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import type { LdoDataset } from '@ldo/ldo';
import { getResolvedContainers } from './activeContainers';
import type { ContainerKey } from './containers';
import type { ExportContext, RdfResource } from './transform';
import { fetchLdoDataset } from './ldoParse';
import { docToTurtle } from './toTurtle';

export interface SingletonBackend<T> {
  get(session: SolidSessionInstance, webId: string): Promise<T | null>;
  save(session: SolidSessionInstance, webId: string, item: T): Promise<void>;
}

export function createSingletonBackend<T>(opts: {
  containerKey: ContainerKey;
  /** Fixed resource id within the container — these types have exactly one instance, not one per record. */
  resourceId: string;
  toRdf: (ctx: ExportContext, item: T) => RdfResource;
  extract: (dataset: LdoDataset, url: string) => T | null;
}): SingletonBackend<T> {
  const { containerKey, resourceId, toRdf, extract } = opts;

  async function resourceUrl(session: SolidSessionInstance, webId: string): Promise<string> {
    const containers = await getResolvedContainers(session, webId);
    return `${containers[containerKey]}${encodeURIComponent(resourceId)}`;
  }

  async function get(session: SolidSessionInstance, webId: string): Promise<T | null> {
    const url = await resourceUrl(session, webId);
    const dataset = await fetchLdoDataset(session.authFetch.bind(session), url);
    return dataset ? extract(dataset, url) : null;
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
  }

  return { get, save };
}
