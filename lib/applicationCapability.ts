import { LEPTUM_SHAPES, SHAPE_FORMATS, ShapeFormat, shapeUrl } from "./shapeCatalog";

const SHAPE_FORMAT_KEYS: ShapeFormat[] = ["shex", "shacl", "linkml"];
const SHAPE_FORMAT_LABELS: Record<ShapeFormat, string> = {
  shex: "ShEx",
  shacl: "SHACL",
  linkml: "LinkML",
};

export const APPLICATION_CAPABILITY_PROFILE = "https://www.w3.org/ns/ac.jsonld";

type CapabilityDescriptionOptions = {
  origin: string;
  subject?: string;
};

function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

export function createApplicationCapabilityDescription({
  origin,
  subject,
}: CapabilityDescriptionOptions) {
  const app = subject || absoluteUrl(origin, "/");
  const capability = absoluteUrl(origin, "/application-capability#application");
  const invokeQuickNote = absoluteUrl(origin, "/application-capability#invoke-quick-note");
  const invokeShare = absoluteUrl(origin, "/application-capability#invoke-share");
  // ac:shape points at RDF shape languages only (ShEx + SHACL); the LinkML
  // schemas are listed as alternate representations under hasPart.
  const shapeIris = LEPTUM_SHAPES.flatMap((shape) => [
    shapeUrl(origin, shape.slug, "shex"),
    shapeUrl(origin, shape.slug, "shacl"),
  ]);

  return {
    "@context": [
      APPLICATION_CAPABILITY_PROFILE,
      {
        schema: "https://schema.org/",
        name: "schema:name",
        description: "schema:description",
        url: { "@id": "schema:url", "@type": "@id" },
        homepage: { "@id": "schema:url", "@type": "@id" },
        repository: { "@id": "schema:codeRepository", "@type": "@id" },
        hasPart: { "@id": "schema:hasPart", "@type": "@id" },
        encodingFormat: "schema:encodingFormat",
      },
    ],
    id: app,
    type: ["ac:Application", "schema:WebApplication"],
    name: "Leptum",
    description:
      "Local-first personal productivity tracker for tasks, routines, goals, timeline activity logs, quick notes, and wellbeing data stored in the user's Solid pod.",
    homepage: absoluteUrl(origin, "/"),
    url: absoluteUrl(origin, "/"),
    capability: [
      {
        id: capability + "-quick-note",
        type: "Capability",
        accept: ["text/plain", "text/markdown", "text/html", "text/uri-list"],
        action: "odrl:create",
        invocation: invokeQuickNote,
      },
      {
        id: capability + "-share-target",
        type: "Capability",
        accept: ["text/plain", "text/uri-list", "text/html", "image/*", "audio/*"],
        action: "odrl:use",
        invocation: invokeShare,
      },
      {
        id: capability + "-solid-profile-read",
        type: "Capability",
        name: "Read Solid WebID profile data",
        description:
          "Leptum reads the active user's Solid WebID/profile document for display name, profile photo, and birth date when present.",
        accept: ["text/turtle", "application/ld+json"],
        action: "odrl:read",
        resourceType: [
          "https://schema.org/Person",
          "http://xmlns.com/foaf/0.1/Person",
          "http://www.w3.org/2006/vcard/ns#Individual",
        ],
      },
      {
        id: capability + "-solid-address-book-read",
        type: "Capability",
        name: "Read Solid address book contacts",
        description:
          "Leptum reads the active user's Solid address book contacts and uses those contacts as the only mention suggestions.",
        accept: ["text/turtle", "application/ld+json"],
        action: "odrl:read",
        resourceType: [
          "http://www.w3.org/2006/vcard/ns#AddressBook",
          "http://www.w3.org/2006/vcard/ns#Group",
          "http://www.w3.org/2006/vcard/ns#Individual",
          "http://xmlns.com/foaf/0.1/Person",
          "https://schema.org/Person",
        ],
      },
      {
        id: capability + "-solid-rdf-read",
        type: "Capability",
        name: "Read Leptum Solid RDF resources",
        description: "Leptum can read its Solid pod data using these shapes (each available as ShEx, SHACL, and LinkML).",
        accept: ["text/turtle", "application/ld+json"],
        action: "odrl:read",
        shape: shapeIris,
      },
      {
        id: capability + "-solid-rdf-write",
        type: "Capability",
        name: "Write Leptum Solid RDF resources",
        description: "Leptum writes user-owned productivity data to Solid pods matching these shapes (each available as ShEx, SHACL, and LinkML).",
        accept: ["text/turtle", "application/ld+json"],
        action: "odrl:write",
        shape: shapeIris,
      },
      ...LEPTUM_SHAPES.map((shape) => ({
        id: `${capability}-shape-${shape.slug}`,
        type: "Capability",
        name: shape.label,
        accept: ["text/turtle", "application/ld+json"],
        action: "odrl:read",
        resourceType: shape.resourceType,
        shape: [shapeUrl(origin, shape.slug, "shex"), shapeUrl(origin, shape.slug, "shacl")],
      })),
    ],
    invocation: [
      {
        id: invokeQuickNote,
        type: "UriTemplateInvocation",
        template: absoluteUrl(origin, "/?capture=note"),
      },
      {
        id: invokeShare,
        type: "UriTemplateInvocation",
        template: absoluteUrl(origin, "/share"),
      },
    ],
    hasPart: LEPTUM_SHAPES.flatMap((shape) =>
      SHAPE_FORMAT_KEYS.map((format) => ({
        id: shapeUrl(origin, shape.slug, format),
        type: "schema:CreativeWork",
        name: `${shape.label} (${SHAPE_FORMAT_LABELS[format]})`,
        encodingFormat: SHAPE_FORMATS[format].encodingFormat,
        url: shapeUrl(origin, shape.slug, format),
      })),
    ),
    requirement: [
      {
        id: absoluteUrl(origin, "/application-capability#solid-oidc"),
        type: "Requirement",
        browserPermission: "Solid-OIDC session and storage access to the user's selected Solid pod",
      },
      {
        id: absoluteUrl(origin, "/application-capability#client-storage"),
        type: "Requirement",
        browserPermission:
          "localStorage/sessionStorage for UI state, pending share handoff, and non-authoritative local preferences",
      },
    ],
  };
}
