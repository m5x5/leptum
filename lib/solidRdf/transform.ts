// One function per Solid-backed record type, each producing a JSON-LD-shaped
// document that is serialized to Turtle before PUT. See docs/solid-rdf-mapping.md for the
// reasoning behind each choice, and docs/leptum-vocab.ttl for the `leptum:`
// terms used where no existing vocabulary fits.
//
// Every cross-reference and every resource's own URL is resolved through
// ExportContext.containers — the type-index-discovered-or-registered
// container for that resource's RDF type (see typeIndex.ts) — never a
// hardcoded app-specific path.
import { CONTEXT, schema, ical, foaf, as, oa, dcterms, ui, leptum } from './namespaces';
import { cronToRRule } from './cronToRrule';
import type { ContainerKey } from './containers';
import type {
  Goal, GoalType, StandaloneTask, Routine, RoutineCompletion,
  Insight, PatternNote, QuickNote, WeekReflection, LifeEvent, Entity, Mention, Impact,
  PhotoAttachment, UserSettings,
} from '../remoteStorage';
import type { GroceryStore, GroceryNotification, LocationUpdate } from '../../types/grocery';
import type { DailyHealthData } from '../remoteStorage';
import type { ActivityWatchData } from '../../activity-watch.d';

export interface ExportContext {
  /** Absolute, trailing-slash container URL per resource type, resolved via typeIndex.ts. */
  containers: Record<ContainerKey, string>;
}

export interface RdfResource {
  /** Absolute URL of the resource, inside its type's resolved container. */
  url: string;
  doc: Record<string, unknown>;
}

const iri = (ctx: ExportContext, key: ContainerKey, id: string) => `${ctx.containers[key]}${encodeURIComponent(id)}`;

