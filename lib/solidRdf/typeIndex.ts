// Discovers a Solid pod's type index and resolves, per resource type, the
// container to write into — reusing whatever's already registered there
// (by any app) before ever minting a new, generic container of our own.
//
// Why private, not public: solid:publicTypeIndex entries are advertised to
// anyone who fetches the index — fine for a contacts app, wrong for "here's
// where this person's mood/task data lives." Everything here goes through
// solid:privateTypeIndex.
import type { Quad } from "n3";
import type { Session as SolidSessionInstance } from "@uvdsl/solid-oidc-client-browser";
import type { ContainerKey, ContainerSpec } from "./containers";
import { parseTurtle } from "./turtle";

const SOLID = "http://www.w3.org/ns/solid/terms#";
const SPACE = "http://www.w3.org/ns/pim/space#";

async function fetchTurtle(session: SolidSessionInstance, url: string): Promise<Quad[] | null> {
  const res = await session.authFetch(url, { headers: { Accept: "text/turtle" } });
  if (!res.ok) return null;
  const text = await res.text();
  return parseTurtle(text, url);
}

async function resourceExists(session: SolidSessionInstance, url: string): Promise<boolean> {
  const head = await session.authFetch(url, { method: "HEAD" });
  if (head.ok) return true;
  if (head.status !== 405) return false;
  const get = await session.authFetch(url, { method: "GET" });
  return get.ok;
}

async function ensureContainerExists(session: SolidSessionInstance, containerUrl: string): Promise<void> {
  const url = containerUrl.endsWith("/") ? containerUrl : `${containerUrl}/`;
  if (await resourceExists(session, url)) return;
  const res = await session.authFetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "text/turtle",
      Link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
    },
    body: "",
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to create container ${url} (${res.status})`);
  }
}

export interface PodContext {
  webId: string;
  profileDocUrl: string;
  privateTypeIndexUrl: string | null;
  /** Read-only here: Leptum never registers into it, but other apps' data (address books) is found through it. */
  publicTypeIndexUrl: string | null;
  podRoot: string | null;
}

export async function discoverPodContext(session: SolidSessionInstance, webId: string): Promise<PodContext> {
  const profileDocUrl = webId.split("#")[0];
  const quads = await fetchTurtle(session, profileDocUrl);
  if (!quads) throw new Error(`Could not fetch WebID profile at ${profileDocUrl}`);

  let privateTypeIndexUrl: string | null = null;
  let publicTypeIndexUrl: string | null = null;
  let podRoot: string | null = null;
  for (const q of quads) {
    if (q.subject.value !== webId) continue;
    if (q.predicate.value === `${SOLID}privateTypeIndex`) privateTypeIndexUrl = q.object.value;
    if (q.predicate.value === `${SOLID}publicTypeIndex`) publicTypeIndexUrl = q.object.value;
    if (q.predicate.value === `${SPACE}storage`) podRoot = q.object.value;
  }
  // Fall back to the pod root implied by the WebID itself if space:storage is absent —
  // works for the common /<user>/profile/card#me layout most Solid servers use.
  if (!podRoot) {
    const match = profileDocUrl.match(/^(https?:\/\/[^/]+\/[^/]+\/)/);
    podRoot = match ? match[1] : null;
  }

  return { webId, profileDocUrl, privateTypeIndexUrl, publicTypeIndexUrl, podRoot };
}

export interface TypeRegistration {
  subject: string;
  classes: string[];
  container?: string;
  instance?: string;
}

export async function readTypeRegistrations(
  session: SolidSessionInstance,
  typeIndexUrl: string
): Promise<TypeRegistration[]> {
  const quads = await fetchTurtle(session, typeIndexUrl);
  if (!quads) return [];

  const bySubject = new Map<string, TypeRegistration>();
  for (const q of quads) {
    const s = q.subject.value;
    if (!bySubject.has(s)) bySubject.set(s, { subject: s, classes: [] });
    const entry = bySubject.get(s)!;
    if (q.predicate.value === `${SOLID}forClass`) entry.classes.push(q.object.value);
    else if (q.predicate.value === `${SOLID}instanceContainer`) entry.container = q.object.value;
    else if (q.predicate.value === `${SOLID}instance`) entry.instance = q.object.value;
  }
  return Array.from(bySubject.values()).filter((r) => r.classes.length > 0 && (r.container || r.instance));
}

const classSetKey = (classes: string[]) => [...classes].sort().join("|");

export function findRegistration(
  registrations: TypeRegistration[],
  classes: string[]
): TypeRegistration | undefined {
  const key = classSetKey(classes);
  return registrations.find((r) => classSetKey(r.classes) === key);
}

/** Creates an empty private type index and links it from the profile, for pods that don't already have one. */
export async function ensurePrivateTypeIndex(
  session: SolidSessionInstance,
  ctx: PodContext
): Promise<string> {
  if (ctx.privateTypeIndexUrl) return ctx.privateTypeIndexUrl;
  if (!ctx.podRoot) {
    throw new Error("Can't bootstrap a type index — no pod root (space:storage) found on the WebID profile.");
  }

  await ensureContainerExists(session, `${ctx.podRoot}settings/`);

  const indexUrl = `${ctx.podRoot}settings/privateTypeIndex.ttl`;
  const putRes = await session.authFetch(indexUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle" },
    body: `@prefix solid: <${SOLID}>.\n\n<> a solid:TypeIndex, solid:UnlistedDocument.\n`,
  });
  if (!putRes.ok) throw new Error(`Failed to create private type index (${putRes.status})`);

  const patchRes = await session.authFetch(ctx.profileDocUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/sparql-update" },
    body: `PREFIX solid: <${SOLID}>\nINSERT DATA { <${ctx.webId}> solid:privateTypeIndex <${indexUrl}>. }`,
  });
  if (!patchRes.ok) throw new Error(`Failed to link private type index from profile (${patchRes.status})`);

  return indexUrl;
}

export async function registerType(
  session: SolidSessionInstance,
  indexUrl: string,
  classes: string[],
  container: string
): Promise<void> {
  const slug = container.replace(/\/+$/, "").split("/").pop() || "registration";
  const node = `#registration-${slug}`;
  const classTriples = classes.map((c) => `<${c}>`).join(", ");
  const body =
    `PREFIX solid: <${SOLID}>\n` +
    `INSERT DATA { <${node}> a solid:TypeRegistration; solid:forClass ${classTriples}; solid:instanceContainer <${container}>. }`;
  const res = await session.authFetch(indexUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/sparql-update" },
    body,
  });
  if (!res.ok) throw new Error(`Failed to register ${classes.join(" + ")} in the type index (${res.status})`);
}

