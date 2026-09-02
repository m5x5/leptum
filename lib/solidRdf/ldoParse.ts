// Bridges raw pod resource bytes (Turtle or JSON-LD) into an @ldo/ldo dataset
// for typed ShEx-shape access — the @ldo/ldo replacement for fromRdf.ts's
// hand-rolled nodeToFacts()/jsonLdToFacts() flattener, which doesn't flatten
// nested blank nodes (see fromRdf.ts's extractGoal comment).
//
// @ldo/ldo's own parseRdf() rejects JSON-LD outright — its serializedToQuads
// hardcodes `if (format === "application/ld+json") throw new Error("Not
// Implemented")` and hands everything else straight to n3.Parser, which
// doesn't speak JSON-LD either. Verified there's no way around this by
// passing a parsed object instead of a string: parseRdf's object branch just
// re-stringifies and re-enters the same broken path (see @ldo/ldo/dist/
// parseRdf.cjs). So JSON-LD goes through the `jsonld` package (the real spec
// implementation — not hand-rolled) to N-Quads first, then into parseRdf(),
// which n3 does parse natively.
import jsonld from 'jsonld';
import type { RemoteDocument } from 'jsonld/jsonld-spec';
import { parseRdf, type LdoDataset } from '@ldo/ldo';
import { normalizeExplicitLangStringDatatypes } from './turtle';

// Third-party pod resources (e.g. Web Annotation JSON-LD written by other
// tools) reference this context by its canonical http:// IRI. jsonld's
// default XHR document loader dereferences @context URLs verbatim, so on an
// https:// page that fetch gets blocked as mixed content — jsonld.toRDF then
// throws and fetchLdoDataset silently returns null for the resource. Serve
// the context locally (mirrored from https://www.w3.org/ns/anno.jsonld) so
// resolution never needs the network.
const ANNO_JSONLD_CONTEXT = {
  '@context': {
    oa: 'http://www.w3.org/ns/oa#',
    dc: 'http://purl.org/dc/elements/1.1/',
    dcterms: 'http://purl.org/dc/terms/',
    dctypes: 'http://purl.org/dc/dcmitype/',
    foaf: 'http://xmlns.com/foaf/0.1/',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    skos: 'http://www.w3.org/2004/02/skos/core#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    iana: 'http://www.iana.org/assignments/relation/',
    owl: 'http://www.w3.org/2002/07/owl#',
    as: 'http://www.w3.org/ns/activitystreams#',
    schema: 'http://schema.org/',
    id: { '@type': '@id', '@id': '@id' },
    type: { '@type': '@id', '@id': '@type' },
    Annotation: 'oa:Annotation',
    Dataset: 'dctypes:Dataset',
    Image: 'dctypes:StillImage',
    Video: 'dctypes:MovingImage',
    Audio: 'dctypes:Sound',
    Text: 'dctypes:Text',
    TextualBody: 'oa:TextualBody',
    ResourceSelection: 'oa:ResourceSelection',
    SpecificResource: 'oa:SpecificResource',
    FragmentSelector: 'oa:FragmentSelector',
    CssSelector: 'oa:CssSelector',
    XPathSelector: 'oa:XPathSelector',
    TextQuoteSelector: 'oa:TextQuoteSelector',
    TextPositionSelector: 'oa:TextPositionSelector',
    DataPositionSelector: 'oa:DataPositionSelector',
    SvgSelector: 'oa:SvgSelector',
    RangeSelector: 'oa:RangeSelector',
    TimeState: 'oa:TimeState',
    HttpRequestState: 'oa:HttpRequestState',
    CssStylesheet: 'oa:CssStyle',
    Choice: 'oa:Choice',
    Person: 'foaf:Person',
    Software: 'as:Application',
    Organization: 'foaf:Organization',
    AnnotationCollection: 'as:OrderedCollection',
    AnnotationPage: 'as:OrderedCollectionPage',
    Audience: 'schema:Audience',
    Motivation: 'oa:Motivation',
    bookmarking: 'oa:bookmarking',
    classifying: 'oa:classifying',
    commenting: 'oa:commenting',
    describing: 'oa:describing',
    editing: 'oa:editing',
    highlighting: 'oa:highlighting',
    identifying: 'oa:identifying',
    linking: 'oa:linking',
    moderating: 'oa:moderating',
    questioning: 'oa:questioning',
    replying: 'oa:replying',
    reviewing: 'oa:reviewing',
    assessing: 'oa:assessing',
    tagging: 'oa:tagging',
    auto: 'oa:autoDirection',
    ltr: 'oa:ltrDirection',
    rtl: 'oa:rtlDirection',
    body: { '@type': '@id', '@id': 'oa:hasBody' },
    target: { '@type': '@id', '@id': 'oa:hasTarget' },
    source: { '@type': '@id', '@id': 'oa:hasSource' },
    selector: { '@type': '@id', '@id': 'oa:hasSelector' },
    state: { '@type': '@id', '@id': 'oa:hasState' },
    scope: { '@type': '@id', '@id': 'oa:hasScope' },
    refinedBy: { '@type': '@id', '@id': 'oa:refinedBy' },
    startSelector: { '@type': '@id', '@id': 'oa:hasStartSelector' },
    endSelector: { '@type': '@id', '@id': 'oa:hasEndSelector' },
    renderedVia: { '@type': '@id', '@id': 'oa:renderedVia' },
    creator: { '@type': '@id', '@id': 'dcterms:creator' },
    generator: { '@type': '@id', '@id': 'as:generator' },
    rights: { '@type': '@id', '@id': 'dcterms:rights' },
    homepage: { '@type': '@id', '@id': 'foaf:homepage' },
    via: { '@type': '@id', '@id': 'oa:via' },
    canonical: { '@type': '@id', '@id': 'oa:canonical' },
    stylesheet: { '@type': '@id', '@id': 'oa:styledBy' },
    cached: { '@type': '@id', '@id': 'oa:cachedSource' },
    conformsTo: { '@type': '@id', '@id': 'dcterms:conformsTo' },
    items: { '@type': '@id', '@id': 'as:items', '@container': '@list' },
    partOf: { '@type': '@id', '@id': 'as:partOf' },
    first: { '@type': '@id', '@id': 'as:first' },
    last: { '@type': '@id', '@id': 'as:last' },
    next: { '@type': '@id', '@id': 'as:next' },
    prev: { '@type': '@id', '@id': 'as:prev' },
    audience: { '@type': '@id', '@id': 'schema:audience' },
    motivation: { '@type': '@vocab', '@id': 'oa:motivatedBy' },
    purpose: { '@type': '@vocab', '@id': 'oa:hasPurpose' },
    textDirection: { '@type': '@vocab', '@id': 'oa:textDirection' },
    accessibility: 'schema:accessibilityFeature',
    bodyValue: 'oa:bodyValue',
    format: 'dc:format',
    language: 'dc:language',
    processingLanguage: 'oa:processingLanguage',
    value: 'rdf:value',
    exact: 'oa:exact',
    prefix: 'oa:prefix',
    suffix: 'oa:suffix',
    styleClass: 'oa:styleClass',
    name: 'foaf:name',
    email: 'foaf:mbox',
    email_sha1: 'foaf:mbox_sha1sum',
    nickname: 'foaf:nick',
    label: 'rdfs:label',
    created: { '@id': 'dcterms:created', '@type': 'xsd:dateTime' },
    modified: { '@id': 'dcterms:modified', '@type': 'xsd:dateTime' },
    generated: { '@id': 'dcterms:issued', '@type': 'xsd:dateTime' },
    sourceDate: { '@id': 'oa:sourceDate', '@type': 'xsd:dateTime' },
    sourceDateStart: { '@id': 'oa:sourceDateStart', '@type': 'xsd:dateTime' },
    sourceDateEnd: { '@id': 'oa:sourceDateEnd', '@type': 'xsd:dateTime' },
    start: { '@id': 'oa:start', '@type': 'xsd:nonNegativeInteger' },
    end: { '@id': 'oa:end', '@type': 'xsd:nonNegativeInteger' },
    total: { '@id': 'as:totalItems', '@type': 'xsd:nonNegativeInteger' },
    startIndex: { '@id': 'as:startIndex', '@type': 'xsd:nonNegativeInteger' },
  },
};

