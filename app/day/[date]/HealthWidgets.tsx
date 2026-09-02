"use client";

import { useState, useCallback, useEffect } from "react";

// ─── Sleep Tracker ───────────────────────────────────────────────────────────

interface SleepData {
  bedtime: string;
  wakeTime: string;
}

function loadSleep(date: string): SleepData {
  if (typeof window === "undefined") return { bedtime: "", wakeTime: "" };
  try {
    const saved = localStorage.getItem(`dayview-sleep-${date}`);
    return saved ? JSON.parse(saved) as SleepData : { bedtime: "", wakeTime: "" };
  } catch { return { bedtime: "", wakeTime: "" }; }
}

function loadSleepHistory(date: string): Array<{ date: string; hours: number }> {
  const hist: Array<{ date: string; hours: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hours = sleepDuration(loadSleep(key));
    if (hours !== null) hist.push({ date: key, hours });
  }
  return hist;
}

function sleepDuration(data: SleepData): number | null {
  if (!data.bedtime || !data.wakeTime) return null;
  const [bh, bm] = data.bedtime.split(":").map(Number);
  const [wh, wm] = data.wakeTime.split(":").map(Number);
  let bedMins = bh * 60 + bm;
  const wakeMins = wh * 60 + wm;
  if (bedMins > wakeMins) bedMins -= 24 * 60; // overnight
  return (wakeMins - bedMins) / 60;
}

export function SleepTracker({ date }: { date: string }) {
  // Deterministic defaults for SSR; persisted state is loaded after hydration.
  const [data, setData] = useState<SleepData>({ bedtime: "", wakeTime: "" });
  const [history, setHistory] = useState<Array<{ date: string; hours: number }>>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setData(loadSleep(date));
      setHistory(loadSleepHistory(date));
    });
  }, [date]);

  const update = useCallback((field: keyof SleepData, value: string) => {
    setData(prev => {
      const next = { ...prev, [field]: value };
      localStorage.setItem(`dayview-sleep-${date}`, JSON.stringify(next));
      return next;
    });
  }, [date]);

  const hours = sleepDuration(data);
  const qualityColor = hours === null ? "text-muted-foreground" : hours < 6 ? "text-red-400" : hours < 7 ? "text-yellow-400" : hours <= 9 ? "text-green-400" : "text-yellow-400";
  const maxHist = Math.max(...history.map(h => h.hours), 10);

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Sleep</h2>
      <div className="flex gap-3 mb-2">
        <label className="flex-1">
          <span className="text-xs text-muted-foreground">Bed</span>
          <input type="time" value={data.bedtime} onChange={e => update("bedtime", e.target.value)} className="w-full bg-muted rounded px-2 py-1 text-sm" />
        </label>
        <label className="flex-1">
          <span className="text-xs text-muted-foreground">Wake</span>
          <input type="time" value={data.wakeTime} onChange={e => update("wakeTime", e.target.value)} className="w-full bg-muted rounded px-2 py-1 text-sm" />
        </label>
      </div>
      {hours !== null && (
        <div className={`text-lg font-semibold ${qualityColor}`}>{hours.toFixed(1)}h sleep</div>
      )}
      {history.length > 0 && (
        <div className="flex items-end gap-1 mt-2 h-8">
          {history.map(h => (
            <div key={h.date} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-blue-400/40 rounded-t" style={{ height: `${(h.hours / maxHist) * 100}%` }} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Water Intake ────────────────────────────────────────────────────────────

export function WaterIntake({ date }: { date: string }) {
  // Deterministic default for SSR; persisted state is loaded after hydration.
  const [glasses, setGlasses] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setGlasses(Number(localStorage.getItem(`dayview-water-${date}`)) || 0);
      } catch {
        setGlasses(0);
      }
    });
  }, [date]);

  const toggle = (idx: number) => {
    const next = glasses === idx + 1 ? idx : idx + 1;
    setGlasses(next);
    localStorage.setItem(`dayview-water-${date}`, String(next));
  };

  const pct = Math.round((glasses / 8) * 100);

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">Water</h2>
        <span className={`text-xs font-medium ${pct >= 100 ? "text-blue-400" : "text-muted-foreground"}`}>{pct}%</span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 8 }, (_, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            aria-label={`Cup ${i + 1}${i < glasses ? " (filled)" : ""}`}
            className={`w-9 h-9 rounded text-xl leading-none flex items-center justify-center transition-opacity ${
              i < glasses ? "opacity-100" : "opacity-30 hover:opacity-60"
            }`}
          >
            🥛
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Movement Tracker ────────────────────────────────────────────────────────

interface MovementEntry {
  type: string;
  minutes: number;
  time: number;
}

export function MoveTracker({ date }: { date: string }) {
  // Deterministic default for SSR; persisted state is loaded after hydration.
  const [entries, setEntries] = useState<MovementEntry[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(`dayview-movement-${date}`);
        setEntries(saved ? JSON.parse(saved) as MovementEntry[] : []);
      } catch {
        setEntries([]);
      }
    });
  }, [date]);

  const activities = ["Walk", "Stretch", "Workout", "Bike"];
  const durations = [15, 30, 45, 60];
  const [selectedType, setSelectedType] = useState("Walk");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showPicker, setShowPicker] = useState(false);

  const totalMins = entries.reduce((s, e) => s + e.minutes, 0);
  const color = totalMins >= 30 ? "text-green-400" : totalMins > 0 ? "text-yellow-400" : "text-red-400";

  const add = () => {
    const entry: MovementEntry = { type: selectedType, minutes: selectedDuration, time: Date.now() };
    const next = [...entries, entry];
    setEntries(next);
    localStorage.setItem(`dayview-movement-${date}`, JSON.stringify(next));
    setShowPicker(false);
  };

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">Movement</h2>
        <span className={`text-sm font-semibold ${color}`}>{totalMins}m</span>
      </div>
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entries.map((e, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">
              {e.type} {e.minutes}m
            </span>
          ))}
        </div>
      )}
      {showPicker ? (
        <div className="space-y-2">
          <div className="flex gap-1">
            {activities.map(a => (
              <button key={a} onClick={() => setSelectedType(a)} className={`text-xs px-2 py-1 rounded ${selectedType === a ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {durations.map(d => (
              <button key={d} onClick={() => setSelectedDuration(d)} className={`text-xs px-2 py-1 rounded ${selectedDuration === d ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                {d}m
              </button>
            ))}
          </div>
          <button onClick={add} className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded hover:bg-green-500/30 transition-colors">
            Add {selectedType} ({selectedDuration}m)
          </button>
        </div>
      ) : (
        <button onClick={() => setShowPicker(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          + Log movement
        </button>
      )}
    </section>
  );
}
