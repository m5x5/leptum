// Discovers the Solid address books on a pod and loads contacts from them.
//
// The model here is the one SolidOS (mashlib's contacts pane, via solid-ui)
// writes, which the other vcard-based Solid contact apps read as well:
//
//   <index.ttl#this> a vcard:AddressBook ;
//       dc:title "Personal" ;
//       vcard:nameEmailIndex <people.ttl> ;   # every contact's name/email, one file
//       vcard:groupIndex     <groups.ttl> .   # every group's name, one file
//
//   people.ttl:  <Person/x/index.ttl#this> vcard:inAddressBook <index.ttl#this> ; vcard:fn "Alice" .
//   groups.ttl:  <index.ttl#this> vcard:includesGroup <Group/y/index.ttl#this> .
//                <Group/y/index.ttl#this> a vcard:Group ; vcard:fn "Friends" .
//   Group/y/index.ttl:  <#this> vcard:hasMember <Person/x/index.ttl#this> .
//
// Books are found through the type index (`solid:forClass vcard:AddressBook`).
// SolidOS registers them in the *public* index by default, so both indexes are
// read. A pod with no registration falls back to probing `<root>/contacts/`,
// the folder SolidOS creates when it makes the first book.
import type { Quad } from "n3";
import type { Session as SolidSessionInstance } from "@uvdsl/solid-oidc-client-browser";
import { parseTurtle } from "./turtle";
import { discoverPodContext, readTypeRegistrations } from "./typeIndex";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const LDP_CONTAINS = "http://www.w3.org/ns/ldp#contains";
const VCARD = "http://www.w3.org/2006/vcard/ns#";
const FOAF = "http://xmlns.com/foaf/0.1/";
const SCHEMA = "https://schema.org/";
const DC_TITLE = "http://purl.org/dc/elements/1.1/title";
const DCTERMS_TITLE = "http://purl.org/dc/terms/title";

export const VCARD_ADDRESS_BOOK = `${VCARD}AddressBook`;
export const VCARD_GROUP = `${VCARD}Group`;

export interface AddressBookGroup {
  url: string;
  name: string;
}

export interface AddressBook {
  url: string;
  title: string;
  groups: AddressBookGroup[];
  /** vcard:nameEmailIndex — absent on single-file books written by other apps. */
  peopleIndexUrl?: string;
}

export interface ContactSourceSelection {
  /** Whole address books (vcard:AddressBook IRIs). */
  books: string[];
  /** Individual groups (vcard:Group IRIs). */
  groups: string[];
}

export interface AddressBookContact {
  url: string;
  name: string;
  email?: string;
}

const NAME_PREDICATES = [`${VCARD}fn`, `${FOAF}name`, `${SCHEMA}name`];
const PERSON_CLASSES = new Set([`${VCARD}Individual`, `${FOAF}Person`, `${SCHEMA}Person`]);

// Every pod fetch here is read-only and best-effort: a missing or unreadable
// document just contributes nothing rather than failing the whole discovery.
async function fetchQuads(session: SolidSessionInstance, url: string): Promise<Quad[]> {
  try {
    const res = await session.authFetch(url, { headers: { Accept: "text/turtle" }, cache: "no-store" });
    if (!res.ok) return [];
    return await parseTurtle(await res.text(), url);
  } catch {
    return [];
  }
}

function firstLiteral(quads: Quad[], subject: string, predicates: string[]): string | undefined {
  for (const p of predicates) {
    const q = quads.find((x) => x.subject.value === subject && x.predicate.value === p && x.object.termType === "Literal");
    if (q) return q.object.value;
  }
  return undefined;
}

function firstIri(quads: Quad[], subject: string, predicate: string): string | undefined {
  return quads.find((q) => q.subject.value === subject && q.predicate.value === predicate && q.object.termType === "NamedNode")
    ?.object.value;
}

function subjectsOfType(quads: Quad[], cls: string): string[] {
  return Array.from(
    new Set(quads.filter((q) => q.predicate.value === RDF_TYPE && q.object.value === cls).map((q) => q.subject.value)),
  );
}

function docUrl(iri: string): string {
  return iri.split("#")[0];
}

function fallbackTitle(bookUrl: string): string {
  // .../contacts/Personal/index.ttl#this → "Personal"
  const segments = docUrl(bookUrl).split("/").filter(Boolean);
  const folder = segments[segments.length - 2];
  return folder ? decodeURIComponent(folder) : bookUrl;
}

