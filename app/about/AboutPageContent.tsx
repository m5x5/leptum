"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CloudIcon,
  CodeIcon,
  DatabaseIcon,
  DeviceMobileIcon,
  ExternalLinkIcon,
  GlobeAltIcon,
  LockClosedIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/outline";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { getSolidSessionIfActive } from "../../lib/solidAuth";
import { getResolvedContainers } from "../../lib/solidRdf/activeContainers";
import { discoverPodContext } from "../../lib/solidRdf/typeIndex";
import type { ContainerKey } from "../../lib/solidRdf/containers";
import { LEPTUM_SHAPES } from "../../lib/shapeCatalog";
import { LOCAL_DATA, STORAGE_MAP, VOCABULARIES } from "../../lib/storageMap";
import { tasksCollection, routinesCollection, completionsCollection } from "../../lib/query/collections";
import { goalsCollection } from "../../utils/useGoals";
import { impactsCollection } from "../../utils/useImpacts";
import { quickNotesCollection } from "../../utils/useQuickNotes";
import { entitiesCollection } from "../../utils/useEntities";

interface PodInfo {
  webId: string;
  podRoot: string | null;
  privateTypeIndexUrl: string | null;
  containers: Partial<Record<ContainerKey, string>>;
}

interface Counts {
  tasks: number;
  routines: number;
  goals: number;
  impacts: number;
  notes: number;
  entities: number;
  completions: number;
}

const shapeLabel = (slug: string) => LEPTUM_SHAPES.find((s) => s.slug === slug)?.label ?? slug;

function Section({ icon: Icon, title, intro, children }: { icon: typeof DatabaseIcon; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        {title}
      </h2>
      {intro && <p className="mt-2 text-sm text-muted-foreground max-w-prose">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold text-foreground tabular-nums">{value === null ? "—" : value}</div>
    </div>
  );
}

function ResourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 break-all text-sm text-foreground underline decoration-muted-foreground/60 underline-offset-2 hover:decoration-foreground"
    >
      {children}
      <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}

function ResourceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border py-2.5 first:border-t-0">
      <span className="w-40 shrink-0 text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}