/** Strips undefined/null/empty-array values so they don't get serialized as JSON-LD noise. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

const dt = (ms: number | undefined | null) => (ms != null ? new Date(ms).toISOString() : undefined);
function hourToTime(hour: number | undefined | null): { '@value': string; '@type': 'xsd:time' } | undefined {
  if (hour == null) return undefined;
  const totalMinutes = Math.max(0, Math.min(1439, Math.round(hour * 60)));
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return { '@value': `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`, '@type': 'xsd:time' };
}

function themeToColorScheme(theme: UserSettings['theme']): { '@id': string } | undefined {
  switch (theme) {
    case 'light':
      return { '@id': ui('LightColorScheme') };
    case 'dark':
      return { '@id': ui('DarkColorScheme') };
    case 'system':
      return { '@id': ui('SystemColorScheme') };
    default:
      return undefined;
  }
}

function statusToActionStatus(status: string | undefined): { '@id': string } | undefined {
  switch (status) {
    case 'completed':
    case 'done':
      return { '@id': schema('CompletedActionStatus') };
    case 'archived':
      return { '@id': schema('FailedActionStatus') }; // closest fit: abandoned, not completed
    case 'active':
    case 'due':
    case 'pending':
      return { '@id': schema('ActiveActionStatus') };
    default:
      return status ? { '@id': schema('PotentialActionStatus') } : undefined;
  }
}

// ─── Tasks (StandaloneTask, RoutineTask) — schema:Action + ical:Vtodo ──────
// The shape Solid Focus / SoukAI already write, and what `rd tasks list`
// already parses — adopting it makes Leptum tasks interoperable for free.

export function taskToRdf(ctx: ExportContext, t: StandaloneTask): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': [schema('Action'), ical('Vtodo')],
    [schema('name')]: t.name,
    [schema('description')]: t.description,
    [schema('actionStatus')]: statusToActionStatus(t.status),
    [dcterms('created')]: dt(t.createdAt),
    [leptum('completedAt')]: dt(t.completedAt),
    [leptum('archivedAt')]: dt(t.archivedAt),
    [schema('about')]: t.goalId ? { '@id': iri(ctx, 'goals', t.goalId) } : undefined,
    [leptum('partOfRoutine')]: t.routineId ? { '@id': iri(ctx, 'routines', t.routineId) } : undefined,
    [leptum('routineInstanceId')]: t.routineInstanceId,
    [leptum('effort')]: t.effort,
    [leptum('numericEstimate')]: t.numericEstimate,
    [leptum('emotions')]: t.emotions,
    [schema('geo')]: t.lat != null && t.lon != null
      ? { '@type': schema('GeoCoordinates'), [schema('latitude')]: t.lat, [schema('longitude')]: t.lon }
      : undefined,
    [leptum('indoorX')]: t.indoorX,
    [leptum('indoorY')]: t.indoorY,
    [leptum('sortIndex')]: t.sortIndex,
  });
  return { url: iri(ctx, 'tasks', t.id), doc };
}

// ─── Goals — schema:Action, with a leptum:Goal marker for the longer-horizon
// semantics schema:Action alone doesn't capture (milestones, tracking config).

export function goalToRdf(ctx: ExportContext, g: Goal): RdfResource {
  const milestones = (g.milestones ?? []).map((m) => compact({
    '@type': schema('Action'),
    [schema('name')]: m.name,
    [schema('endTime')]: dt(m.targetDate),
    [schema('actionStatus')]: { '@id': schema(m.completed ? 'CompletedActionStatus' : 'PotentialActionStatus') },
    [leptum('completedAt')]: dt(m.completedAt),
    [leptum('order')]: m.order,
  }));

  const trackingData = g.trackingData?.entries?.length
    ? g.trackingData.entries.map((e) => compact({
        [leptum('date')]: e.date,
        [leptum('value')]: e.value,
        [leptum('completed')]: e.completed,
        [leptum('notes')]: e.notes,
        [leptum('timestamp')]: dt(e.timestamp),
      }))
    : undefined;

  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': [schema('Action'), leptum('Goal')],
    [schema('name')]: g.name,
    [schema('description')]: g.description,
    [schema('color')]: g.color,
    [schema('additionalType')]: g.type ? { '@id': iri(ctx, 'goalTypes', g.type) } : undefined,
    [schema('actionStatus')]: statusToActionStatus(g.status ?? undefined),
    [schema('endTime')]: dt(g.targetDate),
    [dcterms('created')]: dt(g.createdAt),
    [leptum('completedAt')]: dt(g.completedAt),
    [leptum('milestone')]: milestones.length ? milestones : undefined,
    [leptum('trackingConfig')]: g.trackingConfig
      ? compact({
          [leptum('trackingType')]: g.trackingConfig.type,
          [leptum('unit')]: g.trackingConfig.unit,
          [leptum('icon')]: g.trackingConfig.icon,
          [leptum('dailyTarget')]: g.trackingConfig.dailyTarget,
          [leptum('maxPerDay')]: g.trackingConfig.maxPerDay,
          [leptum('increments')]: g.trackingConfig.increments,
          [leptum('options')]: g.trackingConfig.options,
        })
      : undefined,
    [leptum('trackingEntry')]: trackingData,
  });
  return { url: iri(ctx, 'goals', g.id), doc };
}

export function goalTypeToRdf(ctx: ExportContext, gt: GoalType): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': leptum('GoalType'),
    [schema('name')]: gt.name,
    [schema('description')]: gt.description,
  });
  return { url: iri(ctx, 'goalTypes', gt.id), doc };
}

// ─── Routines — schema:Action + ical:Vtodo + leptum:Routine, recurrence via
// RRULE instead of cron. Stored in their own routines container; per-routine
// tasks are embedded VTODO nodes related to the parent routine.

export function routineToRdf(ctx: ExportContext, r: Routine): { resource: RdfResource; rruleNote?: string } {
  let rrule: string | undefined;
  let rruleNote: string | undefined;
  if (r.rrule) {
    rrule = r.rrule;
  } else if (r.cron) {
    const converted = cronToRRule(r.cron);
    rrule = converted.rrule;
    if (converted.lossy) rruleNote = `Routine "${r.name}" (${r.id}): ${converted.note}`;
  }

  const routineUrl = iri(ctx, 'routines', r.id);
  const tasks = (r.tasks ?? []).map((t) => compact({
    '@type': [schema('Action'), ical('Vtodo')],
    [ical('uid')]: t.id || `${r.id}-task-${t.index}`,
    [schema('name')]: t.name,
    [schema('description')]: t.description,
    [schema('actionStatus')]: statusToActionStatus(t.status),
    [ical('relatedTo')]: { '@id': routineUrl },
    [leptum('completedAt')]: dt(t.completedAt),
    [leptum('effort')]: t.effort,
    [leptum('numericEstimate')]: t.numericEstimate,
    [leptum('order')]: t.index,
  }));

  const goalIds = r.goalIds?.length ? r.goalIds : (r.goalId ? [r.goalId] : []);

  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': [schema('Action'), ical('Vtodo'), leptum('Routine')],
    [ical('uid')]: r.id,
    [schema('name')]: r.name,
    [schema('description')]: r.description,
    [ical('rrule')]: rrule,
    [schema('actionStatus')]: statusToActionStatus(r.status),
    [schema('about')]: goalIds.length ? goalIds.map((id) => ({ '@id': iri(ctx, 'goals', id) })) : undefined,
    [leptum('isShowUpRoutine')]: r.isShowUpRoutine,
    [leptum('routineTask')]: tasks.length ? tasks : undefined,
  });
  return { resource: { url: routineUrl, doc }, rruleNote };
}

// ─── Routine completions — schema:CompleteAction fits exactly. ────────────

export function routineCompletionToRdf(ctx: ExportContext, c: RoutineCompletion): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': schema('CompleteAction'),
    [schema('object')]: { '@id': iri(ctx, 'tasks', c.routineId) },
    [schema('name')]: c.routineName,
    [schema('endTime')]: dt(c.completedAt),
    [leptum('routineInstanceId')]: c.routineInstanceId,
    [leptum('taskCount')]: c.taskCount,
  });
  return { url: iri(ctx, 'completions', c.routineInstanceId), doc };
}

// ─── Impacts (timeline entries) — schema:Event for the temporal shape, plus
// leptum: predicates for the mood dials nothing standard covers.

export function impactToRdf(ctx: ExportContext, i: Impact, id: string): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': schema('Event'),
    [schema('name')]: i.activity,
    [schema('startDate')]: dt(i.date),
    [schema('endDate')]: dt(i.endTime),
    [schema('description')]: i.notes,
    [schema('url')]: i.sourceUrl,
    [schema('about')]: i.goalId ? { '@id': iri(ctx, 'goals', i.goalId) } : undefined,
    [schema('image')]: i.photoIds?.length ? i.photoIds.map((pid) => ({ '@id': iri(ctx, 'images', pid) })) : undefined,
    [leptum('allDay')]: i.allDay,
    [leptum('dismissed')]: i.dismissed,
    [leptum('requiresOnlineTime')]: i.requiresOnlineTime,
    [leptum('stress')]: i.stress,
    [leptum('fulfillment')]: i.fulfillment,
    [leptum('motivation')]: i.motivation,
    [leptum('cleanliness')]: i.cleanliness,
    [leptum('happiness')]: i.happiness,
    [leptum('confidence')]: i.confidence,
    [leptum('energy')]: i.energy,
    [leptum('focus')]: i.focus,
    [leptum('shame')]: i.shame,
    [leptum('guilt')]: i.guilt,
  });
  return { url: iri(ctx, 'events', id), doc };
}

// ─── Quick notes & week reflections — as:Note. Matches the ActivityStreams
// convention Michael's other Solid apps (dokieli, feedback-tracker) already
// use for freeform text.

/**
 * n.audioPath must already be a real Solid binary-resource URL (set by
 * noteBackend's saveQuickNoteAudio(), which PUTs the actual bytes) — not the
 * local file path the old storage layer used to store there.
 */
