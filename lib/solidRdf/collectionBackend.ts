// For RS-era types stored as one "get the whole array, mutate it, save the whole
// array back" collection, where Solid stores one resource per record instead.
//
// list() reads the container; saveAll() reconciles it. Callers keep the exact
// same get/mutate/save-array shape every hook here already uses, but the
// reconcile is deliberately conservative so a stale in-memory array can't
// destroy data:
//
//   * Only resources whose content changed are PUT (per-resource content
//     hash) — a no-op save costs zero requests.
//   * Only resources this client has itself listed (the "snapshot") and that
//     are now absent from the array are DELETEd. Resources written by another
//     device/tab since our last list — or sibling types that share the
//     container (LifeEvents live next to Impacts in 'events') — are never
//     touched.
//   * Saves are serialised per collection so two overlapping saveAll() calls
//     can't interleave their PUT/DELETE sets.
//   * Reads are conditional (If-None-Match, via resourceCache.ts) so the
//     periodic poll of an unchanged container re-parses nothing.
//
// Prefer save()/delete()/get() for single records — they're one request each.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import type { LdoDataset } from '@ldo/ldo';
import { getResolvedContainers } from './activeContainers';
import type { ContainerKey } from './containers';
import type { ExportContext, RdfResource } from './transform';
import { listContainer } from './fromRdf';
import { docToTurtle } from './toTurtle';
import { fetchResourceCached, forgetResource, pruneResources } from './resourceCache';

export interface CollectionBackend<T> {
  list(session: SolidSessionInstance, webId: string): Promise<T[]>;
  /** Read a single item by id (conditional GET when cached). null if absent. */
  get(session: SolidSessionInstance, webId: string, id: string): Promise<T | null>;
  /** Reconcile the container with `items` (see module comment for exactly what that means). */
  saveAll(session: SolidSessionInstance, webId: string, items: T[]): Promise<void>;
  /** Write a single item. Never deletes anything. */
  save(session: SolidSessionInstance, webId: string, item: T): Promise<void>;
  /** Delete a single item by id. 404 is treated as success. */
  delete(session: SolidSessionInstance, webId: string, id: string): Promise<void>;
}

function hashDoc(doc: unknown): string {
  return JSON.stringify(doc);
}