export interface ResolvedContainers {
  containers: Record<ContainerKey, string>;
  reused: { key: ContainerKey; container: string }[];
  created: { key: ContainerKey; container: string }[];
}

/**
 * For each spec: reuse an existing type-index registration for that exact
 * class set if one exists (from Leptum or any other app on this pod);
 * otherwise mint a generic container at the pod root and register it.
 */
export async function resolveContainers(
  session: SolidSessionInstance,
  webId: string,
  specs: ContainerSpec[]
): Promise<ResolvedContainers> {
  const podCtx = await discoverPodContext(session, webId);
  const indexUrl = await ensurePrivateTypeIndex(session, podCtx);
  const registrations = await readTypeRegistrations(session, indexUrl);
  const podRoot = podCtx.podRoot;
  if (!podRoot) throw new Error("Can't resolve containers — no pod root found.");

  const containers = {} as Record<ContainerKey, string>;
  const reused: ResolvedContainers["reused"] = [];
  const created: ResolvedContainers["created"] = [];

  for (const spec of specs) {
    const existing = findRegistration(registrations, spec.classes);
    if (existing?.container) {
      await ensureContainerExists(session, existing.container);
      containers[spec.key] = existing.container;
      reused.push({ key: spec.key, container: existing.container });
      continue;
    }
    const container = `${podRoot}${spec.defaultName}/`;
    await ensureContainerExists(session, container);
    await registerType(session, indexUrl, spec.classes, container);
    containers[spec.key] = container;
    created.push({ key: spec.key, container });
    // So a second spec in this same run with an identical class set (shouldn't
    // happen given CONTAINER_SPECS, but cheap insurance) sees this registration too.
    registrations.push({ subject: `${indexUrl}#registration-${spec.defaultName}`, classes: spec.classes, container });
  }

  return { containers, reused, created };
}