export function quickNoteToRdf(ctx: ExportContext, n: QuickNote): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': as('Note'),
    [as('content')]: n.text,
    [as('published')]: dt(n.createdAt),
    [as('updated')]: dt(n.updatedAt),
    [schema('audio')]: n.audioPath
      ? compact({ '@type': schema('AudioObject'), [schema('contentUrl')]: { '@id': n.audioPath }, [schema('duration')]: n.audioDuration })
      : undefined,
    [as('attachment')]: n.photoIds?.length ? n.photoIds.map((pid) => ({ '@id': iri(ctx, 'images', pid) })) : undefined,
  });
  return { url: iri(ctx, 'notes', n.id), doc };
}

export function weekReflectionToRdf(ctx: ExportContext, r: WeekReflection): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': as('Note'),
    [as('content')]: r.text,
    [as('published')]: dt(r.createdAt),
    [as('updated')]: dt(r.updatedAt),
    [leptum('weekStart')]: r.id,
  });
  return { url: iri(ctx, 'notes', `week-${r.id}`), doc };
}

// ─── Life events — schema:Event again (a labeled span on the timeline). ───

export function lifeEventToRdf(ctx: ExportContext, e: LifeEvent): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': schema('Event'),
    [schema('name')]: e.label,
    [schema('startDate')]: e.startWeek,
    [schema('endDate')]: e.endWeek,
    [schema('color')]: e.color,
    [dcterms('created')]: dt(e.createdAt),
  });
  return { url: iri(ctx, 'events', e.id), doc };
}

