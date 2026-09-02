import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin } from "../../../lib/publicOrigin";
import { LEPTUM_SHAPES, SHAPE_FORMATS, ShapeFormat } from "../../../lib/shapeCatalog";

const SHAPES_DIR = path.join(process.cwd(), "shapes");

const FORMAT_ORDER: ShapeFormat[] = ["shex", "shacl", "linkml"];

type RouteContext = {
  params: Promise<{ shape: string }>;
};

// Splits the route param into shape slug + requested format. An explicit
// extension (.shex / .shacl.ttl / .linkml.yaml) pins the format; a bare slug
// leaves it to Accept negotiation.
function parseShapeParam(shape: string): { slug: string; format: ShapeFormat | null } {
  for (const format of FORMAT_ORDER) {
    const suffix = `.${SHAPE_FORMATS[format].extension}`;
    if (shape.toLowerCase().endsWith(suffix)) {
      return { slug: shape.slice(0, -suffix.length), format };
    }
  }
  return { slug: shape, format: null };
}

function acceptedMedia(accept: string | null): Array<{ media: string; q: number }> {
  if (!accept) return [{ media: "*/*", q: 1 }];

  return accept.split(",").map((part) => {
    const [media = "", ...params] = part.split(";").map((value) => value.trim());
    let q = 1;

    for (const param of params) {
      const [rawKey, ...rawValue] = param.split("=");
      if (rawKey?.trim().toLowerCase() === "q") {
        const parsed = Number(rawValue.join("=").trim());
        q = Number.isFinite(parsed) ? parsed : 0;
      }
    }

    return { media: media.toLowerCase(), q };
  });
}

function mediaMatches(media: string, format: ShapeFormat): boolean {
  if (media === "*/*") return true;
  const accepts = SHAPE_FORMATS[format].accepts;
  if (media.endsWith("/*")) {
    const prefix = media.slice(0, -1);
    return accepts.some((candidate) => candidate.startsWith(prefix));
  }
  return accepts.includes(media);
}

function acceptsFormat(accept: string | null, format: ShapeFormat): boolean {
  return acceptedMedia(accept).some(({ media, q }) => q > 0 && mediaMatches(media, format));
}

// For an extensionless request, pick the best format for the Accept header:
// highest q wins, FORMAT_ORDER (ShEx first) breaks ties and handles wildcards.
function negotiateFormat(accept: string | null): ShapeFormat | null {
  const media = acceptedMedia(accept);
  let best: { format: ShapeFormat; q: number } | null = null;

  for (const format of FORMAT_ORDER) {
    const q = Math.max(0, ...media.filter((m) => mediaMatches(m.media, format)).map((m) => m.q));
    if (q > 0 && (!best || q > best.q)) best = { format, q };
  }

  return best?.format ?? null;
}

function alternateLinks(origin: string, slug: string, current: ShapeFormat): string[] {
  return FORMAT_ORDER.filter((format) => format !== current).map(
    (format) =>
      `<${origin}/shapes/${slug}.${SHAPE_FORMATS[format].extension}>; rel="alternate"; type="${SHAPE_FORMATS[format].encodingFormat}"`,
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { shape } = await context.params;
  const { slug, format: explicitFormat } = parseShapeParam(shape);
  const entry = LEPTUM_SHAPES.find((candidate) => candidate.slug === slug);

  if (!entry) return new NextResponse("Shape not found", { status: 404 });

  const accept = request.headers.get("accept");
  const format = explicitFormat ?? negotiateFormat(accept);

  if (!format || (explicitFormat && !acceptsFormat(accept, explicitFormat))) {
    return new NextResponse("Not Acceptable", {
      status: 406,
      headers: { Vary: "Accept" },
    });
  }

  const spec = SHAPE_FORMATS[format];
  const source = await readFile(path.join(SHAPES_DIR, `${entry.slug}.${spec.extension}`), "utf8");
  const origin = getPublicOrigin(request);

  return new NextResponse(source, {
    headers: {
      "Content-Type": spec.contentType,
      Vary: "Accept",
      Link: [
        `<${origin}/shapes/${entry.slug}.${spec.extension}>; rel="self"; type="${spec.encodingFormat}"`,
        ...alternateLinks(origin, entry.slug, format),
      ].join(", "),
    },
  });
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  const response = await GET(request, context);
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
