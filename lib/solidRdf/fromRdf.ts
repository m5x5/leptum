// Container listing and id helpers shared by every solidRdf backend module.
// Actual resource reading now goes through @ldo/ldo typed datasets
// (ldoParse.ts's fetchLdoDataset + each type's <type>Shape.ts extraction) —
// see shapes/*.shex for the ShEx shapes those extractions are typed against.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { parseTurtle } from './turtle';

const LDP_CONTAINS = 'http://www.w3.org/ns/ldp#contains';

/** Lists the member resource URLs of an LDP container. */
export async function listContainer(session: SolidSessionInstance, containerUrl: string): Promise<string[]> {
  // no-store: a cached container listing is exactly how saveAll() would end up
  // believing a just-written sibling resource doesn't exist and delete it.
  const res = await session.authFetch(containerUrl, { headers: { Accept: 'text/turtle' }, cache: 'no-store' });
  // A container that doesn't exist yet genuinely means "no records". Anything
  // else (401 after token expiry, 5xx, offline) must NOT look like an empty
  // collection — callers would otherwise render "no data" and could write
  // that emptiness back.
  if (res.status === 404 || res.status === 410) return [];
  if (!res.ok) throw new Error(`Failed to list container ${containerUrl} (${res.status})`);
  const text = await res.text();
  const quads = await parseTurtle(text, containerUrl);
  return quads.filter((q) => q.predicate.value === LDP_CONTAINS).map((q) => q.object.value);
}

export function idFromUrl(url: string): string {
  return url.replace(/\/$/, '').split('/').pop()!.split('#')[0];
}
