// Routines embed their tasks as nested VTODO nodes (leptum:routineTask — see
// routineToRdf), which the flat Fact[] reader in fromRdf.ts doesn't flatten
// (see the comment on nodeToFacts). So we read the JSON-LD document directly
// instead of through Fact[] to recover the nested task list.
//
// Some routine resources get round-tripped through a soukai-solid CRDT-based
// app sharing this pod (telltale https://vocab.noeldemartin.com/crdt/Metadata
// companion triples) and come back as *expanded* JSON-LD — a flat array of
// nodes with full-IRI predicate keys and blank-node references for
// leptum:routineTask, instead of the single compact nested object Leptum
// itself writes. expandArrayDoc() below re-nests those back into the same
// compact shape extractRoutine()/extractRoutineTask() expect, so those
// routines don't silently vanish from the list.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { getResolvedContainers } from './activeContainers';
import { routineToRdf, type ExportContext } from './transform';
import { listContainer, idFromUrl } from './fromRdf';
import { rruleToCron } from './cronToRrule';
import { NS } from './namespaces';
import type { Routine, RoutineTask } from '../remoteStorage';

const PREFIX_BY_IRI: [iri: string, prefix: string][] = [
  [NS.schema, 'schema'],
  [NS.ical, 'ical'],
  [NS.leptum, 'leptum'],
];

function compactPredicate(iri: string): string | null {
  for (const [full, prefix] of PREFIX_BY_IRI) {
    if (iri.startsWith(full)) return `${prefix}:${iri.slice(full.length)}`;
  }
  return null;
}

/** Unwraps expanded JSON-LD value descriptors ({"@value":..}/{"@id":..}) back to plain values or @id refs. */
function compactValues(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  const mapped = raw.map((entry) => {
    if (entry && typeof entry === 'object') {
      if ('@value' in (entry as Record<string, unknown>)) return (entry as Record<string, unknown>)['@value'];
      if ('@id' in (entry as Record<string, unknown>)) return { '@id': (entry as Record<string, unknown>)['@id'] };
    }
    return entry;
  });
  return mapped.length === 1 ? mapped[0] : mapped;
}

/** Re-nests one expanded-form node (and, recursively, any leptum:routineTask/leptum:task blank nodes it references) into Leptum's compact JSON-LD shape. */
function compactExpandedNode(
  node: Record<string, unknown>,
  idMap: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '@id') continue;
    if (key === '@type') {
      out['@type'] = value;
      continue;
    }
    const compactKey = compactPredicate(key);
    if (!compactKey) continue; // drop vocab we don't read (e.g. crdt:*)
    if (compactKey === 'leptum:routineTask' || compactKey === 'leptum:task') {
      const refs = Array.isArray(value) ? value : [value];
      out[compactKey] = refs
        .map((ref) =>
          ref && typeof ref === 'object' && '@id' in (ref as Record<string, unknown>)
            ? idMap.get((ref as Record<string, unknown>)['@id'] as string)
            : undefined
        )
        .filter((n): n is Record<string, unknown> => !!n)
        .map((n) => compactExpandedNode(n, idMap));
      continue;
    }
    out[compactKey] = compactValues(value);
  }
  return out;
}

/** Converts an expanded JSON-LD array response into the single compact document extractRoutine() expects, or null if no matching node is found. */
function expandArrayDoc(nodes: unknown[], url: string): Record<string, unknown> | null {
  const objectNodes = nodes.filter((n): n is Record<string, unknown> => !!n && typeof n === 'object' && '@id' in n);
  const idMap = new Map(objectNodes.map((n) => [n['@id'] as string, n]));
  const mainNode =
    idMap.get(url) ??
    objectNodes.find((n) => {
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      return types.includes(`${NS.leptum}Routine`);
    });
  return mainNode ? compactExpandedNode(mainNode, idMap) : null;
}

function strVal(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const val = Array.isArray(v) ? v[0] : v;
  return val && typeof val === 'object' ? undefined : String(val);
}
function idRef(v: unknown): string | undefined {
  const val = Array.isArray(v) ? v[0] : v;
  if (val && typeof val === 'object' && '@id' in val) return String((val as { '@id': string })['@id']);
  return undefined;
}
function allIdRefs(v: unknown): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr
    .filter((x): x is { '@id': string } => !!x && typeof x === 'object' && '@id' in x)
    .map((x) => x['@id']);
}
function boolVal(v: unknown): boolean | undefined {
  const s = strVal(v);
  return s === undefined ? undefined : s === 'true';
}
function numVal(v: unknown): number | undefined {
  const s = strVal(v);
  return s === undefined ? undefined : Number(s);
}
function statusFromDoc(v: unknown): string | undefined {
  const ref = idRef(v);
  if (!ref) return undefined;
  if (ref.includes('CompletedActionStatus')) return 'completed';
  if (ref.includes('FailedActionStatus')) return 'archived';
  if (ref.includes('ActiveActionStatus')) return 'active';
  return undefined;
}

async function fetchRoutineDoc(session: SolidSessionInstance, url: string): Promise<Record<string, unknown> | null> {
  const res = await session.authFetch(url, { headers: { Accept: 'application/ld+json' } });
  if (!res.ok) return null;
  try {
    const json = JSON.parse(await res.text());
    return Array.isArray(json) ? expandArrayDoc(json, url) : json;
  } catch {
    return null;
  }
}

