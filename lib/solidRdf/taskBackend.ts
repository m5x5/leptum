// Bidirectional task storage over Solid — the container is whatever the type
// index resolved (reused from another app, or newly registered), never a
// hardcoded path. This is the first type made fully Solid-primary; see
// docs/solid-rdf-mapping.md for which others still read/write RS only.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import type { StandaloneTask } from '../remoteStorage';
import { getResolvedContainers } from './activeContainers';
import { taskToRdf, type ExportContext } from './transform';
import { listContainer } from './fromRdf';
import { fetchResourceCached, forgetResource, pruneResources } from './resourceCache';
import { extractTaskFromDataset } from './taskShape';
import { docToTurtle } from './toTurtle';

async function taskUrl(session: SolidSessionInstance, webId: string, id: string): Promise<string> {
  const containers = await getResolvedContainers(session, webId);
  return `${containers.tasks}${encodeURIComponent(id)}`;
}

function fetchTask(session: SolidSessionInstance, webId: string, url: string): Promise<StandaloneTask | null> {
  return fetchResourceCached(session, webId, url, extractTaskFromDataset, 'task');
}

export async function listTasks(session: SolidSessionInstance, webId: string): Promise<StandaloneTask[]> {
  const containers = await getResolvedContainers(session, webId);
  const urls = await listContainer(session, containers.tasks);
  pruneResources(webId, containers.tasks, urls);
  const tasks = await Promise.all(urls.map((url) => fetchTask(session, webId, url)));
  return tasks.filter((t): t is StandaloneTask => t !== null);
}

export async function saveTask(session: SolidSessionInstance, webId: string, task: StandaloneTask): Promise<void> {
  const containers = await getResolvedContainers(session, webId);
  const ctx: ExportContext = { containers };
  const { url, doc } = taskToRdf(ctx, task);
  const res = await session.authFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/turtle' },
    body: await docToTurtle(doc, url),
  });
  if (!res.ok) throw new Error(`Failed to save task to pod (${res.status})`);
  forgetResource(webId, url);
}

/** Read-modify-write, since the pod resource is a whole document (there's no partial-field PUT). */
export async function updateTask(
  session: SolidSessionInstance,
  webId: string,
  id: string,
  updates: Partial<StandaloneTask>
): Promise<void> {
  const url = await taskUrl(session, webId, id);
  const existing = await fetchTask(session, webId, url);
  const merged: StandaloneTask = {
    ...(existing ?? { id, name: '', status: 'due', createdAt: Date.now() }),
    ...updates,
    id,
  };
  await saveTask(session, webId, merged);
}

export async function deleteTask(session: SolidSessionInstance, webId: string, id: string): Promise<void> {
  const url = await taskUrl(session, webId, id);
  const res = await session.authFetch(url, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to delete task from pod (${res.status})`);
  forgetResource(webId, url);
}

/** Persists drag-reorder as each task's own leptum:sortIndex — mirrors RS's reorderHomeTasks. */
export async function reorderTasks(session: SolidSessionInstance, webId: string, orderedIds: string[]): Promise<void> {
  const indexById = new Map(orderedIds.map((id, i) => [id, i]));
  await Promise.all(
    orderedIds.map((id) => updateTask(session, webId, id, { sortIndex: indexById.get(id) }))
  );
}
