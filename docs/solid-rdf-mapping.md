# Solid Linked Data storage — vocabulary mapping

How each live Leptum record type maps onto RDF in the Solid backend
(`lib/solidRdf/`). Reuses an established vocabulary wherever one genuinely
fits; falls back to the `leptum:` vocabulary (`docs/leptum-vocab.ttl`,
intended to be hosted at `https://mpeters.dev/ns/leptum#`) only where nothing
else covers the concept — mood dials, tracking config, device telemetry.

Serialization is Turtle on write. Readers use LDO/ShEx over RDF datasets and
can parse Turtle or JSON-LD resources from other Solid apps.

## Container layout

Everything is written into Solid containers discovered/registered via type
index helpers, one resource per record unless noted:

| Container | From |
|---|---|
| `tasks/{id}` | StandaloneTask (home + archived) |
| `goals/{id}`, `goal-types/{id}` | Goal, GoalType |
| `routines/{id}`, `routine-completions/{instanceId}` | Routine (tasks embedded), RoutineCompletion |
| `events/{id}` | Impact |
| `notes/{id}` | QuickNote, WeekReflection |
| `entities/{id}`, `mentions/{id}` | Entity, Mention |
| `insights/{id}`, `pattern-notes/{id}`, `velocity/{id}` | Insight, PatternNote, VelocityEntry |
| `photos/{id}` | PhotoAttachment |
| `grocery-stores/{id}`, `grocery-notifications/{id}` | GroceryStore, GroceryNotification |
| `location`, `settings` | LocationUpdate, UserSettings (singletons) |
| `health/{date}` | DailyHealthData |

Photos and QuickNote audio store bytes as separate binary resources referenced
from their RDF metadata by IRI.

## Type-by-type mapping

| Leptum type | RDF type | Why |
|---|---|---|
| StandaloneTask / RoutineTask | `schema:Action` + `ical:Vtodo` | The exact shape Solid Focus/SoukAI write and `rd tasks list` already parses. `schema:name`, `schema:actionStatus`, `dcterms:created`; `schema:about` links to the Goal. |
| Goal | `schema:Action` + `leptum:Goal` | Same base shape as a task (it *is* a longer-horizon action) plus `leptum:milestone`/`trackingConfig`/`trackingEntry` for what's genuinely bespoke. `schema:color`, `schema:additionalType` (→ GoalType) are real schema.org properties. |
| GoalType | `leptum:GoalType` | No standard fit; trivial shape (name/description). |
| Routine | `schema:Action` + `ical:Vtodo` | Recurrence via `ical:rrule` (converted from cron, see below), not a custom recurrence format. |
| RoutineCompletion | `schema:CompleteAction` | Schema.org has this exact subtype of Action — a direct fit. `schema:object` points at the Routine. |
| Impact (timeline entry) | `schema:Event` | Has the temporal shape (`startDate`/`endDate`) an activity block needs. Mood dials (stress, energy, focus…) have no standard vocabulary anywhere — `leptum:` properties, 0–10 scale. |
| QuickNote, WeekReflection | `as:Note` (ActivityStreams) | Matches the convention already used by the dokieli/feedback-tracker annotation apps on this pod. `as:content`, `as:published`, `as:updated`. Audio via `schema:AudioObject`. |
| LifeEvent | `schema:Event` | A labeled span, same shape as Impact. |
| Entity | `foaf:Person` (people) / `schema:Project` (projects) / `leptum:Context` (everything else) | People are the one case with an extremely well-established vocabulary; the rest doesn't have a clean standard fit. |
| Mention | `oa:Annotation` (Web Annotation) | This is what a mention *is* — text in one document referring to another resource. Also the exact shape `rd annotations list` already parses from other apps on this pod, so Leptum mentions become ordinary annotations to that tooling. |
| Insight, PatternNote, VelocityEntry, GroceryNotification, UserSettings, DailyHealthMetrics | `leptum:*` | No existing vocabulary fits personal analytics/config/telemetry at this level of specificity. Cross-references (e.g. VelocityEntry → Task) still use `schema:about`/`schema:object` where the *relationship* is standard even if the class isn't. |
| GroceryStore | `schema:GroceryStore` | A real, registered schema.org type — direct fit, including `schema:geo`/`GeoCoordinates`. |
| LocationUpdate | `schema:GeoCoordinates` | Direct fit; `leptum:accuracy` for the one non-standard field. |
| PhotoAttachment | `schema:ImageObject` | `schema:thumbnail`, `schema:caption`, `schema:encodingFormat` are all real schema.org properties. |

## Recurrence: cron → RRULE

Per the decision to go RRULE-only, `lib/solidRdf/cronToRrule.ts` converts
Leptum's 5-field cron strings to `ical:rrule` values. Straightforward
patterns (fixed time daily, weekday subsets, hour ranges with a step, plain
intervals) convert exactly — verified against every cron pattern actually
in use in this codebase (`grep -rn "cron:" app components utils`). The one
lossy case is a cron expression that constrains *both* day-of-month *and*
day-of-week (cron ANDs them; RRULE's `BYMONTHDAY`+`BYDAY` combination ORs
them within a `MONTHLY` rule) — the converter flags this via `lossy: true`
and a human-readable note; the export surfaces these as warnings rather than
silently widening a routine's schedule.

## What's intentionally not addressed yet

- **No Type Index registration.** A real Solid app should register where it
  keeps each type of data in the user's public/private Type Index
  (`solid:TypeRegistration`) so other apps can discover it without
  hardcoded paths. This export writes to a fixed container instead — worth
  adding once the shapes above have been used for a while and feel settled.
- **No legacy Jobs/Stacks/WeeklyGoals.** These app features were removed rather
  than carried forward into Solid storage.
- **leptum_app is unaffected.** This lives entirely in the web app; the
  Flutter/Kotlin companion's own Solid path (Android Solid Services, JSON
  bundles) is untouched. Bringing it onto this same shape is follow-up work,
  not part of this change.
