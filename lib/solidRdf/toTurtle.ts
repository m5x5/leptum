// Serializes a transform.ts JSON-LD document into Turtle for writing to a
// Solid pod. Read side (fromRdf.ts, ldoParse.ts) already tolerates either
// format — Focus writes Turtle, Leptum used to write JSON-LD — so switching
// only the write side needs no reader changes.
//
// jsonld.toRDF() only emits N-Quads (no Turtle option), so the pipeline goes
// doc -> N-Quads (jsonld, the real spec implementation) -> quads (n3.Parser)
// -> Turtle text (n3.Writer), the same jsonld/n3 split ldoParse.ts already
// uses in reverse for the JSON-LD read path.
import jsonld from 'jsonld';
import { Parser, Writer } from 'n3';
import { NS } from './namespaces';

/** Converts a transform.ts JSON-LD document into a Turtle string for the given resource URL. */
export async function docToTurtle(doc: Record<string, unknown>, url: string): Promise<string> {
  const nquads = (await jsonld.toRDF(doc, { format: 'application/n-quads', base: url })) as unknown as string;
  const quads = new Parser({ format: 'N-Quads' }).parse(nquads);
  return new Promise((resolve, reject) => {
    const writer = new Writer({ format: 'text/turtle', prefixes: NS });
    writer.addQuads(quads);
    writer.end((err, result) => (err ? reject(err) : resolve(result)));
  });
}