function extractRoutineTask(node: Record<string, unknown>, index: number, routineId: string): RoutineTask {
  const name = strVal(node['schema:name']) ?? strVal(node['ical:summary']) ?? '';
  const task: RoutineTask = {
    id: `${routineId}-task-${index}`,
    name,
    routineId,
    index,
    status: statusFromDoc(node['schema:actionStatus']) ?? 'pending',
  };
  const description = strVal(node['schema:description']);
  if (description) task.description = description;
  const completedIso = strVal(node['leptum:completedAt']);
  if (completedIso) task.completedAt = new Date(completedIso).getTime();
  const effort = strVal(node['leptum:effort']);
  if (effort) task.effort = effort as RoutineTask['effort'];
  const numericEstimate = numVal(node['leptum:numericEstimate']);
  if (numericEstimate !== undefined) task.numericEstimate = numericEstimate;
  const order = numVal(node['leptum:order']);
  if (order !== undefined) task.index = order;
  return task;
}

function extractRoutine(doc: Record<string, unknown>, url: string): Routine | null {
  const name = strVal(doc['schema:name']) ?? strVal(doc['ical:summary']);
  if (!name) return null;
  const id = idFromUrl(url);
  const rrule = strVal(doc['ical:rrule']);
  const cron = rrule ? rruleToCron(rrule) : undefined;
  const goalRefs = allIdRefs(doc['schema:about']);
  const isShowUpRoutine = boolVal(doc['leptum:isShowUpRoutine']);
  const rawTasks = doc['leptum:routineTask'] ?? doc['leptum:task'];
  const tasks = Array.isArray(rawTasks)
    ? rawTasks
        .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
        .map((t, i) => extractRoutineTask(t, i, id))
    : [];

  const routine: Routine = { id, name, index: 0, tasks };
  const description = strVal(doc['schema:description']);
  if (description) routine.description = description;
  if (rrule) routine.rrule = rrule;
  if (cron) routine.cron = cron;
  const status = statusFromDoc(doc['schema:actionStatus']);
  if (status) routine.status = status;
  if (goalRefs.length) routine.goalIds = goalRefs.map(idFromUrl);
  if (isShowUpRoutine !== undefined) routine.isShowUpRoutine = isShowUpRoutine;
  return routine;
}

async function resourceUrl(session: SolidSessionInstance, webId: string, id: string): Promise<string> {
  const containers = await getResolvedContainers(session, webId);
  return `${containers.routines}${encodeURIComponent(id)}`;
}

export async function listRoutines(session: SolidSessionInstance, webId: string): Promise<Routine[]> {
  const containers = await getResolvedContainers(session, webId);
  const urls = [
    ...(await listContainer(session, containers.routines)),
    ...(await listContainer(session, containers.tasks)),
  ];
  const routines = await Promise.all(
    Array.from(new Set(urls)).map(async (url) => {
      const doc = await fetchRoutineDoc(session, url);
      if (!doc || (doc['leptum:routineTask'] === undefined && doc['leptum:task'] === undefined && doc['ical:rrule'] === undefined && doc['@type']?.toString().includes('Routine') !== true)) return null;
      return extractRoutine(doc, url);
    })
  );
  // The same routine id can exist in both the routines and (legacy) tasks
  // container — urls lists routines-container entries first, so keep only
  // the first occurrence of each id.
  const seenIds = new Set<string>();
  return routines.filter((r): r is Routine => {
    if (!r || seenIds.has(r.id)) return false;
    seenIds.add(r.id);
    return true;
  });
}

export async function getRoutine(session: SolidSessionInstance, webId: string, id: string): Promise<Routine | null> {
  const containers = await getResolvedContainers(session, webId);
  const urls = [`${containers.routines}${encodeURIComponent(id)}`, `${containers.tasks}${encodeURIComponent(id)}`];
  for (const url of urls) {
    const doc = await fetchRoutineDoc(session, url);
    const routine = doc ? extractRoutine(doc, url) : null;
    if (routine) return routine;
  }
  return null;
}

export async function saveRoutine(session: SolidSessionInstance, webId: string, routine: Routine): Promise<void> {
  const containers = await getResolvedContainers(session, webId);
  const ctx: ExportContext = { containers };
  const { resource } = routineToRdf(ctx, routine);
  const res = await session.authFetch(resource.url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/ld+json' },
    body: JSON.stringify(resource.doc),
  });
  if (!res.ok) throw new Error(`Failed to save routine to pod (${res.status})`);
}

export async function deleteRoutine(session: SolidSessionInstance, webId: string, id: string): Promise<void> {
  const containers = await getResolvedContainers(session, webId);
  const urls = [`${containers.routines}${encodeURIComponent(id)}`, `${containers.tasks}${encodeURIComponent(id)}`];
  const responses = await Promise.all(urls.map((url) => session.authFetch(url, { method: 'DELETE' })));
  const failed = responses.find((res) => !res.ok && res.status !== 404);
  if (failed) throw new Error(`Failed to delete routine from pod (${failed.status})`);
}