// ─── Entities — foaf:Person for people, schema:Project for projects, and a
// leptum:Context fallback for the rest (there's no standard "context" class).
// Each subtype gets its own container so a foaf-only address-book app never
// has to wade through Leptum's projects/contexts to find people.

export function entityContainerKey(type: Entity['type']): 'people' | 'projects' | 'contexts' {
  if (type === 'person') return 'people';
  if (type === 'project') return 'projects';
  return 'contexts';
}

export function entityToRdf(ctx: ExportContext, e: Entity): RdfResource {
  const key = entityContainerKey(e.type);
  const type = key === 'people' ? foaf('Person') : key === 'projects' ? schema('Project') : leptum('Context');
  const nameProp = key === 'people' ? foaf('name') : schema('name');
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': type,
    [nameProp]: e.name,
    [schema('description')]: e.description,
    [leptum('tag')]: e.tags,
    [dcterms('created')]: dt(e.createdAt),
  });
  return { url: iri(ctx, key, e.id), doc };
}

// ─── Mentions — oa:Annotation. This is the same shape `rd annotations list`
// already parses from Michael's other apps (dokieli, the iPad annotator), so
// a Leptum mention becomes a normal annotation to that tooling for free.

const SOURCE_CONTAINER: Record<string, ContainerKey> = {
  impact: 'events', insight: 'insights', task: 'tasks', habit: 'tasks', goal: 'goals', note: 'notes',
};
const isAbsoluteIri = (value: string) => /^https?:\/\//.test(value);

export function mentionToRdf(
  ctx: ExportContext,
  m: Mention,
  entityTypeById: Map<string, Entity['type']>
): RdfResource {
  const entityKey = entityContainerKey(entityTypeById.get(m.entityId));
  const bodyIri = isAbsoluteIri(m.entityId) ? m.entityId : iri(ctx, entityKey, m.entityId);
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': oa('Annotation'),
    [oa('hasTarget')]: { '@id': iri(ctx, SOURCE_CONTAINER[m.sourceType] ?? 'notes', m.sourceId) },
    [oa('hasBody')]: { '@id': bodyIri },
    [leptum('fieldName')]: m.fieldName,
    [leptum('context')]: m.context,
    [leptum('position')]: m.position,
    [dcterms('created')]: dt(m.createdAt),
  });
  return { url: iri(ctx, 'annotations', m.id), doc };
}

// ─── Everything below has no meaningful existing vocabulary to lean on —
// pure leptum: terms, but still one JSON-LD resource per record so it's
// still real Linked Data, just app-specific.

export function insightToRdf(ctx: ExportContext, i: Insight): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': leptum('Insight'),
    [schema('name')]: i.name,
    [schema('description')]: i.notes,
    [leptum('category')]: i.category,
    [leptum('affectedMetric')]: i.affectedMetrics.map((m) => ({ [leptum('metric')]: m.metric, [leptum('effect')]: m.effect })),
    [dcterms('created')]: dt(i.createdAt),
  });
  return { url: iri(ctx, 'insights', i.id), doc };
}

