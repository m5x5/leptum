# Leptum × ActivityWatch RDF Ontology

A concept for representing ActivityWatch (AW) telemetry and Leptum's own
activity-logging concepts in a single, queryable RDF graph. The goal is
interoperability: any consumer that understands `prov:` + `time:` should be
able to make sense of an export without knowing Leptum or AW specifics, and
power users get a graph they can query with SPARQL.

## Namespaces

| Prefix | IRI                                       | Purpose                              |
| ------ | ----------------------------------------- | ------------------------------------ |
| `lep:` | `https://leptum.app/ns#`                  | Leptum-native classes/properties     |
| `aw:`  | `https://activitywatch.net/ns#`           | ActivityWatch raw concepts           |
| `prov:`| `http://www.w3.org/ns/prov#`              | W3C PROV-O (provenance / activities) |
| `time:`| `http://www.w3.org/2006/time#`            | W3C OWL-Time intervals               |
| `xsd:` | `http://www.w3.org/2001/XMLSchema#`       | Datatypes                            |
| `geo:` | `http://www.w3.org/2003/01/geo/wgs84_pos#`| Lat/lon for location triggers        |

## Class hierarchy

```
prov:Activity
  └─ lep:Activity                    "anything that happened during a time interval"
       ├─ lep:Impact                 a user-logged Leptum activity (manual)
       ├─ lep:RoutineCompletion      a habit/routine instance
       └─ aw:Event                   a raw ActivityWatch event
              ├─ aw:WindowEvent
              ├─ aw:EditorEvent
              ├─ aw:BrowserEvent
              └─ aw:AFKEvent

prov:Collection
  └─ aw:Bucket                       one AW data source on one host
```

`lep:Goal`, `lep:Routine`, `lep:Task`, `lep:Entity` (people/projects/contexts)
sit beside the Activity tree and are linked via the properties below.

## Properties

### Temporal (OWL-Time)

- `time:hasBeginning` — `xsd:dateTime` start of the interval
- `time:hasEnd` — `xsd:dateTime` end of the interval
- `lep:durationSeconds` — `xsd:decimal` convenience (computable, but cheap)

### Labels & categorization

- `lep:activityLabel` — human-readable name (string)
- `lep:goal` → `lep:Goal`
- `lep:linkedRoutine` → `lep:Routine`
- `lep:linkedTask` → `lep:Task`
- `aw:bucketType` — `"window" | "editor" | "browser" | "afkstatus"`

### AW raw payload (passthrough)

`aw:app`, `aw:title`, `aw:url`, `aw:file`, `aw:project`, `aw:language`,
`aw:editor`, `aw:status` — all `xsd:string`. Kept verbatim so nothing is
lost in translation.

### Mood / inner state (Leptum impacts)

All `xsd:decimal` 0–10:
`lep:stress`, `lep:fulfillment`, `lep:motivation`, `lep:energy`,
`lep:focus`, `lep:happiness`, `lep:confidence`, `lep:shame`, `lep:guilt`,
`lep:cleanliness`.

### Provenance

- `prov:wasDerivedFrom` — `lep:Impact` ←  `aw:Event` when an impact was
  auto-suggested from an AW event, or `aw:Event` ← `aw:Bucket`.
- `prov:wasGeneratedBy` — actor that created the record (the user, an AI
  agent identified by IRI, an import script).

### Location

- `geo:lat`, `geo:long` — for impacts captured via a location trigger.

## Mapping rules (AW → ontology)

| AW input                                  | RDF                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `buckets[id]`                             | `aw:bucket-<safeId>` `a aw:Bucket`, `aw:bucketType`, `lep:eventCount`    |
| `event` in a `currentwindow` bucket       | `aw:event-<hash>` `a aw:WindowEvent`, payload → `aw:app`, `aw:title`    |
| `event` in `app.editor.activity`          | `aw:EditorEvent` + `aw:editor`, `aw:file`, `aw:project`, `aw:language`  |
| `event` in `web.tab.current`              | `aw:BrowserEvent` + `aw:url`, `aw:title`                                |
| `event` in `aw-watcher-afk`               | `aw:AFKEvent` + `aw:status`                                              |
| `timestamp` + `duration`                  | `time:hasBeginning` + `time:hasEnd` (+ `lep:durationSeconds`)            |

