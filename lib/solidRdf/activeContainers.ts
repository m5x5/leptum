// Caches the resolved (reused-or-newly-registered) container map for the
// current Solid session, so every read/write doesn't re-walk the type index.
// First call after login pays for the real resolution (and may register a
// handful of new containers); everything after that is instant.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { resolveContainers } from './typeIndex';
import { CONTAINER_SPECS, type ContainerKey } from './containers';

let cache: { webId: string; promise: Promise<Record<ContainerKey, string>> } | null = null;

// After a failed resolution (pod down, 503 on a container HEAD, …) every
// caller used to retry immediately, each re-fetching the WebID profile and
// both type indexes — a request storm exactly when the pod is struggling.
// Failed attempts are now shared for a short back-off window.
const FAILURE_BACKOFF_MS = 10_000;
let failedAt = 0;

export function getResolvedContainers(
  session: SolidSessionInstance,
  webId: string
): Promise<Record<ContainerKey, string>> {
  if (cache?.webId === webId) return cache.promise;
  if (Date.now() - failedAt < FAILURE_BACKOFF_MS) {
    return Promise.reject(new Error('Pod container resolution failed recently — backing off before retrying.'));
  }
  const promise = resolveContainers(session, webId, CONTAINER_SPECS).then((r) => r.containers);
  cache = { webId, promise };
  promise.catch(() => {
    failedAt = Date.now();
    if (cache?.promise === promise) cache = null; // let a later call retry
  });
  return promise;
}

export function invalidateResolvedContainers(): void {
  cache = null;
  failedAt = 0;
}
