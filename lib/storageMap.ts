// Human-readable map of where every kind of Leptum data lives. Built on the
// same CONTAINER_SPECS the storage layer uses, so the About page can't drift
// from what the code actually writes. Keep the prose here, not in components.
import { CONTAINER_SPECS, type ContainerKey, type ContainerSpec } from './solidRdf/containers';
import { NS } from './solidRdf/namespaces';

export interface StoredType {
  key: ContainerKey;
  /** What the user calls it. */
  label: string;
  /** One sentence: what records end up here. */
  description: string;
  /** Resource naming inside the container, e.g. "{id}" or "{date}". */
  resource: string;
  /** Slugs of shapes served at /shapes/{slug} that describe these resources. */
  shapes: string[];
  /** Extra non-RDF resources written next to the metadata. */
  binaries?: string;
  /** True for a single fixed resource instead of one-per-record. */
  singleton?: boolean;
  /** Which app features read/write it (for the "used by" column). */
  usedBy: string[];
}

const DETAILS: Record<ContainerKey, Omit<StoredType, 'key'>> = {
  tasks: {
    label: 'Tasks',
    description: 'Standalone to-dos and the task instances routines create; archived tasks stay here with an archive date.',
    resource: '{id}',
    shapes: ['task'],
    usedBy: ['Home', 'Routines', 'Goals'],
  },
  routines: {
    label: 'Routines',
    description: 'Recurring routines with their embedded task templates; schedules are stored as iCalendar RRULEs.',
    resource: '{id}',
    shapes: ['routine'],
    usedBy: ['Routines', 'Home'],
  },
  goals: {
    label: 'Goals',
    description: 'Goals with milestones, deadlines, tracking configuration and daily tracking entries.',
    resource: '{id}',
    shapes: ['goal'],
    usedBy: ['Goals', 'Timeline', 'Day View'],
  },
  goalTypes: {
    label: 'Goal types',
    description: 'The categories goals are grouped by.',
    resource: '{id}',
    shapes: ['goalType'],
    usedBy: ['Goals'],
  },
  completions: {
    label: 'Routine completions',
    description: 'One record each time a routine instance was completed — the basis for streaks.',
    resource: '{routineInstanceId}',
    shapes: ['routineCompletion'],
    usedBy: ['Home', 'Routines', 'Day View'],
  },
  events: {
    label: 'Timeline entries & life events',
    description: 'Timed activities with mood dials (stress, energy, focus, …) and the labelled life-event spans shown on the timeline.',
    resource: '{id}',
    shapes: ['event'],
    usedBy: ['Timeline', 'Wellbeing', 'Day View'],
  },
  notes: {
    label: 'Quick notes & week reflections',
    description: 'Quick captures (text, photo references, voice memos) and the free-text reflection for each week.',
    resource: '{id} · week-{weekStart}',
    shapes: ['note'],
    binaries: 'Voice memos are stored as {id}.audio next to the note.',
    usedBy: ['Home', 'Timeline'],
  },
  people: {
    label: 'People',
    description: 'People you @mention in activities and notes.',
    resource: '{id}',
    shapes: ['entity'],
    usedBy: ['Settings › Entities', 'mentions everywhere'],
  },
  projects: {
    label: 'Projects',
    description: 'Projects you @mention.',
    resource: '{id}',
    shapes: ['entity'],
    usedBy: ['Settings › Entities', 'mentions everywhere'],
  },
  contexts: {
    label: 'Contexts',
    description: 'Untyped or context entities (places, tools, situations) you @mention.',
    resource: '{id}',
    shapes: ['entity'],
    usedBy: ['Settings › Entities', 'mentions everywhere'],
  },
  annotations: {
    label: 'Mentions',
    description: 'Each @mention as a W3C Web Annotation linking the source text to the entity.',
    resource: '{id}',
    shapes: ['mention'],
    usedBy: ['Timeline', 'Wellbeing', 'Home'],
  },
  insights: {
    label: 'Insights',
    description: 'Behavioural insights and which metrics they affect.',
    resource: '{id}',
    shapes: ['insight'],
    usedBy: ['Wellbeing', 'Insights'],
  },
  patternNotes: {
    label: 'Pattern notes',
    description: 'Notes attached to a recurring activity name.',
    resource: '{activity}',
    shapes: ['patternNote'],
    usedBy: ['Wellbeing'],
  },
  velocity: {
    label: 'Velocity entries',
    description: 'Effort estimates of completed tasks, for the weekly velocity chart.',
    resource: '{id}',
    shapes: ['velocityEntry'],
    usedBy: ['Home', 'Insights'],
  },
  images: {
    label: 'Photos',
    description: 'Photo attachments: thumbnail and caption as metadata, the full image as a binary resource.',
    resource: '{id}',
    shapes: ['image'],
    binaries: 'Full-size images are stored as {id}.bin next to the metadata.',
    usedBy: ['Timeline', 'Quick capture'],
  },
  groceryStores: {
    label: 'Grocery stores',
    description: 'Saved store locations for proximity reminders.',
    resource: '{id}',
    shapes: ['groceryStore'],
    usedBy: ['Routines (location triggers)'],
  },
  groceryNotifications: {
    label: 'Grocery notifications',
    description: 'Pending and handled proximity notifications.',
    resource: '{id}',
    shapes: ['groceryNotification'],
    usedBy: ['Routines (location triggers)'],
  },
  locations: {
    label: 'Last location',
    description: 'The most recent device location, for location-triggered routines.',
    resource: 'current',
    shapes: ['location'],
    singleton: true,
    usedBy: ['Routines (location triggers)'],
  },
  preferences: {
    label: 'Settings',
    description: 'App preferences: theme, time format, waking hours, keyboard hints, enabled experiments.',
    resource: 'leptum',
    shapes: ['userSettings'],
    singleton: true,
    usedBy: ['Settings'],
  },
  health: {
    label: 'Health',
    description: 'Daily steps, sleep and exercise sessions synced from the Android companion.',
    resource: '{date}',
    shapes: ['health'],
    usedBy: ['Health (experiment)'],
  },
  activityWatch: {
    label: 'ActivityWatch import',
    description: 'The last imported ActivityWatch bucket export, as one document.',
    resource: 'data',
    shapes: ['activityWatchData'],
    singleton: true,
    usedBy: ['Timeline'],
  },
};

