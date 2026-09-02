// Bespoke rather than createRdfBackend: weekReflectionToRdf keys the pod
// resource as `week-${r.id}`, not r.id directly, so the generic factory's
// `${container}${id}` URL derivation for update/delete would target the
// wrong resource.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { getResolvedContainers } from './activeContainers';
import { weekReflectionToRdf, type ExportContext } from './transform';
import { listContainer } from './fromRdf';
import { fetchResourceCached, forgetResource, pruneResources } from './resourceCache';
import { extractWeekReflectionFromDataset } from './noteShape';
import { docToTurtle } from './toTurtle';
import type { WeekReflection } from '../remoteStorage';

async function resourceUrl(session: SolidSessionInstance, webId: string, weekStart: string): Promise<string> {
  const containers = await getResolvedContainers(session, webId);
  return `${containers.notes}${encodeURIComponent(`week-${weekStart}`)}`;
}

export async function listWeekReflections(session: SolidSessionInstance, webId: string): Promise<Record<string, WeekReflection>> {
  const containers = await getResolvedContainers(session, webId);
  const urls = await listContainer(session, containers.notes);
  pruneResources(webId, containers.notes, urls);
  const result: Record<string, WeekReflection> = {};
  await Promise.all(
    urls.map(async (url) => {
      const reflection = await fetchResourceCached(session, webId, url, extractWeekReflectionFromDataset, 'week reflection');
      if (reflection) result[reflection.id] = reflection;
    })
  );
  return result;
}

export async function saveWeekReflection(session: SolidSessionInstance, webId: string, reflection: WeekReflection): Promise<void> {
  const containers = await getResolvedContainers(session, webId);
  const ctx: ExportContext = { containers };
  const { url, doc } = weekReflectionToRdf(ctx, reflection);
  const res = await session.authFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/turtle' },
    body: await docToTurtle(doc, url),
  });
  if (!res.ok) throw new Error(`Failed to save week reflection to pod (${res.status})`);
  forgetResource(webId, url);
}

export async function deleteWeekReflection(session: SolidSessionInstance, webId: string, weekStart: string): Promise<void> {
  const url = await resourceUrl(session, webId, weekStart);
  const res = await session.authFetch(url, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to delete week reflection from pod (${res.status})`);
  forgetResource(webId, url);
}