export function createCollectionBackend<T, P = void>(opts: {
  containerKey: ContainerKey;
  /** Item → resource. `prep` is whatever `prepare` returned for this call (void if none). */
  toRdf: (ctx: ExportContext, item: T, prep: P) => RdfResource;
  extract: (dataset: LdoDataset, url: string) => T | null;
  /** Stable id for an item; items without one are skipped on write with a warning. */
  idOf: (item: T) => string | undefined;
  /** Optional per-call lookup toRdf needs (e.g. an entity-type map). Runs once per list/save. */
  prepare?: (session: SolidSessionInstance, webId: string) => Promise<P>;
}): CollectionBackend<T> {
  const { containerKey, toRdf, extract, idOf, prepare } = opts;

  interface State {
    /** url → content hash of what we last PUT or last saw on the pod, for items of THIS type. */
    snapshot: Map<string, string>;
    /** True once list() has succeeded at least once; deletes are only allowed after that. */
    snapshotValid: boolean;
    /** Serialises writes. */
    writeQueue: Promise<void>;
  }
  const states = new Map<string, State>();
  function stateFor(webId: string): State {
    let s = states.get(webId);
    if (!s) {
      s = { snapshot: new Map(), snapshotValid: false, writeQueue: Promise.resolve() };
      states.set(webId, s);
    }
    return s;
  }

  async function ctxFor(session: SolidSessionInstance, webId: string): Promise<ExportContext> {
    return { containers: await getResolvedContainers(session, webId) };
  }

  async function prepFor(session: SolidSessionInstance, webId: string): Promise<P> {
    return prepare ? prepare(session, webId) : (undefined as P);
  }

  function urlFor(ctx: ExportContext, id: string): string {
    return `${ctx.containers[containerKey]}${encodeURIComponent(id)}`;
  }

  async function list(session: SolidSessionInstance, webId: string): Promise<T[]> {
    const state = stateFor(webId);
    const [ctx, prep] = await Promise.all([ctxFor(session, webId), prepFor(session, webId)]);
    const containerUrl = ctx.containers[containerKey];
    const urls = await listContainer(session, containerUrl);
    pruneResources(webId, containerUrl, urls);
    const entries = await Promise.all(
      urls.map(async (url) => [url, await fetchResourceCached(session, webId, url, extract, containerKey)] as const)
    );
    const snapshot = new Map<string, string>();
    const items: T[] = [];
    for (const [url, item] of entries) {
      if (item === null) continue;
      items.push(item);
      snapshot.set(url, hashDoc(toRdf(ctx, item, prep).doc));
    }
    state.snapshot = snapshot;
    state.snapshotValid = true;
    return items;
  }

  async function get(session: SolidSessionInstance, webId: string, id: string): Promise<T | null> {
    const ctx = await ctxFor(session, webId);
    return fetchResourceCached(session, webId, urlFor(ctx, id), extract, containerKey);
  }

  async function putResource(session: SolidSessionInstance, webId: string, state: State, url: string, doc: RdfResource['doc'], hash: string) {
    const res = await session.authFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/turtle' },
      body: await docToTurtle(doc, url),
    });
    if (!res.ok) throw new Error(`Failed to save ${containerKey} resource to pod (${res.status})`);
    state.snapshot.set(url, hash);
    forgetResource(webId, url);
  }

  async function deleteResource(session: SolidSessionInstance, webId: string, state: State, url: string) {
    const res = await session.authFetch(url, { method: 'DELETE' });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error(`Failed to delete ${containerKey} resource from pod (${res.status})`);
    }
    state.snapshot.delete(url);
    forgetResource(webId, url);
  }

  function enqueue(state: State, work: () => Promise<void>): Promise<void> {
    const run = state.writeQueue.then(work, work);
    state.writeQueue = run.catch(() => {});
    return run;
  }

  async function saveAll(session: SolidSessionInstance, webId: string, items: T[]): Promise<void> {
    const state = stateFor(webId);
    return enqueue(state, async () => {
      const [ctx, prep] = await Promise.all([ctxFor(session, webId), prepFor(session, webId)]);
      const wanted = new Map<string, { doc: RdfResource['doc']; hash: string }>();
      for (const item of items) {
        if (!idOf(item)) {
          console.warn(`[solid] skipping ${containerKey} item without id`, item);
          continue;
        }
        const { url, doc } = toRdf(ctx, item, prep);
        wanted.set(url, { doc, hash: hashDoc(doc) });
      }

      const puts: Promise<void>[] = [];
      for (const [url, { doc, hash }] of Array.from(wanted.entries())) {
        if (state.snapshot.get(url) === hash) continue;
        puts.push(putResource(session, webId, state, url, doc, hash));
      }

      const deletes: Promise<void>[] = [];
      if (state.snapshotValid) {
        for (const url of Array.from(state.snapshot.keys())) {
          if (!wanted.has(url)) deletes.push(deleteResource(session, webId, state, url));
        }
      }

      const results = await Promise.allSettled([...puts, ...deletes]);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(
          `${failed.length} of ${results.length} ${containerKey} writes failed: ${String(failed[0].reason)}`
        );
      }
    });
  }

  async function save(session: SolidSessionInstance, webId: string, item: T): Promise<void> {
    if (!idOf(item)) throw new Error(`Cannot save ${containerKey} item without id`);
    const state = stateFor(webId);
    return enqueue(state, async () => {
      const [ctx, prep] = await Promise.all([ctxFor(session, webId), prepFor(session, webId)]);
      const { url, doc } = toRdf(ctx, item, prep);
      const hash = hashDoc(doc);
      if (state.snapshot.get(url) === hash) return;
      await putResource(session, webId, state, url, doc, hash);
    });
  }

  async function del(session: SolidSessionInstance, webId: string, id: string): Promise<void> {
    const state = stateFor(webId);
    return enqueue(state, async () => {
      const ctx = await ctxFor(session, webId);
      await deleteResource(session, webId, state, urlFor(ctx, id));
    });
  }

  return { list, get, saveAll, save, delete: del };
}