const PREFIXES: Array<[string, string]> = Object.entries(NS).map(([prefix, iri]) => [prefix, iri]);

/** "https://schema.org/Action" → "schema:Action" */
export function prefixIri(iri: string): string {
  for (const [prefix, base] of PREFIXES) {
    if (iri.startsWith(base)) return `${prefix}:${iri.slice(base.length)}`;
  }
  return iri;
}

export interface StoredTypeRow extends StoredType {
  spec: ContainerSpec;
  classes: string[];
}

export const STORAGE_MAP: StoredTypeRow[] = CONTAINER_SPECS.map((spec) => ({
  key: spec.key,
  ...DETAILS[spec.key],
  spec,
  classes: spec.classes.map(prefixIri),
}));

export const VOCABULARIES: Array<{ prefix: string; iri: string; usedFor: string }> = [
  { prefix: 'schema', iri: NS.schema, usedFor: 'Actions (tasks, goals, routines), events, completions, images, stores, coordinates' },
  { prefix: 'ical', iri: NS.ical, usedFor: 'VTODO shape and RRULE recurrence for tasks and routines' },
  { prefix: 'foaf', iri: NS.foaf, usedFor: 'People' },
  { prefix: 'as', iri: NS.as, usedFor: 'Notes and week reflections (ActivityStreams Note)' },
  { prefix: 'oa', iri: NS.oa, usedFor: 'Mentions (Web Annotation)' },
  { prefix: 'dcterms', iri: NS.dcterms, usedFor: 'Creation and modification dates' },
  { prefix: 'ui', iri: NS.ui, usedFor: 'Colour scheme preference' },
  { prefix: 'leptum', iri: NS.leptum, usedFor: 'Mood dials, tracking config, insights, health metrics and other terms no public vocabulary covers' },
];

export interface LocalDatum {
  key: string;
  where: 'localStorage' | 'sessionStorage' | 'memory' | 'IndexedDB';
  what: string;
  /** True if the value is also mirrored to the pod. */
  mirrored?: boolean;
}

export const LOCAL_DATA: LocalDatum[] = [
  { key: 'soidc', where: 'IndexedDB', what: 'Your Solid-OIDC session (tokens) so you stay signed in between visits.' },
  { key: 'leptum_solid_idp', where: 'localStorage', what: 'The identity provider URL you last connected with.' },
  { key: 'enabledExperiments', where: 'localStorage', what: 'Which experimental features are switched on.', mirrored: true },
  { key: 'theme · timeFormat · showKeyboardShortcuts', where: 'localStorage', what: 'Display preferences, read before the pod answers so the UI doesn’t flash.', mirrored: true },
  { key: 'developerMode · offlineModeEnabled', where: 'localStorage', what: 'Developer switches and whether the offline service worker is enabled.' },
  { key: 'leptum_dob', where: 'localStorage', what: 'Date of birth, if not readable from your WebID profile.' },
  { key: 'leptum_google_client_id', where: 'localStorage', what: 'Your own Google Calendar OAuth client id (tokens live in sessionStorage for the tab only).' },
  { key: 'routine-last-check · leptum_show_up_date · leptum_onboarding_completed', where: 'localStorage', what: 'Bookkeeping so routines trigger once per day and onboarding shows once.' },
  { key: 'dayview-* · dayview-dismissed-goals', where: 'localStorage', what: 'Day View timers, completed steps and dismissed urgency hints — per device, on purpose.' },
  { key: 'pendingShare', where: 'localStorage', what: 'Content shared to the app via the Web Share Target, until it is turned into a note.' },
  { key: 'timeline-week-start', where: 'sessionStorage', what: 'Which week the timeline is showing, for this tab.' },
  { key: 'Query cache', where: 'memory', what: 'Records read from the pod are cached in memory for 30 s (background refresh every 5 min) and dropped on sign-out.' },
];
