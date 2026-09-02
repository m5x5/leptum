"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuickNotes } from "../../../utils/useQuickNotes";
import { Button } from "../../../components/ui/button";

// ─── Moment Rating (-5..+5, posts to daily notes; can be submitted repeatedly) ──

export function DayRating({ date }: { date: string }) {
  const { notes, addNote } = useQuickNotes();
  const [busy, setBusy] = useState(false);

  const todayRatings = notes
    .filter((n) => {
      if (typeof n.text !== "string") return false;
      const m = n.text.match(/^rating:\s*(-?\d+)/i);
      if (!m) return false;
      const d = new Date(n.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return key === date;
    })
    .sort((a, b) => a.createdAt - b.createdAt);

  const colorFor = (v: number) =>
    v >= 3 ? "text-green-500" : v >= 1 ? "text-green-400" : v === 0 ? "text-muted-foreground" : v >= -2 ? "text-orange-400" : "text-red-400";

  const submit = async (value: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await addNote({ text: `rating: ${value > 0 ? `+${value}` : value}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">How are you feeling right now?</h2>
      <div className="flex flex-wrap gap-1 mb-2">
        {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => (
          <Button
            key={v}
            variant="outline"
            size="sm"
            onClick={() => submit(v)}
            disabled={busy}
            className={`min-w-[2rem] ${colorFor(v)}`}
            title={`Submit rating ${v > 0 ? `+${v}` : v}`}
          >
            {v > 0 ? `+${v}` : v}
          </Button>
        ))}
      </div>
      {todayRatings.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {todayRatings.map((n) => {
            const m = (n.text ?? "").match(/^rating:\s*(-?\d+)/i);
            const v = m ? Number(m[1]) : 0;
            const time = new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <span key={n.id} className={colorFor(v)}>
                {time}: {v > 0 ? `+${v}` : v}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Daily Wins ──────────────────────────────────────────────────────────────

interface Win {
  text: string;
  category: "productivity" | "health" | "social" | "learning";
}

export function WinsList({ date }: { date: string }) {
  const [wins, setWins] = useState<Win[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`dayview-wins-${date}`);
      return saved ? JSON.parse(saved) as Win[] : [];
    } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Win["category"]>("productivity");

  const save = useCallback((next: Win[]) => {
    setWins(next);
    localStorage.setItem(`dayview-wins-${date}`, JSON.stringify(next));
  }, [date]);

  const addWin = () => {
    if (!text.trim()) return;
    save([...wins, { text: text.trim(), category }]);
    setText("");
    setAdding(false);
  };

  // Count wins this week
  const weekWins = (() => {
    let count = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date + "T12:00:00");
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      try {
        const saved = localStorage.getItem(`dayview-wins-${key}`);
        if (saved) count += (JSON.parse(saved) as Win[]).length;
      } catch { /* ignore */ }
    }
    return count;
  })();

  const categoryColors: Record<Win["category"], string> = {
    productivity: "bg-blue-500/15 text-blue-400",
    health: "bg-green-500/15 text-green-400",
    social: "bg-purple-500/15 text-purple-400",
    learning: "bg-yellow-500/15 text-yellow-400",
  };

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">Daily Wins</h2>
        <span className="text-xs text-muted-foreground">{weekWins} this week</span>
      </div>
      {wins.map((w, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <span className="text-green-400 shrink-0">✓</span>
          <span className="text-sm flex-1">{w.text}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[w.category]}`}>{w.category}</span>
        </div>
      ))}
      {adding ? (
        <div className="mt-2 space-y-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addWin()}
            placeholder="What went well?"
            className="w-full bg-muted rounded px-2 py-1.5 text-sm"
            autoFocus
          />
          <div className="flex gap-1">
            {(Object.keys(categoryColors) as Win["category"][]).map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`text-xs px-2 py-0.5 rounded ${category === c ? categoryColors[c] : "bg-muted text-muted-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addWin} className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded hover:bg-green-500/30">Add</button>
            <button onClick={() => setAdding(false)} className="text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors">
          + Add a win
        </button>
      )}
    </section>
  );
}

// ─── Gratitude Log ───────────────────────────────────────────────────────────

export function GratitudeLog({ date }: { date: string }) {
  const [items, setItems] = useState<[string, string, string]>(() => {
    if (typeof window === "undefined") return ["", "", ""];
    try {
      const saved = localStorage.getItem(`dayview-gratitude-${date}`);
      return saved ? JSON.parse(saved) as [string, string, string] : ["", "", ""];
    } catch { return ["", "", ""]; }
  });

  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const update = (idx: number, val: string) => {
    setItems(prev => {
      const next: [string, string, string] = [...prev] as [string, string, string];
      next[idx] = val;
      if (debounceRef[0]) clearTimeout(debounceRef[0]);
      debounceRef[0] = setTimeout(() => {
        localStorage.setItem(`dayview-gratitude-${date}`, JSON.stringify(next));
      }, 500);
      return next;
    });
  };

  // Count days this month with gratitude
  const monthCount = (() => {
    let count = 0;
    const now = new Date(date + "T12:00:00");
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      try {
        const saved = localStorage.getItem(`dayview-gratitude-${key}`);
        if (saved) {
          const arr = JSON.parse(saved) as string[];
          if (arr.some(s => s.trim().length > 0)) count++;
        }
      } catch { /* ignore */ }
    }
    return count;
  })();

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase">Gratitude</h2>
        <span className="text-xs text-muted-foreground">{monthCount} days this month</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <input
            key={i}
            value={item}
            onChange={e => update(i, e.target.value)}
            placeholder={`I'm grateful for...`}
            className="w-full bg-muted rounded px-2 py-1.5 text-sm placeholder:text-muted-foreground/50"
          />
        ))}
      </div>
    </section>
  );
}

