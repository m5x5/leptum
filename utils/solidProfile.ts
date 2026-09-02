import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { parseLdoDatasetText } from '../lib/solidRdf/ldoParse';

export type SolidProfile = {
  name: string | null;
  photo: string | null;
  birthDate: string | null;
};

const EMPTY_PROFILE: SolidProfile = { name: null, photo: null, birthDate: null };

const FOAF = 'http://xmlns.com/foaf/0.1/';
const SCHEMA = 'https://schema.org/';
const VCARD = 'http://www.w3.org/2006/vcard/ns#';

/**
 * Fetch the WebID profile document for a pod owner and pull out the display
 * name, photo and birth date. Profile docs vary a lot between pod servers, so
 * every field is optional and a document that fails to fetch or parse just
 * yields nulls — callers fall back to a URL-derived name and a generic icon.
 */
export async function fetchSolidProfile(
  webId: string,
  session?: SolidSessionInstance | null,
): Promise<SolidProfile> {
  try {
    const headers = { Accept: 'text/turtle, application/ld+json;q=0.9' };
    const res = session ? await session.authFetch(webId, { headers }) : await fetch(webId, { headers });
    if (!res.ok) return EMPTY_PROFILE;
    // Same parser as every other pod read: handles Turtle and JSON-LD profiles
    // (and the directional-langstring quirk some servers emit).
    const dataset = await parseLdoDatasetText(await res.text(), res.headers.get('content-type') ?? '', webId);
    if (!dataset) return EMPTY_PROFILE;
    const quads = dataset.match(null, null, null, null).toArray();

    let fullName: string | null = null;
    let givenName: string | null = null;
    let familyName: string | null = null;
    let fn: string | null = null;
    let nickname: string | null = null;
    let photo: string | null = null;
    let birthDate: string | null = null;

    for (const q of quads) {
      if (q.subject.value !== webId) continue;
      const p = q.predicate.value;
      const literal = q.object.termType === 'Literal' ? q.object.value : null;
      if (!fullName && p === `${FOAF}name` && literal) fullName = literal;
      if (!givenName && (p === `${VCARD}given-name` || p === `${VCARD}givenName`) && literal) givenName = literal;
      if (!familyName && (p === `${VCARD}family-name` || p === `${VCARD}familyName`) && literal) familyName = literal;
      if (!fn && p === `${VCARD}fn` && literal) fn = literal;
      if (!nickname && (p === `${VCARD}nickname` || p === `${FOAF}nick`) && literal) nickname = literal;
      if (!photo && (p === `${FOAF}img` || p === `${VCARD}hasPhoto`) && q.object.termType === 'NamedNode') {
        photo = q.object.value;
      }
      if (!birthDate && (p === `${SCHEMA}birthDate` || p === `${VCARD}bday`) && literal) birthDate = literal;
    }

    // Prefer an explicit full name, then given+family name, then fn — and if all
    // we have is a first name, tack on the nickname field since some pods store
    // the surname there instead of a proper vcard:family-name.
    let name = fullName ?? (givenName && familyName ? `${givenName} ${familyName}` : null) ?? fn;
    if (name && nickname && !name.toLowerCase().includes(nickname.toLowerCase())) {
      name = `${name} ${nickname}`;
    }

    return { name, photo, birthDate };
  } catch (error) {
    console.error('Failed to load Solid profile document:', error);
    return EMPTY_PROFILE;
  }
}