Bucket-type strings are normalized: anything containing `"afk"` becomes
`"afkstatus"`, `"window"` → `"window"`, `"editor"` → `"editor"`,
`"web"`/`"browser"` → `"browser"`. The full AW type stays available via
the bucket node.

## Mapping rules (Leptum → ontology)

| Leptum field      | RDF                                                  |
| ----------------- | ---------------------------------------------------- |
| `Impact.activity` | `lep:activityLabel`                                  |
| `Impact.date`     | `time:hasBeginning` (ms → ISO `xsd:dateTime`)        |
| `Impact.endTime`  | `time:hasEnd`                                        |
| `Impact.goalId`   | `lep:goal` → `lep:goal-<id>`                         |
| `Impact.notes`    | `rdfs:comment`                                       |
| `Impact.sourceUrl`| `aw:url`                                             |
| `Impact.<mood>`   | `lep:<mood>` (see "Mood / inner state" above)        |

## Example

```turtle
@prefix lep:  <https://leptum.app/ns#> .
@prefix aw:   <https://activitywatch.net/ns#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix time: <http://www.w3.org/2006/time#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

aw:bucket-aw-watcher-window-cucumber a aw:Bucket ;
    aw:bucketType "window" ;
    lep:eventCount 412 .

aw:event-3a7f1d2e a aw:WindowEvent, lep:Activity, prov:Activity ;
    prov:wasDerivedFrom aw:bucket-aw-watcher-window-cucumber ;
    aw:bucketType "window" ;
    lep:activityLabel "Code" ;
    time:hasBeginning "2026-05-25T08:14:00Z"^^xsd:dateTime ;
    time:hasEnd       "2026-05-25T08:46:30Z"^^xsd:dateTime ;
    lep:durationSeconds "1950.000"^^xsd:decimal ;
    aw:app   "Code" ;
    aw:title "main.go — leptum" .

lep:impact-c9d1 a lep:Impact, lep:Activity, prov:Activity ;
    prov:wasDerivedFrom aw:event-3a7f1d2e ;
    lep:activityLabel "Work on AW converter" ;
    lep:goal lep:goal-leptum ;
    time:hasBeginning "2026-05-25T08:14:00Z"^^xsd:dateTime ;
    time:hasEnd       "2026-05-25T08:46:30Z"^^xsd:dateTime ;
    lep:focus     "8.0"^^xsd:decimal ;
    lep:fulfillment "7.0"^^xsd:decimal .
```

## Why this shape

- **PROV-O for activities**: pulling in `prov:Activity` means any standard
  provenance tool can crawl the graph — `wasDerivedFrom` lets the AI
  suggestion workflow (`suggest-time-blocks`) be explicit about which raw
  AW events justified a suggested impact.
- **OWL-Time** for intervals: keeps reasoning about overlaps, gaps, and
  containment standard. SPARQL queries for "what was I doing while window
  X was focused" stay portable.
- **Verbatim AW payload** under `aw:`: nothing is lost; lossy
  normalizations live in `lep:` so they can be revisited.
- **Symmetry between AW events and Leptum impacts**: both inherit from
  `lep:Activity`, so a single SPARQL query can compute "tracked minutes
  per goal" by joining whichever activity source is most reliable.

## Open extensions

- `lep:Mood` snapshot class so mood is reusable independent of an impact.
- Link `aw:BrowserEvent.url` to schema.org `WebPage` for crawled context.
- Encode `lep:Routine` CRON via `time:DateTimeDescription`.
- A SHACL shapes file (`leptum-shapes.ttl`) to validate exports.