// ─── Daily Reflection ────────────────────────────────────────────────────────

export function DailyReflection({ date }: { date: string }) {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<{ well: string; challenge: string; different: string }>(() => {
    if (typeof window === "undefined") return { well: "", challenge: "", different: "" };
    try {
      const saved = localStorage.getItem(`dayview-reflection-${date}`);
      return saved ? JSON.parse(saved) as { well: string; challenge: string; different: string } : { well: "", challenge: "", different: "" };
    } catch { return { well: "", challenge: "", different: "" }; }
  });

  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const update = (field: keyof typeof data, val: string) => {
    setData(prev => {
      const next = { ...prev, [field]: val };
      if (debounceRef[0]) clearTimeout(debounceRef[0]);
      debounceRef[0] = setTimeout(() => {
        localStorage.setItem(`dayview-reflection-${date}`, JSON.stringify(next));
      }, 500);
      return next;
    });
  };

  // Only auto-show after 6pm on current day (or if there's already saved data)
  const autoShownRef = useRef(false);
  useEffect(() => {
    const isToday = date === new Date().toISOString().slice(0, 10);
    const shouldShow = (isToday && new Date().getHours() >= 18) || !!(data.well || data.challenge || data.different);
    if (autoShownRef.current || !shouldShow) return;
    autoShownRef.current = true;
    setShow(true);
  }, [date, data.well, data.challenge, data.different]);

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="w-full bg-card border border-border rounded-card p-3 text-center hover:bg-muted/50 transition-colors">
        <span className="text-xs text-muted-foreground">📝 Open daily reflection</span>
      </button>
    );
  }

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Evening Reflection</h2>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-green-400">What went well today?</span>
          <textarea value={data.well} onChange={e => update("well", e.target.value)} className="w-full bg-muted rounded px-2 py-1.5 text-sm mt-0.5 resize-none" rows={2} />
        </label>
        <label className="block">
          <span className="text-xs text-orange-400">What was challenging?</span>
          <textarea value={data.challenge} onChange={e => update("challenge", e.target.value)} className="w-full bg-muted rounded px-2 py-1.5 text-sm mt-0.5 resize-none" rows={2} />
        </label>
        <label className="block">
          <span className="text-xs text-blue-400">One thing to do differently tomorrow?</span>
          <textarea value={data.different} onChange={e => update("different", e.target.value)} className="w-full bg-muted rounded px-2 py-1.5 text-sm mt-0.5 resize-none" rows={2} />
        </label>
      </div>
    </section>
  );
}