export function patternNoteToRdf(ctx: ExportContext, p: PatternNote, id: string): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': leptum('PatternNote'),
    [leptum('activity')]: p.activity,
    [as('content')]: p.notes,
    [dcterms('created')]: dt(p.createdAt),
    [dcterms('modified')]: dt(p.updatedAt),
  });
  return { url: iri(ctx, 'patternNotes', id), doc };
}

export function velocityEntryToRdf(ctx: ExportContext, v: { id: string; taskId: string; taskName: string; effort?: string; numericEstimate?: number; completedAt: number; period: string }): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': leptum('VelocityEntry'),
    [schema('about')]: { '@id': iri(ctx, 'tasks', v.taskId) },
    [schema('name')]: v.taskName,
    [schema('endTime')]: dt(v.completedAt),
    [leptum('effort')]: v.effort,
    [leptum('numericEstimate')]: v.numericEstimate,
    [leptum('period')]: v.period,
  });
  return { url: iri(ctx, 'velocity', v.id), doc };
}

/**
 * The full image's own bytes are PUT separately as a real binary resource by
 * imageBackend.ts (see binaryImageUrl) — this only builds the RDF metadata
 * resource, with schema:contentUrl referencing that binary resource by IRI.
 * No thumbnail resource is modeled; the UI renders from the full image.
 */
export function photoToRdf(ctx: ExportContext, p: PhotoAttachment, binaryImageUrl: string | undefined): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': schema('ImageObject'),
    [leptum('aboutImpact')]: p.impactId ? { '@id': iri(ctx, 'events', p.impactId) } : undefined,
    [schema('contentUrl')]: binaryImageUrl ? { '@id': binaryImageUrl } : undefined,
    [schema('encodingFormat')]: p.mimeType,
    [schema('width')]: p.width,
    [schema('height')]: p.height,
    [schema('caption')]: p.caption,
    [dcterms('created')]: dt(p.createdAt),
  });
  return { url: iri(ctx, 'images', p.id), doc };
}

export function groceryStoreToRdf(ctx: ExportContext, s: GroceryStore): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': schema('GroceryStore'),
    [schema('name')]: s.name,
    [schema('address')]: s.address,
    [schema('openingHours')]: s.openingHours,
    [schema('geo')]: { '@type': schema('GeoCoordinates'), [schema('latitude')]: s.lat, [schema('longitude')]: s.lon },
  });
  return { url: iri(ctx, 'groceryStores', s.id), doc };
}

export function groceryNotificationToRdf(ctx: ExportContext, n: GroceryNotification): RdfResource {
  // Each item's own keys (name, quantity, ...) aren't prefixed context terms,
  // so JSON-LD would silently drop them if spread in as-is — map to
  // leptum:item* predicates instead, matching groceryNotification.shex.
  const items = n.items.map((it) => compact({
    [leptum('itemName')]: it.name,
    [leptum('itemQuantity')]: it.quantity,
    [leptum('itemUnit')]: it.unit,
    [leptum('itemEstimatedPrice')]: it.estimatedPrice,
    [leptum('itemPricePerUnit')]: it.pricePerUnit,
    [leptum('itemIsOnSale')]: it.isOnSale,
    [leptum('itemSalePrice')]: it.salePrice,
    [leptum('itemIsRecurring')]: it.isRecurring,
    [leptum('itemDaysOverdue')]: it.daysOverdue,
    [leptum('itemEstimatedWeightKg')]: it.estimatedWeightKg,
  }));
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': leptum('GroceryNotification'),
    [schema('about')]: { '@id': iri(ctx, 'groceryStores', n.storeId) },
    [leptum('status')]: n.status,
    [leptum('score')]: n.score,
    [leptum('item')]: items,
    [dcterms('created')]: dt(n.createdAt),
  });
  return { url: iri(ctx, 'groceryNotifications', n.id), doc };
}

export function locationToRdf(ctx: ExportContext, l: LocationUpdate): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': schema('GeoCoordinates'),
    [schema('latitude')]: l.lat,
    [schema('longitude')]: l.lon,
    [leptum('accuracy')]: l.accuracy,
    [dcterms('created')]: dt(l.timestamp),
  });
  return { url: iri(ctx, 'locations', 'current'), doc };
}

