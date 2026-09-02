import { Parser as N3Parser } from 'n3';

type FetchLike = typeof fetch;

type SolidProfileSession = {
  authFetch?: FetchLike;
};

const SCHEMA = 'https://schema.org/';
const VCARD = 'http://www.w3.org/2006/vcard/ns#';

export async function getSolidProfileBirthDate(
  webId: string,
  session?: SolidProfileSession | null
): Promise<string | undefined> {
  try {
    const fetcher = session?.authFetch?.bind(session) ?? fetch;
    const res = await fetcher(webId, { headers: { Accept: 'text/turtle' } });
    if (!res.ok) return undefined;

    const text = await res.text();
    const quads = new N3Parser({ baseIRI: webId }).parse(text);

    for (const q of quads) {
      if (q.subject.value !== webId || q.object.termType !== 'Literal') continue;
      const predicate = q.predicate.value;
      if (predicate === `${SCHEMA}birthDate` || predicate === `${VCARD}bday`) {
        return q.object.value;
      }
    }
  } catch (error) {
    console.error('Failed to read birth date from Solid profile:', error);
  }

  return undefined;
}
