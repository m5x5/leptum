// Shared Turtle parsing — used by typeIndex.ts (profile/type-index documents,
// always Turtle on every Solid server) and fromRdf.ts (resource bodies, which
// may be Turtle or JSON-LD depending on what wrote them).
import { Parser } from 'n3';
import type { Quad } from 'n3';

const RDF_LANG_STRING_DATATYPE =
  /\s*\^\^\s*(?:rdf:(?:dirLangString|langString)|<http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#(?:dirLangString|langString)>)/g;
const EXPLICIT_LANG_STRING_ERROR = 'Detected illegal (directional) languaged-tagged string with explicit datatype';

function parseTurtleStrict(text: string, baseIRI: string): Promise<Quad[]> {
  return new Promise((resolve, reject) => {
    const parser = new Parser({ baseIRI });
    const quads: Quad[] = [];
    parser.parse(text, (error, quad) => {
      if (error) return reject(error);
      if (quad) quads.push(quad);
      else resolve(quads);
    });
  });
}

export function normalizeExplicitLangStringDatatypes(text: string): string {
  return text.replace(RDF_LANG_STRING_DATATYPE, '');
}

function isExplicitLangStringDatatypeError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(EXPLICIT_LANG_STRING_ERROR);
}

export function parseTurtle(text: string, baseIRI: string): Promise<Quad[]> {
  return parseTurtleStrict(text, baseIRI).catch((error: unknown) => {
    if (!isExplicitLangStringDatatypeError(error)) throw error;
    const normalized = normalizeExplicitLangStringDatatypes(text);
    if (normalized === text) throw error;
    return parseTurtleStrict(normalized, baseIRI);
  });
}
