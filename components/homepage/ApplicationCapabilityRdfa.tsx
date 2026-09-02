// Embeds the same Application Capability description that used to live at
// the content-negotiated /application-capability endpoint directly in the
// homepage as RDFa, per https://dokieli.github.io/application-capability/.
// One representation now serves both humans (the visible landing page) and
// machines (this RDFa subtree) — no Accept-header negotiation needed.
//
// Rendered visibly (inside a <details> disclosure in the footer) rather than
// hidden — genuinely part of the page instead of markup nobody sees.
import { createApplicationCapabilityDescription } from "../../lib/applicationCapability";

type RdfaValue = string | number | boolean | RdfaNodeShape | RdfaValue[];
type RdfaNodeShape = { id?: string; type?: string | string[]; [key: string]: RdfaValue | undefined };

// Predicate CURIEs for every term createApplicationCapabilityDescription()
// emits. `literal: true` means string values render as text content;
// otherwise a string value is treated as a resource reference (some terms —
// e.g. a Capability's `invocation` — hold a plain IRI reference in one place
// and an embedded object in another, so kind is decided per-value below).
const PREDICATES: Record<string, { curie: string; literal?: boolean }> = {
  name: { curie: "schema:name", literal: true },
  description: { curie: "schema:description", literal: true },
  url: { curie: "schema:url" },
  homepage: { curie: "schema:url" },
  repository: { curie: "schema:codeRepository" },
  encodingFormat: { curie: "schema:encodingFormat", literal: true },
  hasPart: { curie: "schema:hasPart" },
  capability: { curie: "ac:capability" },
  invocation: { curie: "ac:invocation" },
  requirement: { curie: "ac:requirement" },
  action: { curie: "ac:action" },
  accept: { curie: "ac:accept", literal: true },
  resourceType: { curie: "ac:resourceType" },
  shape: { curie: "ac:shape" },
  template: { curie: "ac:template", literal: true },
  browserPermission: { curie: "ac:browserPermission", literal: true },
};

function qualifyType(t: string): string {
  return t.includes(":") ? t : `ac:${t}`;
}

function isNodeShape(v: unknown): v is RdfaNodeShape {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function RdfaProperty({ curie, value }: { curie: string; value: RdfaNodeShape }) {
  const typeofAttr = value.type
    ? (Array.isArray(value.type) ? value.type.map(qualifyType).join(" ") : qualifyType(value.type))
    : undefined;
  return (
    <div className="mt-1 ml-4 border-l border-border pl-4" {...{ property: curie, resource: value.id, typeof: typeofAttr }}>
      {typeofAttr && <div className="text-sm tracking-wide text-muted-foreground">{typeofAttr}</div>}
      <RdfaProperties node={value} />
    </div>
  );
}

function RdfaProperties({ node }: { node: RdfaNodeShape }) {
  return (
    <>
      {Object.entries(node).map(([key, value]) => {
        if (key === "id" || key === "type" || value === undefined || value === null) return null;
        const spec = PREDICATES[key];
        if (!spec) return null;
        const values = Array.isArray(value) ? value : [value];
        return values.map((v, i) => {
          const itemKey = `${key}-${i}`;
          if (isNodeShape(v)) return <RdfaProperty key={itemKey} curie={spec.curie} value={v} />;
          if (spec.literal) {
            return (
              <div key={itemKey}>
                <span className="text-muted-foreground">{spec.curie}:</span>{" "}
                <span {...{ property: spec.curie }}>{String(v)}</span>
              </div>
            );
          }
          return (
            <div key={itemKey}>
              <span className="text-muted-foreground">{spec.curie}:</span>{" "}
              <a
                href={String(v)}
                className="break-all underline decoration-dotted hover:text-foreground"
                {...{ property: spec.curie }}
              >
                {String(v)}
              </a>
            </div>
          );
        });
      })}
    </>
  );
}

export function ApplicationCapabilityRdfa({ origin }: { origin: string }) {
  const app = createApplicationCapabilityDescription({ origin }) as RdfaNodeShape;
  const typeofAttr = Array.isArray(app.type) ? app.type.map(qualifyType).join(" ") : undefined;

  return (
    <details className="mt-4 text-sm text-foreground">
      <summary className="cursor-pointer select-none font-medium text-foreground hover:underline">
        Application capability (RDFa)
      </summary>
      <div
        className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 font-mono leading-relaxed"
        {...{
          prefix: "ac: https://www.w3.org/ns/ac# schema: https://schema.org/ odrl: http://www.w3.org/ns/odrl/2/",
          resource: app.id,
          typeof: typeofAttr,
        }}
      >
        <div className="text-sm tracking-wide text-muted-foreground">{typeofAttr}</div>
        <RdfaProperties node={app} />
      </div>
    </details>
  );
}
