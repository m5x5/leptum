// Per-resource read cache shared by every backend: remembers the ETag and the
// parsed RDF dataset for each pod resource, so re-listing an unchanged
// container costs one 304 per member instead of a full GET + RDF parse.
// Reads go through fetchResourceCached(); writers call forgetResource() after
// a PUT or DELETE so the next read is real.
//
// The cache holds the *dataset*, not an extracted record: several types share
// a container (Impacts + LifeEvents in 'events', QuickNotes + WeekReflections
// in 'notes') and each backend extracts with its own shape, so extraction is
// re-run per call — it's cheap next to the fetch and parse.
//
// Keyed by webId so a logout/login as someone else can't serve stale data.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import type { LdoDataset } from '@ldo/ldo';
import { parseLdoDatasetText } from './ldoParse';

interface Cached {
  etag: string | null;
  dataset: LdoDataset | null;
}

const cache = new Map<string, Map<string, Cached>>();

function bucket(webId: string): Map<string, Cached> {
  let b = cache.get(webId);
  if (!b) {
    b = new Map();
    cache.set(webId, b);
  }
  return b;
}

export type Extract<T> = (dataset: LdoDataset, url: string) => T | null;

/**
 * GET one resource with If-None-Match. Returns the extracted record, or null
 * if the resource is missing, unreadable or doesn't parse (or isn't of this
 * type). Throws only on a network failure with nothing cached to fall back to.
 */
export async function fetchResourceCached<T>(
  session: SolidSessionInstance,
  webId: string,
  url: string,
  extract: Extract<T>,
  label = 'resource'
): Promise<T | null> {
  const b = bucket(webId);
  const cached = b.get(url);
  const headers: Record<string, string> = { Accept: 'text/turtle, application/ld+json;q=0.9' };
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const fromCache = () => (cached?.dataset ? extract(cached.dataset, url) : null);

  let res: Response;
  try {
    res = await session.authFetch(url, { headers, cache: 'no-store' });
  } catch (error) {
    if (cached) return fromCache(); // network blip: keep what we last saw
    throw error;
  }
  if (res.status === 304 && cached) return fromCache();
  if (!res.ok) {
    if (res.status === 404 || res.status === 410) {
      b.delete(url);
      return null;
    }
    if (cached) return fromCache();
    // One unreadable member (e.g. a 501 for a resource type the server can't
    // serialise) must not fail the whole container listing — skip it, loudly.
    console.warn(`[solid] skipping unreadable ${label} ${url} (${res.status})`);
    return null;
  }
  const text = await res.text();
  const dataset = await parseLdoDatasetText(text, res.headers.get('content-type') ?? '', url);
  b.set(url, { etag: res.headers.get('etag'), dataset });
  return dataset ? extract(dataset, url) : null;
}

/** Call after PUT/DELETE so the next read doesn't answer from a stale ETag. */
export function forgetResource(webId: string, url: string): void {
  cache.get(webId)?.delete(url);
}

/** After listing a container, drop cached members that no longer exist. */
export function pruneResources(webId: string, containerUrl: string, liveUrls: Iterable<string>): void {
  const b = cache.get(webId);
  if (!b) return;
  const live = new Set(liveUrls);
  for (const url of Array.from(b.keys())) {
    if (url.startsWith(containerUrl) && !live.has(url)) b.delete(url);
  }
}

export function clearResourceCache(): void {
  cache.clear();
}
