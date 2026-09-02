// aw-converter: convert ActivityWatch bucket exports into formats Leptum
// understands.
//
// Two output modes:
//
//	-mode=leptum   → JSON shaped like Leptum's ActivityWatchData
//	                  (drop-in for RemoteStorage at /leptum/activitywatch)
//	-mode=impacts  → JSON shaped like Leptum's Impacts collection
//	                  (each AW time-block becomes one Impact)
//	-mode=rdf      → Turtle RDF using the Leptum/AW ontology
//	                  defined in ontology.md
//
// Usage:
//
//	aw-converter -in aw-buckets.json -out impacts.json -mode=impacts
//	aw-converter -in aw-buckets.json -out activity.ttl  -mode=rdf
package main

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ---------- ActivityWatch input types ----------

type awExport struct {
	Buckets map[string]awBucket `json:"buckets"`
}

type awBucket struct {
	ID       string    `json:"id"`
	Type     string    `json:"type"`
	Client   string    `json:"client"`
	Hostname string    `json:"hostname"`
	Created  string    `json:"created"`
	Events   []awEvent `json:"events"`
}

type awEvent struct {
	Timestamp string                 `json:"timestamp"`
	Duration  float64                `json:"duration"` // seconds
	Data      map[string]interface{} `json:"data"`
}

// ---------- Leptum output types ----------

type leptumProcessedEvent struct {
	ID          string                 `json:"id"`
	BucketID    string                 `json:"bucketId"`
	BucketType  string                 `json:"bucketType"`
	Timestamp   int64                  `json:"timestamp"` // ms epoch
	Duration    float64                `json:"duration"`  // seconds
	DisplayName string                 `json:"displayName"`
	EventData   map[string]interface{} `json:"eventData"`
	Color       string                 `json:"color"`
}

type leptumBucketMeta struct {
	ID         string `json:"id"`
	Type       string `json:"type"`
	EventCount int    `json:"eventCount"`
	DateRange  struct {
		Start int64 `json:"start"`
		End   int64 `json:"end"`
	} `json:"dateRange"`
	IsVisible bool `json:"isVisible"`
}

type leptumActivityWatchData struct {
	Events     []leptumProcessedEvent `json:"events"`
	ImportedAt int64                  `json:"importedAt"`
	Buckets    []leptumBucketMeta     `json:"buckets"`
}

type leptumImpact struct {
	ID        string `json:"id"`
	Activity  string `json:"activity"`
	Date      int64  `json:"date"`    // start, ms epoch
	EndTime   int64  `json:"endTime"` // ms epoch
	Notes     string `json:"notes,omitempty"`
	SourceURL string `json:"sourceUrl,omitempty"`
}

type leptumImpactsCollection struct {
	Impacts []leptumImpact `json:"impacts"`
}

// ---------- helpers ----------

// palette mirrors lib/designColors activityBucketColors (kept short — exact
// hex doesn't matter for downstream import, it's just a visual hint).
var palette = []string{
	"#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa",
	"#fb7185", "#22d3ee", "#facc15", "#4ade80", "#c084fc",
}

const afkColor = "#9ca3af"