export function userSettingsToRdf(ctx: ExportContext, s: UserSettings): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': leptum('UserSettings'),
    [leptum('showKeyboardShortcuts')]: s.showKeyboardShortcuts,
    [leptum('enabledExperiment')]: s.enabledExperiments?.length ? [...s.enabledExperiments] : undefined,
    [ui('colorScheme')]: themeToColorScheme(s.theme),
    [leptum('timeFormat')]: s.timeFormat,
    [leptum('wakingStartHour')]: hourToTime(s.wakingStartHour),
    [leptum('wakingEndHour')]: hourToTime(s.wakingEndHour),
    [leptum('suggestContactsFrom')]: s.suggestContactsFromAddressBooks?.map((id) => ({ '@id': id })),
    [leptum('suggestContactsFromGroup')]: s.suggestContactsFromGroups?.map((id) => ({ '@id': id })),
  });
  return { url: iri(ctx, 'preferences', 'leptum'), doc };
}

export function healthDataToRdf(ctx: ExportContext, h: DailyHealthData): RdfResource {
  const { date, exerciseSessions, sleepSessions, ...rest } = h;
  const numeric: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v != null) numeric[leptum(k)] = v;
  }
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': leptum('DailyHealthMetrics'),
    [leptum('date')]: date,
    ...numeric,
    [leptum('exerciseSession')]: exerciseSessions?.map((s) => compact({
      [leptum('exerciseType')]: s.type, [schema('name')]: s.title,
      [schema('startTime')]: s.startTime, [schema('endTime')]: s.endTime, [leptum('durationMinutes')]: s.durationMinutes,
    })),
    [leptum('sleepSession')]: sleepSessions?.map((s) => compact({
      [schema('startTime')]: s.startTime, [schema('endTime')]: s.endTime, [leptum('durationMinutes')]: s.durationMinutes,
    })),
  });
  return { url: iri(ctx, 'health', date), doc };
}

// ─── ActivityWatch import data — a single blob resource (see
// activityWatchData.shex), same singleton shape as UserSettings/Location.

export function activityWatchDataToRdf(ctx: ExportContext, data: ActivityWatchData): RdfResource {
  const doc = compact({
    '@context': CONTEXT,
    '@id': '',
    '@type': leptum('ActivityWatchData'),
    [leptum('importedAt')]: dt(data.importedAt),
    [leptum('event')]: data.events.map((e) => compact({
      [leptum('id')]: e.id,
      [leptum('bucketId')]: e.bucketId,
      [leptum('bucketType')]: e.bucketType,
      [leptum('timestamp')]: dt(e.timestamp),
      [leptum('duration')]: e.duration,
      [leptum('displayName')]: e.displayName,
      [leptum('color')]: e.color,
      [leptum('isHidden')]: e.isHidden,
      [leptum('status')]: e.eventData.status,
      [leptum('file')]: e.eventData.file,
      [leptum('project')]: e.eventData.project,
      [leptum('language')]: e.eventData.language,
      [leptum('projectPath')]: e.eventData.projectPath,
      [leptum('editor')]: e.eventData.editor,
      [leptum('editorVersion')]: e.eventData.editorVersion,
      [leptum('eventType')]: e.eventData.eventType,
      [leptum('url')]: e.eventData.url,
      [leptum('title')]: e.eventData.title,
      [leptum('audible')]: e.eventData.audible,
      [leptum('incognito')]: e.eventData.incognito,
      [leptum('tabCount')]: e.eventData.tabCount,
      [leptum('app')]: e.eventData.app,
    })),
    [leptum('bucket')]: data.buckets.map((b) => compact({
      [leptum('id')]: b.id,
      [leptum('bucketType')]: b.type,
      [leptum('eventCount')]: b.eventCount,
      [leptum('rangeStart')]: dt(b.dateRange.start),
      [leptum('rangeEnd')]: dt(b.dateRange.end),
      [leptum('isVisible')]: b.isVisible,
    })),
  });
  return { url: iri(ctx, 'activityWatch', 'current'), doc };
}
