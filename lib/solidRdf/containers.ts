// Every distinct resource shape the export writes, paired with the RDF
// classes that identify it and a generic default container name to register
// in the pod's type index if nothing already claims that class combination.
//
// Names are deliberately plain nouns ("tasks", "events", "people") — not
// "leptum-tasks" or anything under a /leptum*/ prefix — because the whole
// point of checking the type index first is that any Solid app writing
// schema:Action + ical:Vtodo should end up in the same container as any
// other, not a Leptum-only silo. See docs/solid-rdf-mapping.md.
import { NS } from "./namespaces";

export type ContainerKey =
  | "tasks"
  | "routines"
  | "goals"
  | "goalTypes"
  | "completions"
  | "events"
  | "notes"
  | "people"
  | "projects"
  | "contexts"
  | "annotations"
  | "insights"
  | "patternNotes"
  | "velocity"
  | "images"
  | "groceryStores"
  | "groceryNotifications"
  | "locations"
  | "preferences"
  | "health"
  | "activityWatch";

export interface ContainerSpec {
  key: ContainerKey;
  /** Absolute RDF class IRIs. Matched as an exact set against existing solid:TypeRegistration entries. */
  classes: string[];
  /** Generic, app-agnostic container name segment used only when no existing registration is found. */
  defaultName: string;
}

const A = NS.schema + "Action";
const VTODO = NS.ical + "Vtodo";

export const CONTAINER_SPECS: ContainerSpec[] = [
  { key: "tasks", classes: [A, VTODO], defaultName: "tasks" },
  { key: "routines", classes: [A, VTODO, NS.leptum + "Routine"], defaultName: "routines" },
  { key: "goals", classes: [A, NS.leptum + "Goal"], defaultName: "goals" },
  { key: "goalTypes", classes: [NS.leptum + "GoalType"], defaultName: "goal-types" },
  { key: "completions", classes: [NS.schema + "CompleteAction"], defaultName: "completions" },
  // Impact (timeline entries) and LifeEvent (era bands) share this — both are schema:Event.
  { key: "events", classes: [NS.schema + "Event"], defaultName: "events" },
  // QuickNote and WeekReflection share this — both are as:Note.
  { key: "notes", classes: [NS.as + "Note"], defaultName: "notes" },
  { key: "people", classes: [NS.foaf + "Person"], defaultName: "people" },
  { key: "projects", classes: [NS.schema + "Project"], defaultName: "projects" },
  { key: "contexts", classes: [NS.leptum + "Context"], defaultName: "contexts" },
  { key: "annotations", classes: [NS.oa + "Annotation"], defaultName: "annotations" },
  { key: "insights", classes: [NS.leptum + "Insight"], defaultName: "insights" },
  { key: "patternNotes", classes: [NS.leptum + "PatternNote"], defaultName: "pattern-notes" },
  { key: "velocity", classes: [NS.leptum + "VelocityEntry"], defaultName: "velocity" },
  { key: "images", classes: [NS.schema + "ImageObject"], defaultName: "images" },
  { key: "groceryStores", classes: [NS.schema + "GroceryStore"], defaultName: "grocery-stores" },
  { key: "groceryNotifications", classes: [NS.leptum + "GroceryNotification"], defaultName: "grocery-notifications" },
  { key: "locations", classes: [NS.schema + "GeoCoordinates"], defaultName: "locations" },
  { key: "preferences", classes: [NS.leptum + "UserSettings"], defaultName: "preferences" },
  { key: "health", classes: [NS.leptum + "DailyHealthMetrics"], defaultName: "health" },
  // Single-blob import collection, same shape as UserSettings/LocationUpdate
  // (one fixed resource, not one-per-record).
  { key: "activityWatch", classes: [NS.leptum + "ActivityWatchData"], defaultName: "activity-watch" },
];