func parseTime(s string) (time.Time, error) {
	// AW uses RFC3339 with microseconds, sometimes with Z, sometimes offset.
	layouts := []string{
		time.RFC3339Nano,
		"2006-01-02T15:04:05.999999-07:00",
		"2006-01-02T15:04:05Z",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unparseable timestamp %q", s)
}

func dataStr(d map[string]interface{}, k string) string {
	if v, ok := d[k]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func displayName(bucketType string, d map[string]interface{}) string {
	switch bucketType {
	case "window", "currentwindow":
		if v := dataStr(d, "app"); v != "" {
			return v
		}
		if v := dataStr(d, "title"); v != "" {
			return v
		}
		return "Unknown Window"
	case "editor", "app.editor.activity":
		editor := dataStr(d, "editor")
		if editor == "" {
			editor = "Editor"
		}
		if f := dataStr(d, "file"); f != "" {
			return editor + ": " + filepath.Base(f)
		}
		if p := dataStr(d, "project"); p != "" {
			return editor + ": " + p
		}
		if l := dataStr(d, "language"); l != "" {
			return editor + " (" + l + ")"
		}
		return editor
	case "browser", "web", "web.tab.current":
		if v := dataStr(d, "title"); v != "" {
			return v
		}
		if u := dataStr(d, "url"); u != "" {
			if pu, err := url.Parse(u); err == nil && pu.Host != "" {
				return pu.Host
			}
			return u
		}
		return "Browser"
	case "afkstatus", "afk":
		if dataStr(d, "status") == "afk" {
			return "Away from Keyboard"
		}
		return "Active"
	default:
		if v := dataStr(d, "app"); v != "" {
			return v
		}
		if v := dataStr(d, "title"); v != "" {
			return v
		}
		if bucketType == "" {
			return "Activity"
		}
		return strings.ToUpper(bucketType[:1]) + bucketType[1:]
	}
}

// bucketTypeOf maps the AW bucket type field to one of Leptum's normalized
// short keys (window / editor / browser / afkstatus / other).
func bucketTypeOf(t string) string {
	switch {
	case strings.Contains(t, "afk"):
		return "afkstatus"
	case strings.Contains(t, "window"):
		return "window"
	case strings.Contains(t, "editor"):
		return "editor"
	case strings.Contains(t, "web") || strings.Contains(t, "browser"):
		return "browser"
	default:
		return t
	}
}

func colorFor(name, bucketType string) string {
	if bucketType == "afkstatus" {
		return afkColor
	}
	h := sha1.Sum([]byte(name))
	idx := int(h[0]) % len(palette)
	return palette[idx]
}

func stableID(parts ...string) string {
	h := sha1.Sum([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(h[:8])
}

// ---------- conversion ----------

type processed struct {
	data    leptumActivityWatchData
	minDur  float64
	skipAFK bool
}

func process(in awExport, minDurSec float64, skipAFK bool) processed {
	out := leptumActivityWatchData{ImportedAt: time.Now().UnixMilli()}
	for bid, b := range in.Buckets {
		bt := bucketTypeOf(b.Type)
		meta := leptumBucketMeta{ID: bid, Type: bt, IsVisible: true}
		var minT, maxT int64
		count := 0
		for _, ev := range b.Events {
			if ev.Duration < minDurSec {
				continue
			}
			if skipAFK && bt == "afkstatus" {
				continue
			}
			t, err := parseTime(ev.Timestamp)
			if err != nil {
				continue
			}
			ms := t.UnixMilli()
			name := displayName(bt, ev.Data)
			out.Events = append(out.Events, leptumProcessedEvent{
				ID:          stableID(bid, ev.Timestamp, name),
				BucketID:    bid,
				BucketType:  bt,
				Timestamp:   ms,
				Duration:    ev.Duration,
				DisplayName: name,
				EventData:   ev.Data,
				Color:       colorFor(name, bt),
			})
			if minT == 0 || ms < minT {
				minT = ms
			}
			endMs := ms + int64(ev.Duration*1000)
			if endMs > maxT {
				maxT = endMs
			}
			count++
		}
		meta.EventCount = count
		meta.DateRange.Start = minT
		meta.DateRange.End = maxT
		out.Buckets = append(out.Buckets, meta)
	}
	sort.Slice(out.Events, func(i, j int) bool {
		return out.Events[i].Timestamp < out.Events[j].Timestamp
	})
	return processed{data: out, minDur: minDurSec, skipAFK: skipAFK}
}

// toImpacts collapses contiguous same-activity window events into a single
// Impact. Editor + browser events ride along as notes/sourceUrl context.
func toImpacts(p processed) leptumImpactsCollection {
	// Only window-bucket events drive impact creation; merge runs of the
	// same app within a 5-minute join distance.
	const joinMs = int64(5 * 60 * 1000)
	type run struct {
		name  string
		start int64
		end   int64
		urls  []string
		notes []string
	}
	var runs []run
	var cur *run
	for _, e := range p.data.Events {
		if e.BucketType != "window" {
			continue
		}
		end := e.Timestamp + int64(e.Duration*1000)
		if cur != nil && cur.name == e.DisplayName && e.Timestamp-cur.end <= joinMs {
			if end > cur.end {
				cur.end = end
			}
			continue
		}
		if cur != nil {
			runs = append(runs, *cur)
		}
		cur = &run{name: e.DisplayName, start: e.Timestamp, end: end}
	}
	if cur != nil {
		runs = append(runs, *cur)
	}

	// Annotate runs with overlapping browser titles / editor files.
	for i := range runs {
		r := &runs[i]
		for _, e := range p.data.Events {
			if e.BucketType != "browser" && e.BucketType != "editor" {
				continue
			}
			if e.Timestamp < r.start || e.Timestamp > r.end {
				continue
			}
			if u := dataStr(e.EventData, "url"); u != "" {
				r.urls = append(r.urls, u)
			} else if e.DisplayName != "" {
				r.notes = append(r.notes, e.DisplayName)
			}
		}
	}

	col := leptumImpactsCollection{}
	for _, r := range runs {
		imp := leptumImpact{
			ID:       stableID("imp", r.name, fmt.Sprintf("%d", r.start)),
			Activity: r.name,
			Date:     r.start,
			EndTime:  r.end,
		}
		if len(r.notes) > 0 {
			imp.Notes = strings.Join(dedup(r.notes), " · ")
		}
		if len(r.urls) > 0 {
			imp.SourceURL = r.urls[0]
		}
		col.Impacts = append(col.Impacts, imp)
	}
	return col
}

func dedup(in []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range in {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

// ---------- RDF (Turtle) output ----------
//
// Ontology design (see ontology.md for full spec). Brief:
//   @prefix lep:  <https://leptum.app/ns#>
//   @prefix aw:   <https://activitywatch.net/ns#>
//   @prefix prov: <http://www.w3.org/ns/prov#>
//   @prefix time: <http://www.w3.org/2006/time#>
//
//   lep:Activity         rdfs:subClassOf prov:Activity
//   lep:Impact           rdfs:subClassOf lep:Activity
//   aw:Event             rdfs:subClassOf lep:Activity
//   aw:WindowEvent / aw:EditorEvent / aw:BrowserEvent / aw:AFKEvent
//   aw:Bucket            (prov:Collection of aw:Event)
//
//   Properties:
//   time:hasBeginning   (xsd:dateTime)
//   time:hasEnd         (xsd:dateTime)
//   lep:durationSeconds (xsd:decimal)
//   lep:activityLabel   (xsd:string)
//   aw:bucketType, aw:app, aw:title, aw:url, aw:file, aw:project,
//   aw:language, aw:editor, aw:status
//   prov:wasDerivedFrom (impact ← aw:Event)

func writeTurtle(w io.Writer, p processed) {
	fmt.Fprintln(w, `@prefix lep:  <https://leptum.app/ns#> .`)
	fmt.Fprintln(w, `@prefix aw:   <https://activitywatch.net/ns#> .`)
	fmt.Fprintln(w, `@prefix prov: <http://www.w3.org/ns/prov#> .`)
	fmt.Fprintln(w, `@prefix time: <http://www.w3.org/2006/time#> .`)
	fmt.Fprintln(w, `@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .`)
	fmt.Fprintln(w, `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .`)
	fmt.Fprintln(w)

	// Bucket nodes
	for _, b := range p.data.Buckets {
		fmt.Fprintf(w, "aw:bucket-%s a aw:Bucket ;\n", safeID(b.ID))
		fmt.Fprintf(w, "    aw:bucketType %q ;\n", b.Type)
		fmt.Fprintf(w, "    lep:eventCount %d .\n\n", b.EventCount)
	}

	// Events
	for _, e := range p.data.Events {
		class := "aw:Event"
		switch e.BucketType {
		case "window":
			class = "aw:WindowEvent"
		case "editor":
			class = "aw:EditorEvent"
		case "browser":
			class = "aw:BrowserEvent"
		case "afkstatus":
			class = "aw:AFKEvent"
		}
		start := time.UnixMilli(e.Timestamp).UTC().Format(time.RFC3339)
		end := time.UnixMilli(e.Timestamp + int64(e.Duration*1000)).UTC().Format(time.RFC3339)
		fmt.Fprintf(w, "aw:event-%s a %s, lep:Activity, prov:Activity ;\n", e.ID, class)
		fmt.Fprintf(w, "    prov:wasDerivedFrom aw:bucket-%s ;\n", safeID(e.BucketID))
		fmt.Fprintf(w, "    aw:bucketType %q ;\n", e.BucketType)
		fmt.Fprintf(w, "    lep:activityLabel %q ;\n", e.DisplayName)
		fmt.Fprintf(w, "    time:hasBeginning %q^^xsd:dateTime ;\n", start)
		fmt.Fprintf(w, "    time:hasEnd %q^^xsd:dateTime ;\n", end)
		fmt.Fprintf(w, "    lep:durationSeconds \"%.3f\"^^xsd:decimal", e.Duration)
		for _, k := range []string{"app", "title", "url", "file", "project", "language", "editor", "status"} {
			if v := dataStr(e.EventData, k); v != "" {
				fmt.Fprintf(w, " ;\n    aw:%s %q", k, v)
			}
		}
		fmt.Fprintln(w, " .")
		fmt.Fprintln(w)
	}
}

func safeID(s string) string {
	r := strings.NewReplacer(".", "-", "_", "-", ":", "-", "/", "-", " ", "-")
	return r.Replace(s)
}

// ---------- main ----------

func main() {
	in := flag.String("in", "", "input ActivityWatch JSON (default stdin)")
	out := flag.String("out", "", "output file (default stdout)")
	mode := flag.String("mode", "leptum", "leptum | impacts | rdf")
	minDur := flag.Float64("min-duration", 60, "minimum event duration in seconds")
	skipAFK := flag.Bool("skip-afk", false, "drop AFK events from output")
	flag.Parse()

	var raw []byte
	var err error
	if *in == "" {
		raw, err = io.ReadAll(os.Stdin)
	} else {
		raw, err = os.ReadFile(*in)
	}
	if err != nil {
		fail("read input: %v", err)
	}

	var aw awExport
	if err := json.Unmarshal(raw, &aw); err != nil {
		fail("parse AW JSON: %v", err)
	}

	p := process(aw, *minDur, *skipAFK)

	var w io.Writer = os.Stdout
	if *out != "" {
		f, err := os.Create(*out)
		if err != nil {
			fail("open output: %v", err)
		}
		defer f.Close()
		w = f
	}

	switch *mode {
	case "leptum":
		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		if err := enc.Encode(p.data); err != nil {
			fail("encode: %v", err)
		}
	case "impacts":
		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		if err := enc.Encode(toImpacts(p)); err != nil {
			fail("encode: %v", err)
		}
	case "rdf":
		writeTurtle(w, p)
	default:
		fail("unknown mode %q", *mode)
	}
}

func fail(f string, a ...interface{}) {
	fmt.Fprintf(os.Stderr, "aw-converter: "+f+"\n", a...)
	os.Exit(1)
}
