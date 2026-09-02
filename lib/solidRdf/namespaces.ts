// RDF vocabularies used across the Solid Linked Data export.
// Prefer an established vocabulary's own terms wherever a concept has one;
// `leptum:` only covers what genuinely has no existing shape (mood dials,
// tracking config, device telemetry, and Leptum-specific back-references).
export const NS = {
  schema: 'https://schema.org/',
  ical: 'http://www.w3.org/2002/12/cal/ical#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  as: 'https://www.w3.org/ns/activitystreams#',
  oa: 'http://www.w3.org/ns/oa#',
  dcterms: 'http://purl.org/dc/terms/',
  ui: 'http://www.w3.org/ns/ui#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  // Hosted at mpeters.dev — see docs/leptum-vocab.ttl for the terms this defines.
  leptum: 'https://mpeters.dev/ns/leptum#',
} as const;

export const CONTEXT = {
  schema: NS.schema,
  ical: NS.ical,
  foaf: NS.foaf,
  as: NS.as,
  oa: NS.oa,
  dcterms: NS.dcterms,
  ui: NS.ui,
  xsd: NS.xsd,
  leptum: NS.leptum,
};

export const schema = (term: string) => `schema:${term}`;
export const ical = (term: string) => `ical:${term}`;
export const foaf = (term: string) => `foaf:${term}`;
export const as = (term: string) => `as:${term}`;
export const oa = (term: string) => `oa:${term}`;
export const dcterms = (term: string) => `dcterms:${term}`;
export const ui = (term: string) => `ui:${term}`;
export const leptum = (term: string) => `leptum:${term}`;