/** Reads one address book resource plus its group index. Returns null if the IRI isn't a vcard:AddressBook. */
async function readAddressBook(session: SolidSessionInstance, bookIri: string): Promise<AddressBook | null> {
  const quads = await fetchQuads(session, docUrl(bookIri));
  if (quads.length === 0) return null;

  // A registration may point at the document rather than the `#this` node.
  const books = subjectsOfType(quads, VCARD_ADDRESS_BOOK);
  const url = books.includes(bookIri) ? bookIri : books[0];
  if (!url) return null;

  const title = firstLiteral(quads, url, [DC_TITLE, DCTERMS_TITLE]) ?? fallbackTitle(url);
  const peopleIndexUrl = firstIri(quads, url, `${VCARD}nameEmailIndex`);
  const groupIndexUrl = firstIri(quads, url, `${VCARD}groupIndex`);

  const groups: AddressBookGroup[] = [];
  if (groupIndexUrl) {
    const groupQuads = await fetchQuads(session, groupIndexUrl);
    const groupIris = new Set<string>();
    for (const q of groupQuads) {
      if (q.subject.value === url && q.predicate.value === `${VCARD}includesGroup` && q.object.termType === "NamedNode") {
        groupIris.add(q.object.value);
      }
    }
    for (const g of subjectsOfType(groupQuads, VCARD_GROUP)) groupIris.add(g);
    for (const g of Array.from(groupIris)) {
      groups.push({ url: g, name: firstLiteral(groupQuads, g, NAME_PREDICATES) ?? fallbackTitle(g) });
    }
    groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  return { url, title, groups, peopleIndexUrl };
}

/** Lists the members of an LDP container (absolute IRIs), or [] if it can't be read. */
async function listContainer(session: SolidSessionInstance, containerUrl: string): Promise<string[]> {
  const quads = await fetchQuads(session, containerUrl);
  return quads.filter((q) => q.predicate.value === LDP_CONTAINS && q.object.termType === "NamedNode").map((q) => q.object.value);
}

/**
 * Candidate address-book IRIs from the type indexes. `solid:instance` points
 * straight at a book; `solid:instanceContainer` means "every book under here",
 * which SolidOS lays out as one `<name>/index.ttl` per book.
 */
async function candidateBookIrisFromTypeIndex(session: SolidSessionInstance, webId: string): Promise<string[]> {
  const ctx = await discoverPodContext(session, webId);
  const indexes = [ctx.publicTypeIndexUrl, ctx.privateTypeIndexUrl].filter((u): u is string => !!u);
  const candidates = new Set<string>();

  for (const indexUrl of indexes) {
    const registrations = await readTypeRegistrations(session, indexUrl).catch(() => []);
    for (const reg of registrations) {
      if (!reg.classes.includes(VCARD_ADDRESS_BOOK)) continue;
      if (reg.instance) candidates.add(reg.instance);
      if (reg.container) {
        for (const child of await listContainer(session, reg.container)) {
          candidates.add(child.endsWith("/") ? `${child}index.ttl#this` : child);
        }
      }
    }
  }
  return Array.from(candidates);
}

/** SolidOS's default location when nothing is registered yet, plus profile links older apps used. */
async function candidateBookIrisFromConventions(session: SolidSessionInstance, webId: string): Promise<string[]> {
  const candidates = new Set<string>();
  const profileQuads = await fetchQuads(session, docUrl(webId));
  for (const q of profileQuads) {
    if (q.subject.value !== webId || q.object.termType !== "NamedNode") continue;
    if (q.predicate.value === `${VCARD}hasAddressBook` || q.predicate.value === "http://www.w3.org/ns/pim/space#addressBook") {
      candidates.add(q.object.value);
    }
  }
  const podRoot = docUrl(webId).match(/^(https?:\/\/[^/]+\/[^/]+\/)/)?.[1];
  if (podRoot) {
    for (const child of await listContainer(session, `${podRoot}contacts/`)) {
      candidates.add(child.endsWith("/") ? `${child}index.ttl#this` : child);
    }
  }
  return Array.from(candidates);
}

const MAX_BOOKS = 25;

export async function discoverAddressBooks(session: SolidSessionInstance, webId: string): Promise<AddressBook[]> {
  let candidates = await candidateBookIrisFromTypeIndex(session, webId).catch(() => [] as string[]);
  if (candidates.length === 0) candidates = await candidateBookIrisFromConventions(session, webId);

  const books = new Map<string, AddressBook>();
  for (const iri of candidates.slice(0, MAX_BOOKS)) {
    const book = await readAddressBook(session, iri);
    if (book && !books.has(book.url)) books.set(book.url, book);
  }
  return Array.from(books.values()).sort((a, b) => a.title.localeCompare(b.title));
}

function contactFromQuads(quads: Quad[], subject: string): AddressBookContact | null {
  const fullName = firstLiteral(quads, subject, NAME_PREDICATES);
  const given = firstLiteral(quads, subject, [`${VCARD}given-name`, `${VCARD}givenName`, `${SCHEMA}givenName`]);
  const family = firstLiteral(quads, subject, [`${VCARD}family-name`, `${VCARD}familyName`, `${SCHEMA}familyName`]);
  const email = firstLiteral(quads, subject, [`${VCARD}hasEmail`, `${SCHEMA}email`]);
  const name = fullName ?? ([given, family].filter(Boolean).join(" ") || email);
  return name ? { url: subject, name, email } : null;
}

/** Every contact in a book: the people index if it has one, else whatever people the book document itself lists. */
async function contactsInBook(session: SolidSessionInstance, book: AddressBook): Promise<AddressBookContact[]> {
  const quads = await fetchQuads(session, book.peopleIndexUrl ?? docUrl(book.url));
  const subjects = new Set<string>();
  for (const q of quads) {
    if (q.subject.termType !== "NamedNode") continue;
    const inBook = q.predicate.value === `${VCARD}inAddressBook` && q.object.value === book.url;
    const isPerson = q.predicate.value === RDF_TYPE && PERSON_CLASSES.has(q.object.value);
    if (inBook || isPerson) subjects.add(q.subject.value);
  }
  const out: AddressBookContact[] = [];
  for (const s of Array.from(subjects)) {
    const c = contactFromQuads(quads, s);
    if (c) out.push(c);
  }
  return out;
}

const MAX_MEMBER_FETCHES = 25;

/** Members of one group. Names come from the group file, then the book's people index, then (bounded) the person's own card. */
async function contactsInGroup(
  session: SolidSessionInstance,
  groupUrl: string,
  knownNames: Map<string, AddressBookContact>,
): Promise<AddressBookContact[]> {
  const quads = await fetchQuads(session, docUrl(groupUrl));
  const members = quads
    .filter((q) => q.subject.value === groupUrl && q.predicate.value === `${VCARD}hasMember` && q.object.termType === "NamedNode")
    .map((q) => q.object.value);

  const out: AddressBookContact[] = [];
  let fetches = 0;
  for (const m of members) {
    const local = contactFromQuads(quads, m);
    if (local) {
      out.push(local);
      continue;
    }
    const known = knownNames.get(m);
    if (known) {
      out.push(known);
      continue;
    }
    if (fetches++ >= MAX_MEMBER_FETCHES) continue;
    const c = contactFromQuads(await fetchQuads(session, docUrl(m)), m);
    if (c) out.push(c);
  }
  return out;
}

/**
 * Contacts for the user's chosen sources. An empty selection means "every
 * address book" — the sensible default for a pod that was never configured.
 */
export async function loadContactsForSelection(
  session: SolidSessionInstance,
  books: AddressBook[],
  selection: ContactSourceSelection,
): Promise<AddressBookContact[]> {
  const nothingChosen = selection.books.length === 0 && selection.groups.length === 0;
  const wholeBooks = nothingChosen ? books : books.filter((b) => selection.books.includes(b.url));
  const byUrl = new Map<string, AddressBookContact>();

  for (const book of wholeBooks) {
    for (const c of await contactsInBook(session, book)) byUrl.set(c.url, c);
  }

  // Groups whose whole book is already included add nothing new.
  const coveredBookUrls = new Set(wholeBooks.map((b) => b.url));
  const groupUrls = nothingChosen
    ? []
    : selection.groups.filter((g) => !books.some((b) => coveredBookUrls.has(b.url) && b.groups.some((x) => x.url === g)));

  if (groupUrls.length > 0) {
    // One people-index read per parent book gives names for most members without touching each card.
    const knownNames = new Map<string, AddressBookContact>();
    const parentBooks = books.filter((b) => !coveredBookUrls.has(b.url) && b.groups.some((g) => groupUrls.includes(g.url)));
    for (const book of parentBooks) {
      for (const c of await contactsInBook(session, book)) knownNames.set(c.url, c);
    }
    for (const g of groupUrls) {
      for (const c of await contactsInGroup(session, g, knownNames)) byUrl.set(c.url, c);
    }
  }

  return Array.from(byUrl.values()).sort((a, b) => a.name.localeCompare(b.name));
}