export default function AboutPageContent() {
  const [pod, setPod] = useState<PodInfo | null | undefined>(undefined); // undefined = checking
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSolidSessionIfActive();
      if (!session?.webId) {
        if (!cancelled) setPod(null);
        return;
      }
      const webId = session.webId;
      try {
        const [ctx, containers] = await Promise.all([
          discoverPodContext(session, webId),
          getResolvedContainers(session, webId),
        ]);
        if (cancelled) return;
        setPod({ webId, podRoot: ctx.podRoot, privateTypeIndexUrl: ctx.privateTypeIndexUrl, containers });
      } catch (error) {
        console.error("Failed to read pod layout:", error);
        if (!cancelled) setPod({ webId, podRoot: null, privateTypeIndexUrl: null, containers: {} });
      }
      try {
        const [tasks, routines, goals, impacts, notes, entities, completions] = await Promise.all([
          tasksCollection.fetch(),
          routinesCollection.fetch(),
          goalsCollection.fetch(),
          impactsCollection.fetch(),
          quickNotesCollection.fetch(),
          entitiesCollection.fetch(),
          completionsCollection.fetch(),
        ]);
        if (cancelled) return;
        setCounts({
          tasks: tasks.length,
          routines: routines.length,
          goals: goals.length,
          impacts: impacts.length,
          notes: notes.length,
          entities: entities.length,
          completions: completions.length,
        });
      } catch (error) {
        console.error("Failed to count records:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = !!pod;
  const podRoot = pod?.podRoot ?? null;
  const containerUrl = (key: ContainerKey, defaultName: string) =>
    pod?.containers[key] ?? (podRoot ? `${podRoot}${defaultName}/` : null);

  return (
    <article className="px-1">
      <header>
        <h1 className="text-3xl font-bold text-foreground">About Leptum</h1>
        <p className="mt-3 text-base text-muted-foreground max-w-prose">
          Leptum is a personal productivity tracker — timeline, goals, routines, notes — that keeps everything in a{" "}
          <a href="https://solidproject.org" target="_blank" rel="noopener noreferrer" className="underline">Solid</a> pod
          you control.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
        <Stat label="Tasks" value={counts?.tasks ?? null} />
        <Stat label="Routines" value={counts?.routines ?? null} />
        <Stat label="Goals" value={counts?.goals ?? null} />
        <Stat label="Timeline entries" value={counts?.impacts ?? null} />
        <Stat label="Notes" value={counts?.notes ?? null} />
        <Stat label="People & projects" value={counts?.entities ?? null} />
        <Stat label="Routine completions" value={counts?.completions ?? null} />
        <Stat label="Record types" value={STORAGE_MAP.length} />
      </div>
      {pod === null && (
        <p className="mt-3 text-xs text-muted-foreground">
          Counts and live links appear once you{" "}
          <Link href="/settings" className="underline">connect your pod</Link>.
        </p>
      )}

      <Section
        icon={DatabaseIcon}
        title="Where the data lives"
        intro={
          <>
            The pod is the database. On first use Leptum looks up your WebID profile, reads your private{" "}
            <em>type index</em> and reuses any container another Solid app has already registered for the same kind
            of record; only otherwise does it create a plain container under your pod root and register it. Every
            record is its own resource, written as Turtle, readable by any Solid client.
          </>
        }
      >
        {connected ? (
          <div className="rounded-2xl bg-muted/50 dark:bg-muted/30 p-4">
            <ResourceRow label="WebID"><ResourceLink href={pod!.webId}>{pod!.webId}</ResourceLink></ResourceRow>
            <ResourceRow label="Pod root">
              {podRoot ? <ResourceLink href={podRoot}>{podRoot}</ResourceLink> : <span className="text-sm text-muted-foreground">not advertised in profile</span>}
            </ResourceRow>
            <ResourceRow label="Private type index">
              {pod!.privateTypeIndexUrl ? <ResourceLink href={pod!.privateTypeIndexUrl}>{pod!.privateTypeIndexUrl}</ResourceLink> : <span className="text-sm text-muted-foreground">none yet</span>}
            </ResourceRow>
            {(["tasks", "events", "notes", "images"] as const).map((key) => {
              const row = STORAGE_MAP.find((r) => r.key === key)!;
              const url = containerUrl(key, row.spec.defaultName);
              return url ? (
                <ResourceRow key={key} label={row.label}><ResourceLink href={url}>{url}</ResourceLink></ResourceRow>
              ) : null;
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not connected — the table shows the default container names Leptum registers when none exist yet.
          </p>
        )}

        <div className="mt-6 overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">What</th>
                <th className="py-2 pr-4 font-medium">Container · resource</th>
                <th className="py-2 pr-4 font-medium">RDF type</th>
                <th className="py-2 font-medium">Shape</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_MAP.map((row) => {
                const url = containerUrl(row.key, row.spec.defaultName);
                return (
                  <tr key={row.key} className="border-b border-border align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">{row.label}</div>
                      <div className="text-xs text-muted-foreground max-w-[28ch]">{row.description}</div>
                      {row.binaries && <div className="mt-1 text-xs text-muted-foreground max-w-[28ch]">{row.binaries}</div>}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {url ? (
                        <ResourceLink href={url}>{url.replace(podRoot ?? "", "")}</ResourceLink>
                      ) : (
                        <span>{row.spec.defaultName}/</span>
                      )}
                      <div className="text-muted-foreground">{row.singleton ? row.resource : `↳ ${row.resource}`}</div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {row.classes.map((c) => <div key={c}>{c}</div>)}
                    </td>
                    <td className="py-3 text-xs">
                      {row.shapes.map((slug) => (
                        <div key={slug}>
                          <a href={`/shapes/${slug}.shex`} className="text-primary hover:underline" title={shapeLabel(slug)}>
                            {slug}
                          </a>
                        </div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        icon={GlobeAltIcon}
        title="Vocabularies"
        intro="Records use established vocabularies wherever one fits, so other tools understand them without knowing Leptum. The leptum: vocabulary covers only what nothing public describes."
      >
        <ul className="divide-y divide-border text-sm">
          {VOCABULARIES.map((v) => (
            <li key={v.prefix} className="py-2 grid grid-cols-1 sm:grid-cols-[6rem_1fr] gap-x-4">
              <span className="font-mono text-xs text-foreground">
                <a href={v.iri} target="_blank" rel="noopener noreferrer" className="hover:underline">{v.prefix}:</a>
              </span>
              <span className="text-muted-foreground">{v.usedFor}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground max-w-prose">
          Every shape is published by this app at <code className="font-mono text-xs">/shapes/&lt;name&gt;</code> as ShEx, SHACL
          (Turtle) or LinkML YAML by content negotiation — the same documents the app validates against.
        </p>
      </Section>

      <Section
        icon={DeviceMobileIcon}
        title="What stays on this device"
        intro="A few things never go to the pod: your session, per-device UI state, and a short-lived cache of what was last read."
      >
        <ul className="divide-y divide-border text-sm">
          {LOCAL_DATA.map((d) => (
            <li key={d.key} className="py-2 grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-x-4 gap-y-1">
              <div>
                <code className="font-mono text-xs text-foreground break-all">{d.key}</code>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {d.where}{d.mirrored ? " · mirrored to pod" : ""}
                </div>
              </div>
              <span className="text-muted-foreground">{d.what}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        icon={LockClosedIcon}
        title="Who can see it"
        intro="Leptum registers its containers in your private type index and never changes access control. Unless you share a container yourself, only your WebID can read it."
      >
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 max-w-prose">
          <li>No analytics, no cookies, no third-party requests except the pod (and Google Calendar if you connect it, with your own client id).</li>
          <li>Voice memos and full-size photos are uploaded as binary resources into the same containers, so they inherit the same access rules.</li>
          <li>Signing out clears the session, the in-memory cache and the per-resource read cache on this device; per-device UI state in localStorage stays until you clear site data.</li>
        </ul>
      </Section>

      <Section
        icon={CloudIcon}
        title="Taking your data with you"
      >
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 max-w-prose">
          <li><Link href="/settings" className="underline">Settings › Export Data</Link> downloads everything as one JSON file; <em>Save backup to Pod</em> writes the same file into your pod.</li>
          <li>Because each record is a plain Turtle resource, you can also copy the containers with any Solid client, or point another pod at the same shapes.</li>
          <li>Deleting a container in your pod removes the data for good — Leptum keeps no copy.</li>
        </ul>
      </Section>

      <Section
        icon={CodeIcon}
        title="For developers and AI agents"
      >
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 max-w-prose">
          <li>Reads and writes go through <code className="font-mono text-xs">lib/solidRdf/</code>: one resource per record, LDO/ShEx for parsing, conditional GETs so an unchanged container costs one 304 per member.</li>
          <li>In the browser, Leptum exposes its data as WebMCP tools (Chrome 149+ with WebMCP flags) so an agent can read the timeline, log activities and propose time blocks that you confirm.</li>
          <li>The <Link href="/" className="underline">landing page</Link> embeds an application capability description (RDFa) linking to these shapes, so other apps can find and validate Leptum data.</li>
        </ul>
      </Section>

      <Section icon={QuestionMarkCircleIcon} title="Frequently asked questions">
        <Accordion type="single" collapsible className="border-t border-border">
          <AccordionItem value="faq-0">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">Can I move to a different pod?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground max-w-prose">Yes. Export from Settings, connect the new pod, and either import the backup or copy the containers with a Solid client. Leptum finds them again through the type index of whichever WebID you connect.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-1">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">What happens if I disconnect?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground max-w-prose">Nothing is deleted. The app forgets your session and caches on this device; your pod keeps every record. Connect again and everything is back.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">Does anything get sent to Leptum’s servers?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground max-w-prose">There are none. The site is static HTML and JavaScript; every data request goes from your browser to your pod. Server-side code exists only to serve the shapes and to receive a Web Share Target, which is stored on your device until you turn it into a note.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-3">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">Why are some things in localStorage instead of the pod?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground max-w-prose">Session tokens can’t live in the pod by definition; UI conveniences like timers, collapsed panels and dismissed hints are deliberately per device; and a few preferences are mirrored locally so the interface renders correctly before the pod has answered.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-4">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">Can another Solid app use this data?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground max-w-prose">That is the point. Tasks are schema:Action + ical:Vtodo (the shape Solid Focus and others use), notes are ActivityStreams Notes, mentions are Web Annotations. The shapes above document the rest.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-5">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">How much traffic does this generate?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground max-w-prose">A page load reads each container once (one listing plus one conditional GET per record), then refreshes in the background every five minutes or when the pod notifies the app of a change. Writes touch only the record that changed.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>
    </article>
  );
}
