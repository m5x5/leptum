"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import type { Goal, Routine, StandaloneTask, Impact } from "../../../lib/remoteStorage";
import { Button } from "../../../components/ui/button";
import { PauseIcon, PlayIcon, RewindIcon } from "@heroicons/react/solid";
import { useNow } from "../../../hooks/useNow";

// ─── Time Awareness Bar ──────────────────────────────────────────────────────

export function TimeAwarenessBar({ date }: { date: string }) {
  const [now, setNow] = useState(() => Date.now());
  const isToday = date === new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [isToday]);

  if (!isToday) return null;

  const wakingStart = new Date();
  wakingStart.setHours(7, 0, 0, 0);
  const wakingEnd = new Date();
  wakingEnd.setHours(23, 0, 0, 0);

  const totalWaking = wakingEnd.getTime() - wakingStart.getTime();
  const elapsed = Math.max(0, Math.min(now - wakingStart.getTime(), totalWaking));
  const pct = (elapsed / totalWaking) * 100;
  const hoursLeft = Math.max(0, (totalWaking - elapsed) / 3600000);
  const minsLeft = Math.round((hoursLeft % 1) * 60);
  const fullHours = Math.floor(hoursLeft);

  const barColor = pct > 80 ? "from-red-500 to-orange-500" : pct > 50 ? "from-yellow-500 to-orange-500" : "from-green-500 to-blue-500";

  return (
    <div className="bg-card border border-border rounded-card p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">Day Progress</span>
        <span className={`text-sm font-semibold ${pct > 80 ? "text-red-400" : pct > 50 ? "text-yellow-400" : "text-green-400"}`}>
          {fullHours}h {minsLeft}m left
        </span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-white/80 shadow-sm" style={{ left: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>7:00</span>
        <span>12:00</span>
        <span>17:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

// ─── Focus Timer (Pomodoro) ──────────────────────────────────────────────────

interface TimerState {
  mode: "work" | "break";
  remaining: number;
  running: boolean;
  sessionsCompleted: number;
}

const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

const DEFAULT_TIMER_STATE: TimerState = { mode: "work", remaining: WORK_DURATION, running: false, sessionsCompleted: 0 };

function loadTimerState(date: string): TimerState {
  if (typeof window === "undefined") return DEFAULT_TIMER_STATE;
  try {
    const saved = localStorage.getItem(`dayview-timer-${date}`);
    if (saved) return JSON.parse(saved) as TimerState;
  } catch { /* ignore */ }
  return DEFAULT_TIMER_STATE;
}

export function FocusTimer({ date, className = "" }: { date: string; className?: string }) {
  // Deterministic default for SSR; persisted state is loaded after hydration.
  const [state, setState] = useState<TimerState>(DEFAULT_TIMER_STATE);
  const [celebrating, setCelebrating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latest state for the interval tick, so side effects can run outside a setState updater.
  const stateRef = useRef<TimerState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    queueMicrotask(() => setState(loadTimerState(date)));
  }, [date]);

  const saveState = useCallback((s: TimerState) => {
    localStorage.setItem(`dayview-timer-${date}`, JSON.stringify(s));
  }, [date]);

  useEffect(() => {
    if (!state.running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const prev = stateRef.current;
      let next: TimerState;
      if (prev.remaining <= 1) {
        next = prev.mode === "work"
          ? { mode: "break", remaining: BREAK_DURATION, running: true, sessionsCompleted: prev.sessionsCompleted + 1 }
          : { mode: "work", remaining: WORK_DURATION, running: false, sessionsCompleted: prev.sessionsCompleted };
        stateRef.current = next;
        setState(next);
        saveState(next);
        if (prev.mode === "work") setCelebrating(true);
        return;
      }
      next = { ...prev, remaining: prev.remaining - 1 };
      stateRef.current = next;
      setState(next);
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.running, saveState]);

  useEffect(() => {
    if (celebrating) {
      const t = setTimeout(() => setCelebrating(false), 3000);
      return () => clearTimeout(t);
    }
  }, [celebrating]);

  const toggle = () => {
    const next = { ...state, running: !state.running };
    setState(next);
    saveState(next);
  };

  const reset = () => {
    const next: TimerState = { mode: "work", remaining: WORK_DURATION, running: false, sessionsCompleted: state.sessionsCompleted };
    setState(next);
    saveState(next);
  };

  const mins = Math.floor(state.remaining / 60);
  const secs = state.remaining % 60;
  const totalDuration = state.mode === "work" ? WORK_DURATION : BREAK_DURATION;
  const pct = ((totalDuration - state.remaining) / totalDuration) * 100;
  return (
    <section className={`border border-border rounded-card p-5 relative overflow-hidden bg-transparent ${className}`}>
      {celebrating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 animate-pulse">
          <div className="text-4xl">🎉 Session complete!</div>
        </div>
      )}
      <div className="text-left">
        <div className="text-xs mb-1 text-muted-foreground">{state.mode === "work" ? "Focus time" : "Break"}</div>
        <div className="text-4xl font-semibold tabular-nums text-foreground">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3 mb-3">
          <div
            className={`h-full rounded-full transition-all ${state.mode === "work" ? "bg-foreground" : "bg-green-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-2 justify-start">
          <Button onClick={toggle} variant={state.running ? "destructive" : "default"} size="sm" className="min-h-8 px-3 py-1 text-xs gap-1.5">
            {state.running ? <PauseIcon className="h-3 w-3" aria-hidden="true" /> : <PlayIcon className="h-3 w-3" aria-hidden="true" />}
            {state.running ? "Pause" : "Start"}
          </Button>
          {(state.running || state.remaining !== totalDuration) && (
            <Button onClick={reset} variant="outline" size="sm" className="min-h-8 px-3 py-1 text-xs gap-1.5">
              <RewindIcon className="h-3 w-3" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>
        {state.sessionsCompleted > 0 && (
          <div className="text-xs text-muted-foreground mt-2">
            {state.sessionsCompleted} session{state.sessionsCompleted !== 1 ? "s" : ""} completed today
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Next Action Suggestion ──────────────────────────────────────────────────

export function NextActionSuggestion({
  goals,
  routines,
  tasks,
  dayCompletions,
  date,
}: {
  goals: Goal[];
  routines: Routine[];
  tasks: StandaloneTask[];
  dayCompletions: Array<{ routineId: string }>;
  date: string;
}) {
  const isToday = date === new Date().toISOString().slice(0, 10);
  const now = useNow();

  const suggestion = useMemo(() => {
    if (!isToday) return null;

    // 1. Urgent goals first
    const urgentGoal = goals.find(g =>
      g.status !== "completed" && g.status !== "archived" &&
      g.targetDate && g.targetDate > 0 &&
      (g.targetDate - now) / 3600000 < 48
    );
    if (urgentGoal) return { text: `Work on "${urgentGoal.name}" — deadline approaching!`, type: "urgent" as const };

    // 2. Uncompleted routines
    const completedIds = new Set(dayCompletions.map(c => c.routineId));
    const pendingRoutine = routines.find(r => !completedIds.has(r.id));
    if (pendingRoutine) return { text: `Complete routine: "${pendingRoutine.name}"`, type: "routine" as const };

    // 3. Pending tasks
    const pendingTask = tasks.find(t => !t.completedAt);
    if (pendingTask) return { text: `Do task: "${pendingTask.name}"`, type: "task" as const };

    // 4. Active goals
    const activeGoal = goals.find(g => g.status !== "completed" && g.status !== "archived");
    if (activeGoal) return { text: `Make progress on "${activeGoal.name}"`, type: "goal" as const };

    return null;
  }, [isToday, goals, routines, tasks, dayCompletions, now]);

  if (!suggestion) return null;

  const colors = {
    urgent: "bg-red-500/10 border-red-500/20 text-red-400",
    routine: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    task: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    goal: "bg-green-500/10 border-green-500/20 text-green-400",
  };

  return (
    <div className={`border rounded-card p-4 ${colors[suggestion.type]}`}>
      <div className="text-xs mb-1 text-muted-foreground">What to do next</div>
      <div className="text-sm font-medium">{suggestion.text}</div>
    </div>
  );
}

// ─── Quick Wins ──────────────────────────────────────────────────────────────

export function QuickWins({
  routines,
  tasks,
  dayCompletions,
  date,
}: {
  routines: Routine[];
  tasks: StandaloneTask[];
  dayCompletions: Array<{ routineId: string }>;
  date: string;
}) {
  const isToday = date === new Date().toISOString().slice(0, 10);

  // Deterministic default for SSR; persisted state is loaded after hydration.
  const [completed, setCompleted] = useState<Set<string>>(() => new Set<string>());

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(`dayview-quickwins-${date}`);
        setCompleted(saved ? new Set(JSON.parse(saved) as string[]) : new Set<string>());
      } catch {
        setCompleted(new Set<string>());
      }
    });
  }, [date]);

  const quickWins = useMemo(() => {
    const wins: Array<{ id: string; text: string; type: "routine" | "task" }> = [];
    const completedIds = new Set(dayCompletions.map(c => c.routineId));

    for (const r of routines) {
      if (!completedIds.has(r.id) && wins.length < 3) {
        wins.push({ id: `r-${r.id}`, text: r.name, type: "routine" });
      }
    }

    for (const t of tasks) {
      if (!t.completedAt && wins.length < 3) {
        wins.push({ id: `t-${t.id}`, text: t.name, type: "task" });
      }
    }

    return wins;
  }, [routines, tasks, dayCompletions]);

  if (!isToday) return null;

  const markDone = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(`dayview-quickwins-${date}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  if (quickWins.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <h2 className="text-xs font-semibold text-muted-foreground mb-3">Quick Wins (5 min each)</h2>
      <div className="space-y-2">
        {quickWins.map(w => (
          <div key={w.id} className={`flex items-center gap-2 text-sm ${completed.has(w.id) ? "line-through text-muted-foreground" : ""}`}>
            <button
              onClick={() => markDone(w.id)}
              disabled={completed.has(w.id)}
              className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-colors ${
                completed.has(w.id)
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-muted-foreground hover:border-green-400"
              }`}
            >
              {completed.has(w.id) && <span className="text-xs">✓</span>}
            </button>
            <span>{w.text}</span>
            <span className="text-xs text-muted-foreground ml-auto">{w.type}</span>
          </div>
        ))}
      </div>
      {completed.size > 0 && (
        <div className="text-xs text-green-400 mt-2">{completed.size} quick win{completed.size !== 1 ? "s" : ""} done!</div>
      )}
    </section>
  );
}

// ─── Accountability Check-in ─────────────────────────────────────────────────

export function AccountabilityCheckin({
  impacts,
  date,
}: {
  impacts: Impact[];
  date: string;
}) {
  const isToday = date === new Date().toISOString().slice(0, 10);
  const [dismissed, setDismissed] = useState(false);
  const now = useNow();

  const shouldShow = useMemo(() => {
    if (!isToday || dismissed) return false;
    const hour = new Date().getHours();
    if (hour < 9) return false; // Too early

    // Check if any activity logged in last 2 hours — use the activity's end
    // (or its start, for instant logs with no duration) so a long activity
    // that only just finished still counts as recent.
    const twoHoursAgo = now - 2 * 3600000;
    const recentActivity = impacts.some(i => (i.endTime ?? i.date) >= twoHoursAgo);
    return !recentActivity && impacts.length > 0; // Only show if they've logged SOMETHING today
  }, [isToday, dismissed, impacts, now]);

  if (!shouldShow) return null;

  return (
    <div className="border border-border rounded-card p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">👋</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Hey, what have you been up to?</p>
          <p className="text-xs text-muted-foreground mt-1">No activity logged in the last 2 hours. Even a small log helps!</p>
          <button onClick={() => setDismissed(true)} className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

