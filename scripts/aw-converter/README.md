# aw-converter

Standalone Go tool that converts ActivityWatch bucket-export JSON into
formats Leptum can consume, plus an RDF/Turtle export based on the
[Leptum × ActivityWatch ontology](./ontology.md).

## Build

```
cd scripts/aw-converter
go build -o aw-converter .
```

No external dependencies — stdlib only.

## Modes

```
# Drop-in replacement for an /leptum/activitywatch RemoteStorage node
./aw-converter -in buckets.json -out aw.json -mode=leptum

# Convert raw AW events into Leptum Impacts (merges contiguous windows)
./aw-converter -in buckets.json -out impacts.json -mode=impacts

# RDF Turtle using the Leptum/AW ontology (see ontology.md)
./aw-converter -in buckets.json -out activity.ttl -mode=rdf
```

Flags:

- `-min-duration` (seconds, default 60) — drop sub-minute events
- `-skip-afk` — exclude AFK events from output

Input can be `-` / stdin; output defaults to stdout.

## Impact-merging heuristic

For `-mode=impacts`, contiguous window events for the same app within 5
minutes collapse into one Impact. Overlapping browser/editor events get
attached as `notes` and the first overlapping URL becomes `sourceUrl`.
This mirrors what the in-app "+ Create Manual Entry" flow does, just in
bulk and offline.

## RDF design

See [`ontology.md`](./ontology.md) for the full ontology — class
hierarchy, namespaces, property list, mapping rules, and a worked
example. Short version: AW events and Leptum impacts both inherit from
`lep:Activity` → `prov:Activity`, time is `time:hasBeginning`/`hasEnd`,
and `prov:wasDerivedFrom` records that an Impact came from a specific AW
event so the provenance chain stays intact.