const LOCAL_JSONLD_CONTEXTS: Record<string, object> = {
  'http://www.w3.org/ns/anno.jsonld': ANNO_JSONLD_CONTEXT,
  'https://www.w3.org/ns/anno.jsonld': ANNO_JSONLD_CONTEXT,
};

async function loadJsonLdDocument(url: string): Promise<RemoteDocument> {
  const local = LOCAL_JSONLD_CONTEXTS[url];
  if (local) return { contextUrl: undefined, documentUrl: url, document: local as RemoteDocument['document'] };
  // @types/jsonld doesn't declare the default loader's call signature.
  return (jsonld as unknown as { documentLoader: (url: string) => Promise<RemoteDocument> }).documentLoader(url);
}

const EXPLICIT_LANG_STRING_ERROR = 'Detected illegal (directional) languaged-tagged string with explicit datatype';

function isExplicitLangStringDatatypeError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(EXPLICIT_LANG_STRING_ERROR);
}

async function parseTurtleResource(text: string, url: string): Promise<LdoDataset> {
  try {
    return await parseRdf(text, { format: 'text/turtle', baseIRI: url });
  } catch (error) {
    if (!isExplicitLangStringDatatypeError(error)) throw error;
    const normalized = normalizeExplicitLangStringDatatypes(text);
    if (normalized === text) throw error;
    return await parseRdf(normalized, { format: 'text/turtle', baseIRI: url });
  }
}

/** Parses a fetched resource body into an LdoDataset, regardless of whether it's Turtle or JSON-LD. */
export async function parseLdoDatasetText(text: string, contentType: string, url: string): Promise<LdoDataset | null> {
  try {
    if (contentType.includes('json')) {
      const nquads = await jsonld.toRDF(JSON.parse(text), { format: 'application/n-quads', base: url, documentLoader: loadJsonLdDocument });
      return await parseRdf(nquads as unknown as string, { format: 'application/n-quads', baseIRI: url });
    }
    return await parseTurtleResource(text, url);
  } catch {
    return null; // Unparseable resource (or a shape we don't recognize) — skip, don't crash the list.
  }
}

/** Fetches one resource and returns its LdoDataset, regardless of whether it's stored as Turtle or JSON-LD. */
export async function fetchLdoDataset(
  authFetch: (url: string, init?: RequestInit) => Promise<Response>,
  url: string
): Promise<LdoDataset | null> {
  // no-store: matches fromRdf.ts's fetchFacts — callers depend on this being
  // the pod's true current state, not a browser-cached response.
  const res = await authFetch(url, { headers: { Accept: 'text/turtle, application/ld+json;q=0.9' }, cache: 'no-store' });
  if (!res.ok) return null;
  return parseLdoDatasetText(await res.text(), res.headers.get('content-type') ?? '', url);
}
