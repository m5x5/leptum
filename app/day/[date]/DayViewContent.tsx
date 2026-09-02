"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { remoteStorageClient } from "../../../lib/remoteStorage";
import type { Impact, Goal, GoalType, Routine, StandaloneTask, DailyHealthData } from "../../../lib/remoteStorage";
import { useGoals } from "../../../utils/useGoals";
import { useGoalTypes } from "../../../utils/useGoalTypes";
import { useRoutineCompletions } from "../../../utils/useRoutineCompletions";
import { useQuickNotes } from "../../../utils/useQuickNotes";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  LightBulbIcon,
  FlagIcon,
  SparklesIcon,
} from "@heroicons/react/outline";
import { FireIcon, PaperAirplaneIcon } from "@heroicons/react/solid";
import { NextActionSuggestion, QuickWins, AccountabilityCheckin } from "./ADHDFeatures";
import { WaterIntake } from "./HealthWidgets";
import { DayRating, WinsList, GratitudeLog, DailyReflection } from "./JournalReflection";
import { GoalProgress } from "./HabitChain";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import StandaloneTaskItem from "../../../components/Tasks/StandaloneItem";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AIInsight {
  type: "critical" | "warning" | "good" | "info";
  text: string;
}

interface AIAction {
  text: string;
  why: string;
}

interface AIDayInsights {
  insights: AIInsight[];
  actions: AIAction[];
  summary?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function isToday(dateStr: string): boolean {
  return dateStr === toDateKey(Date.now());
}

function getAdjacentDate(dateStr: string, offset: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return toDateKey(d.getTime());
}

function getWakingWindow(date: string, startHour: number, endHour: number) {
  const start = new Date(date + "T00:00:00");
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(date + "T00:00:00");
  end.setHours(endHour, 0, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
}

function formatHour(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  return String(normalized).padStart(2, "0");
}

function parseHour(value: string) {
  const hour = Number(value.split(":")[0]);
  return Number.isFinite(hour) ? hour : 0;
}

// ─── Score calculation ──────────────────────────────────────────────────────

interface DimensionScore {
  label: string;
  score: number;
  color: string;
  detail: string;
}

function computeProductivityScore(trackedMinutes: number, routinesDone: number, totalRoutines: number, tasksCompleted: number): DimensionScore {
  let score = 0;
  if (trackedMinutes >= 240) score += 4;
  else if (trackedMinutes >= 120) score += 3;
  else if (trackedMinutes >= 60) score += 2;
  else if (trackedMinutes > 0) score += 1;

  if (totalRoutines > 0) {
    const pct = routinesDone / totalRoutines;
    if (pct >= 0.8) score += 3;
    else if (pct >= 0.5) score += 2;
    else if (pct > 0) score += 1;
  }

  if (tasksCompleted >= 5) score += 3;
  else if (tasksCompleted >= 3) score += 2;
  else if (tasksCompleted >= 1) score += 1;

  const detail = `${formatMinutes(trackedMinutes)} tracked, ${routinesDone}/${totalRoutines} routines, ${tasksCompleted} tasks`;
  return { label: "Output", score, color: score >= 7 ? "text-green-400" : score >= 4 ? "text-yellow-400" : "text-red-400", detail };
}

function computeMoodScore(dayImpacts: Impact[]): DimensionScore {
  const moods = dayImpacts.filter(i => typeof i.energy === "number" || typeof i.fulfillment === "number" || typeof i.stress === "number");
  if (moods.length === 0) return { label: "Mood", score: -1, color: "text-muted-foreground", detail: "No mood data logged" };

  let total = 0;
  let count = 0;
  for (const m of moods) {
    if (typeof m.energy === "number") { total += m.energy; count++; }
    if (typeof m.fulfillment === "number") { total += m.fulfillment; count++; }
    if (typeof m.stress === "number") { total += (10 - m.stress); count++; }
    if (typeof m.focus === "number") { total += m.focus; count++; }
    if (typeof m.happiness === "number") { total += m.happiness; count++; }
  }
  const avg = count > 0 ? Math.round(total / count) : 0;
  return { label: "Mood", score: avg, color: avg >= 7 ? "text-green-400" : avg >= 4 ? "text-yellow-400" : "text-red-400", detail: `Avg from ${moods.length} entries` };
}

function computeHabitScore(routinesDone: number, totalRoutines: number): DimensionScore {
  if (totalRoutines === 0) return { label: "Habits", score: -1, color: "text-muted-foreground", detail: "No routines scheduled" };
  const pct = routinesDone / totalRoutines;
  const score = Math.round(pct * 10);
  return { label: "Habits", score, color: score >= 7 ? "text-green-400" : score >= 4 ? "text-yellow-400" : "text-red-400", detail: `${routinesDone}/${totalRoutines} completed` };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DayViewContent({ date: initialDate }: { date: string }) {
  const [date, setDate] = useState(initialDate);
  const [lens, setLens] = useState<Lens>("overview");
  const [sidebarFocus, setSidebarFocus] = useState<"none" | "lens" | "dates">("none");
  const [allImpacts, setAllImpacts] = useState<Impact[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [tasks, setTasks] = useState<StandaloneTask[]>([]);
  const [healthData, setHealthData] = useState<DailyHealthData[]>([]);
  const [wakingHours, setWakingHours] = useState({ startHour: 7, endHour: 1 });
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIDayInsights | null>(null);
  // Dismiss entries: { goalId: string, until: number | null } — null = forever
  // Deterministic default for SSR; persisted dismissals are loaded (and
  // expired ones pruned) after hydration.
  const [dismissedGoals, setDismissedGoals] = useState<Map<string, number | null>>(() => new Map());

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("dayview-dismissed-goals") || "[]") as Array<{ goalId: string; until: number | null }>;
        const now = Date.now();
        // Filter out expired dismissals
        const active = stored.filter(d => d.until === null || d.until > now);
        if (active.length !== stored.length) {
          localStorage.setItem("dayview-dismissed-goals", JSON.stringify(active));
        }
        setDismissedGoals(new Map(active.map(d => [d.goalId, d.until])));
      } catch {
        setDismissedGoals(new Map());
      }
    });
  }, []);
  const [dismissMenuGoalId, setDismissMenuGoalId] = useState<string | null>(null);
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(new Set());

  const { goals, isLoading: goalsLoading } = useGoals();
  const { goalTypes } = useGoalTypes();
  const { completions, getCompletionsForDateRange, loading: completionsLoading } = useRoutineCompletions();

  // Listen for AI insights pushed via WebMCP
  useEffect(() => {
    const handler = (e: CustomEvent<AIDayInsights>) => {
      setAiInsights(e.detail);
    };
    window.addEventListener("dayview:insights" as string, handler as EventListener);
    return () => window.removeEventListener("dayview:insights" as string, handler as EventListener);
  }, []);

  // Listen for event dismissals via WebMCP
  useEffect(() => {
    const handler = (e: CustomEvent<{ eventId: string }>) => {
      setDismissedEventIds(prev => {
        const next = new Set(Array.from(prev));
        next.add(e.detail.eventId);
        return next;
      });
    };
    window.addEventListener("dayview:event-dismissed" as string, handler as EventListener);
    return () => window.removeEventListener("dayview:event-dismissed" as string, handler as EventListener);
  }, []);

  // Listen for goal dismissals from WebMCP
  useEffect(() => {
    const handler = (e: CustomEvent<{ goalId: string }>) => {
      dismissGoal(e.detail.goalId, null);
    };
    window.addEventListener("dayview:goal-dismissed" as string, handler as EventListener);
    return () => window.removeEventListener("dayview:goal-dismissed" as string, handler as EventListener);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissGoal = useCallback((goalId: string, until: number | null) => {
    setDismissedGoals(prev => {
      const next = new Map(Array.from(prev.entries()));
      next.set(goalId, until);
      const serialized = Array.from(next.entries()).map(([id, u]) => ({ goalId: id, until: u }));
      localStorage.setItem("dayview-dismissed-goals", JSON.stringify(serialized));
      return next;
    });
    setDismissMenuGoalId(null);
  }, []);

  const undismissGoal = useCallback((goalId: string) => {
    setDismissedGoals(prev => {
      const next = new Map(Array.from(prev.entries()));
      next.delete(goalId);
      const serialized = Array.from(next.entries()).map(([id, u]) => ({ goalId: id, until: u }));
      localStorage.setItem("dayview-dismissed-goals", JSON.stringify(serialized));
      return next;
    });
  }, []);

  // Load all data
  useEffect(() => {
    const load = async () => {
      try {
        const [impactsData, routinesData, tasksData, healthResult, settings] = await Promise.all([
          remoteStorageClient.getImpacts(),
          remoteStorageClient.getRoutines(),
          remoteStorageClient.getStandaloneTasks(),
          remoteStorageClient.getHealthData(),
          remoteStorageClient.getUserSettings().catch(() => ({} as { wakingStartHour?: number | null; wakingEndHour?: number | null })),
        ]);
        setAllImpacts(impactsData);
        setRoutines(routinesData);
        setTasks(tasksData);
        setHealthData(healthResult);
        const defaults = {
          startHour: settings.wakingStartHour ?? 7,
          endHour: settings.wakingEndHour ?? 1,
        };
        const override = typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem(`dayview-waking-hours-${date}`) || "null") as typeof defaults | null
          : null;
        setWakingHours(override ?? defaults);
      } catch (err) {
        console.error("Failed to load day view data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date]);

  // Filter data for this day
  const dayStart = useMemo(() => new Date(date + "T00:00:00").getTime(), [date]);
  const dayEnd = useMemo(() => new Date(date + "T23:59:59.999").getTime(), [date]);

  const dayImpacts = useMemo(() => {
    return allImpacts.filter(i => {
      if (i.allDay) return toDateKey(i.date) === date;
      return i.date >= dayStart && i.date <= dayEnd;
    }).sort((a, b) => a.date - b.date);
  }, [allImpacts, date, dayStart, dayEnd]);

  const allDayImpacts = useMemo(() => dayImpacts.filter(i => i.allDay && !dismissedEventIds.has(i.id ?? "")), [dayImpacts, dismissedEventIds]);
  const timedImpacts = useMemo(() => dayImpacts.filter(i => !i.allDay), [dayImpacts]);

  // Health data for current day and recent days
  const dayHealth = useMemo(() => healthData.find(d => d.date === date) ?? null, [healthData, date]);
  const recentHealth = useMemo(() => healthData.slice(0, 7), [healthData]);

  const dayCompletions = useMemo(() => getCompletionsForDateRange(dayStart, dayEnd), [getCompletionsForDateRange, dayStart, dayEnd]);

  const dayTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.completedAt && toDateKey(t.completedAt) === date) return true;
      if (t.status === "due" && isToday(date) && toDateKey(t.createdAt) === date) return true;
      return false;
    });
  }, [tasks, date]);

  const completedTasks = useMemo(() => dayTasks.filter(t => t.completedAt && toDateKey(t.completedAt) === date), [dayTasks, date]);
  const pendingTasks = useMemo(() => dayTasks.filter(t => t.status === "due" && !t.completedAt), [dayTasks]);

  const totalTrackedMinutes = useMemo(() => {
    return timedImpacts.reduce((sum, i) => {
      if (!i.endTime) return sum;
      return sum + (i.endTime - i.date) / 60000;
    }, 0);
  }, [timedImpacts]);

  const goalTypeMap = useMemo(() => {
    const map = new Map<string, GoalType>();
    goalTypes.forEach(gt => map.set(gt.id, gt));
    return map;
  }, [goalTypes]);

  const goalMap = useMemo(() => {
    const map = new Map<string, Goal>();
    goals.forEach(g => map.set(g.id, g));
    return map;
  }, [goals]);

  // Scores
  const productivityScore = useMemo(
    () => computeProductivityScore(totalTrackedMinutes, dayCompletions.length, routines.length, completedTasks.length),
    [totalTrackedMinutes, dayCompletions.length, routines.length, completedTasks.length]
  );
  const moodScore = useMemo(() => computeMoodScore(dayImpacts), [dayImpacts]);
  const habitScore = useMemo(() => computeHabitScore(dayCompletions.length, routines.length), [dayCompletions.length, routines.length]);

  // Urgency detection
  const urgentGoals = useMemo(() => {
    if (!isToday(date)) return [];
    return goals
      .filter(g => g.status !== "completed" && g.status !== "archived")
      .map(g => {
        const issues: string[] = [];
        const hasDeadline = g.targetDate && g.targetDate > 0;
        const hasMilestones = g.milestones && g.milestones.length > 0;

        if (!hasDeadline) issues.push("No deadline set");
        if (!hasMilestones) issues.push("No milestones");

        if (hasDeadline && g.targetDate) {
          const hoursLeft = (g.targetDate - Date.now()) / 3600000;
          const daysLeft = Math.ceil(hoursLeft / 24);
          if (daysLeft < 0) issues.push(`Overdue by ${Math.abs(daysLeft)} days`);
          else if (hoursLeft <= 24) issues.push(`Due TODAY`);
          else if (daysLeft <= 3) issues.push(`Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`);
        }

        if (g.milestones) {
          for (const ms of g.milestones) {
            if (!ms.completed && ms.targetDate) {
              const daysLeft = Math.ceil((ms.targetDate - Date.now()) / 86400000);
              if (daysLeft < 0) issues.push(`Milestone "${ms.name}" overdue`);
              else if (daysLeft <= 3) issues.push(`Milestone "${ms.name}" due in ${daysLeft}d`);
            }
          }
        }

        return { goal: g, issues, severity: issues.some(i => i.includes("Overdue") || i.includes("Due TODAY")) ? "critical" as const : issues.some(i => i.includes("Due in") || i.includes("No deadline")) ? "warning" as const : "info" as const };
      })
      .filter(item => item.issues.length > 0 && !dismissedGoals.has(item.goal.id))
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      });
  }, [goals, date, dismissedGoals]);

  // Weekly momentum
  const weekMomentum = useMemo(() => {
    const days: { label: string; date: string; completions: number; minutes: number }[] = [];
    const d = new Date(date + "T12:00:00");
    const dow = d.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(monday.getDate() + mondayOffset);

    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(day.getDate() + i);
      const key = toDateKey(day.getTime());
      const dayStartTs = new Date(key + "T00:00:00").getTime();
      const dayEndTs = new Date(key + "T23:59:59.999").getTime();

      const dayComps = completions.filter(c => c.completedAt >= dayStartTs && c.completedAt <= dayEndTs);
      const dayImps = allImpacts.filter(imp => !imp.allDay && imp.date >= dayStartTs && imp.date <= dayEndTs && imp.endTime);
      const mins = dayImps.reduce((sum, imp) => sum + ((imp.endTime ?? imp.date) - imp.date) / 60000, 0);

      days.push({ label: labels[i], date: key, completions: dayComps.length, minutes: mins });
    }
    return days;
  }, [date, completions, allImpacts]);

  const maxMomentum = useMemo(() => Math.max(...weekMomentum.map(d => d.completions), 1), [weekMomentum]);

  // Navigation
  const navigateDay = useCallback((offset: number) => {
    const next = getAdjacentDate(date, offset);
    setDate(next);
    window.history.replaceState(null, "", `/day/${next}`);
  }, [date]);
  const navigateToday = useCallback(() => {
    const today = toDateKey(Date.now());
    setDate(today);
    window.history.replaceState(null, "", `/day/${today}`);
  }, []);

  const lastNavRef = useRef(0);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (sidebarFocus !== "none") { setSidebarFocus("none"); e.preventDefault(); return; }
        setDismissMenuGoalId(null);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (sidebarFocus === "none") setSidebarFocus("lens");
        else if (sidebarFocus === "lens") setSidebarFocus("dates");
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (sidebarFocus === "dates") setSidebarFocus("lens");
        else if (sidebarFocus === "lens") setSidebarFocus("none");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const now = Date.now();
        if (now - lastNavRef.current < 80) return; // debounce
        lastNavRef.current = now;
        const dir = e.key === "ArrowUp" ? -1 : 1;
        if (sidebarFocus === "lens") {
          const idx = LENSES.findIndex(l => l.id === lens);
          const next = idx + dir;
          if (next >= 0 && next < LENSES.length) setLens(LENSES[next].id);
        } else if (sidebarFocus === "dates") {
          navigateDay(dir);
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigateDay, sidebarFocus, lens]);

  // Close dismiss menu on outside click
  useEffect(() => {
    if (!dismissMenuGoalId) return;
    const handler = () => setDismissMenuGoalId(null);
    const timer = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener("click", handler); };
  }, [dismissMenuGoalId]);

  // ─── Historical Stats Computation ──────────────────────────────────────

  // 30-day lookback window
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() - 30);
    return d.getTime();
  }, [date]);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() - 7);
    return d.getTime();
  }, [date]);

  // Last 30 days impacts (for historical analysis)
  const last30Impacts = useMemo(() => {
    return allImpacts.filter(i => i.date >= thirtyDaysAgo && i.date <= dayEnd && !i.allDay);
  }, [allImpacts, thirtyDaysAgo, dayEnd]);

  // Last 7 days impacts
  const last7Impacts = useMemo(() => {
    return allImpacts.filter(i => i.date >= sevenDaysAgo && i.date <= dayEnd && !i.allDay);
  }, [allImpacts, sevenDaysAgo, dayEnd]);

  // 1. Daily Streak — consecutive days with at least 1 routine completion
  const dailyStreak = useMemo(() => {
    if (completions.length === 0) return 0;
    const completionDates = new Set(completions.map(c => toDateKey(c.completedAt)));
    let streak = 0;
    const current = new Date(date + "T12:00:00");
    // If today has no completions, start checking from yesterday
    if (!completionDates.has(date)) {
      current.setDate(current.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const key = toDateKey(current.getTime());
      if (completionDates.has(key)) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [completions, date]);

  // 2. Most Productive Hour
  const mostProductiveHour = useMemo(() => {
    const hourMinutes = new Map<number, number>();
    for (const i of last30Impacts) {
      if (!i.endTime) continue;
      const hour = new Date(i.date).getHours();
      const duration = (i.endTime - i.date) / 60000;
      hourMinutes.set(hour, (hourMinutes.get(hour) ?? 0) + duration);
    }
    if (hourMinutes.size === 0) return null;
    let bestHour = 0;
    let bestMinutes = 0;
    for (const [hour, mins] of Array.from(hourMinutes.entries())) {
      if (mins > bestMinutes) {
        bestHour = hour;
        bestMinutes = mins;
      }
    }
    return { hour: bestHour, totalMinutes: bestMinutes };
  }, [last30Impacts]);

  // 3. Weekly Comparison — this week vs last week
  const weeklyComparison = useMemo(() => {
    const d = new Date(date + "T12:00:00");
    const dow = d.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const thisMonday = new Date(d);
    thisMonday.setDate(thisMonday.getDate() + mondayOffset);
    const thisMondayTs = new Date(toDateKey(thisMonday.getTime()) + "T00:00:00").getTime();
    const thisSundayTs = thisMondayTs + 7 * 86400000 - 1;

    const lastMondayTs = thisMondayTs - 7 * 86400000;
    const lastSundayTs = thisMondayTs - 1;

    const thisWeekImpacts = allImpacts.filter(i => !i.allDay && i.date >= thisMondayTs && i.date <= thisSundayTs && i.endTime);
    const lastWeekImpacts = allImpacts.filter(i => !i.allDay && i.date >= lastMondayTs && i.date <= lastSundayTs && i.endTime);

    const thisWeekMinutes = thisWeekImpacts.reduce((s, i) => s + ((i.endTime ?? i.date) - i.date) / 60000, 0);
    const lastWeekMinutes = lastWeekImpacts.reduce((s, i) => s + ((i.endTime ?? i.date) - i.date) / 60000, 0);

    const thisWeekCompletions = completions.filter(c => c.completedAt >= thisMondayTs && c.completedAt <= thisSundayTs).length;
    const lastWeekCompletions = completions.filter(c => c.completedAt >= lastMondayTs && c.completedAt <= lastSundayTs).length;

    const thisWeekTasks = tasks.filter(t => t.completedAt && t.completedAt >= thisMondayTs && t.completedAt <= thisSundayTs).length;
    const lastWeekTasks = tasks.filter(t => t.completedAt && t.completedAt >= lastMondayTs && t.completedAt <= lastSundayTs).length;

    return {
      time: { current: thisWeekMinutes, previous: lastWeekMinutes },
      routines: { current: thisWeekCompletions, previous: lastWeekCompletions },
      tasks: { current: thisWeekTasks, previous: lastWeekTasks },
    };
  }, [allImpacts, completions, tasks, date]);

  // 5. Mood Trend — last 7 days average mood per day
  const moodTrend = useMemo(() => {
    const days: { date: string; avg: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date + "T12:00:00");
      d.setDate(d.getDate() - i);
      const key = toDateKey(d.getTime());
      const dayStartTs = new Date(key + "T00:00:00").getTime();
      const dayEndTs = new Date(key + "T23:59:59.999").getTime();
      const dayImps = allImpacts.filter(imp => imp.date >= dayStartTs && imp.date <= dayEndTs);

      let total = 0;
      let count = 0;
      for (const imp of dayImps) {
        if (typeof imp.energy === "number") { total += imp.energy; count++; }
        if (typeof imp.fulfillment === "number") { total += imp.fulfillment; count++; }
        if (typeof imp.happiness === "number") { total += imp.happiness; count++; }
        if (typeof imp.stress === "number") { total += (10 - imp.stress); count++; }
        if (typeof imp.focus === "number") { total += imp.focus; count++; }
      }
      days.push({ date: key, avg: count > 0 ? total / count : -1, count });
    }
    return days;
  }, [allImpacts, date]);

  // 7. Average Day Stats — 30-day averages
  const avgDayStats = useMemo(() => {
    const dailyMinutes = new Map<string, number>();
    const dailyRoutines = new Map<string, number>();
    const dailyTasks = new Map<string, number>();

    for (const i of last30Impacts) {
      if (!i.endTime) continue;
      const key = toDateKey(i.date);
      dailyMinutes.set(key, (dailyMinutes.get(key) ?? 0) + (i.endTime - i.date) / 60000);
    }

    const thirtyAgo = new Date(date + "T00:00:00");
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const thirtyAgoTs = thirtyAgo.getTime();

    for (const c of completions) {
      if (c.completedAt >= thirtyAgoTs && c.completedAt <= dayEnd) {
        const key = toDateKey(c.completedAt);
        dailyRoutines.set(key, (dailyRoutines.get(key) ?? 0) + 1);
      }
    }

    for (const t of tasks) {
      if (t.completedAt && t.completedAt >= thirtyAgoTs && t.completedAt <= dayEnd) {
        const key = toDateKey(t.completedAt);
        dailyTasks.set(key, (dailyTasks.get(key) ?? 0) + 1);
      }
    }

    const daysCount = 30;
    const avgMinutes = Array.from(dailyMinutes.values()).reduce((a, b) => a + b, 0) / daysCount;
    const avgRoutines = Array.from(dailyRoutines.values()).reduce((a, b) => a + b, 0) / daysCount;
    const avgTasks = Array.from(dailyTasks.values()).reduce((a, b) => a + b, 0) / daysCount;

    return { avgMinutes, avgRoutines, avgTasks };
  }, [last30Impacts, completions, tasks, date, dayEnd]);

  // 8. Untracked Time Today
  const untrackedMinutes = useMemo(() => {
    if (!isToday(date)) return null;
    const now = new Date();
    const { start, end } = getWakingWindow(date, wakingHours.startHour, wakingHours.endHour);
    const total = (end.getTime() - start.getTime()) / 60000;
    const elapsed = Math.min(Math.max(now.getTime() - start.getTime(), 0), end.getTime() - start.getTime()) / 60000;
    const untracked = Math.max(0, elapsed - totalTrackedMinutes);
    return { untracked: Math.round(untracked), elapsed: Math.round(elapsed), total: Math.round(total) };
  }, [date, totalTrackedMinutes, wakingHours]);

  // 9. Personal Records
  const personalRecords = useMemo(() => {
    const dailyMinutes = new Map<string, number>();
    const dailyTasks = new Map<string, number>();

    for (const i of allImpacts) {
      if (i.allDay || !i.endTime) continue;
      const key = toDateKey(i.date);
      dailyMinutes.set(key, (dailyMinutes.get(key) ?? 0) + (i.endTime - i.date) / 60000);
    }

    for (const t of tasks) {
      if (t.completedAt) {
        const key = toDateKey(t.completedAt);
        dailyTasks.set(key, (dailyTasks.get(key) ?? 0) + 1);
      }
    }

    const maxTrackedMinutes = Math.max(...Array.from(dailyMinutes.values()), 0);
    const maxTasks = Math.max(...Array.from(dailyTasks.values()), 0);

    // Longest routine streak (all-time)
    const completionDates = Array.from(new Set(completions.map(c => toDateKey(c.completedAt)))).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate: string | null = null;
    for (const d of completionDates) {
      if (prevDate) {
        const prev = new Date(prevDate + "T12:00:00");
        const curr = new Date(d + "T12:00:00");
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        if (Math.round(diff) === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      prevDate = d;
    }

    const todayMinutes = dailyMinutes.get(date) ?? 0;
    const todayTasks = dailyTasks.get(date) ?? 0;

    return {
      maxTrackedMinutes: Math.round(maxTrackedMinutes),
      maxTasks,
      longestStreak,
      todayMinutes: Math.round(todayMinutes),
      todayTasks,
      currentStreak: dailyStreak,
      isTimeRecord: todayMinutes >= maxTrackedMinutes && maxTrackedMinutes > 0,
      isTaskRecord: todayTasks >= maxTasks && maxTasks > 0,
      isStreakRecord: dailyStreak >= longestStreak && longestStreak > 0,
    };
  }, [allImpacts, tasks, completions, date, dailyStreak]);

  // 11. Upcoming Deadlines — goals with deadlines in next 30 days
  const upcomingDeadlines = useMemo(() => {
    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 86400000;
    return goals
      .filter(g => g.status !== "completed" && g.status !== "archived" && g.targetDate && g.targetDate > 0 && g.targetDate <= thirtyDaysFromNow)
      .sort((a, b) => (a.targetDate ?? 0) - (b.targetDate ?? 0))
      .map(g => {
        const daysLeft = Math.ceil(((g.targetDate ?? 0) - now) / 86400000);
        return { goal: g, daysLeft };
      });
  }, [goals]);

  // 12. Energy Curve — mood values from today as timeline
  const energyCurve = useMemo(() => {
    const entries: { time: number; energy: number; focus: number; label: string }[] = [];
    for (const i of dayImpacts) {
      const energy = typeof i.energy === "number" ? i.energy : -1;
      const focus = typeof i.focus === "number" ? i.focus : -1;
      if (energy >= 0 || focus >= 0) {
        entries.push({ time: i.date, energy, focus, label: i.activity });
      }
    }
    return entries;
  }, [dayImpacts]);

  // 13. Yesterday Comparison
  const yesterdayComparison = useMemo(() => {
    const yesterdayStr = getAdjacentDate(date, -1);
    const ydayStart = new Date(yesterdayStr + "T00:00:00").getTime();
    const ydayEnd = new Date(yesterdayStr + "T23:59:59.999").getTime();

    const ydayImpacts = allImpacts.filter(i => !i.allDay && i.date >= ydayStart && i.date <= ydayEnd && i.endTime);
    const ydayMinutes = ydayImpacts.reduce((s, i) => s + ((i.endTime ?? i.date) - i.date) / 60000, 0);

    const ydayCompletions = completions.filter(c => c.completedAt >= ydayStart && c.completedAt <= ydayEnd).length;
    const ydayTasks = tasks.filter(t => t.completedAt && t.completedAt >= ydayStart && t.completedAt <= ydayEnd).length;

    return {
      minutes: Math.round(ydayMinutes),
      routines: ydayCompletions,
      tasks: ydayTasks,
    };
  }, [allImpacts, completions, tasks, date]);

  // 14. Procrastination Signal
  const procrastinationSignal = useMemo(() => {
    if (!isToday(date)) return false;
    const now = new Date();
    return now.getHours() >= 12 && timedImpacts.length === 0;
  }, [date, timedImpacts]);

  // 15. Week Heatmap — 7-day grid with minutes intensity
  const weekHeatmap = useMemo(() => {
    const days: { date: string; label: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date + "T12:00:00");
      d.setDate(d.getDate() - i);
      const key = toDateKey(d.getTime());
      const dStart = new Date(key + "T00:00:00").getTime();
      const dEnd = new Date(key + "T23:59:59.999").getTime();
      const mins = allImpacts
        .filter(imp => !imp.allDay && imp.date >= dStart && imp.date <= dEnd && imp.endTime)
        .reduce((s, imp) => s + ((imp.endTime ?? imp.date) - imp.date) / 60000, 0);
      days.push({ date: key, label: d.toLocaleDateString("en-US", { weekday: "short" }), minutes: Math.round(mins) });
    }
    return days;
  }, [allImpacts, date]);

  // Find nearest deadline for countdown (ignores dismissals — deadlines are deadlines)
  const nearestDeadline = useMemo(() => {
    if (!isToday(date)) return null;
    const withDeadline = goals
      .filter(g => g.status !== "completed" && g.status !== "archived" && g.targetDate && g.targetDate > 0 && g.targetDate > Date.now())
      .sort((a, b) => (a.targetDate ?? 0) - (b.targetDate ?? 0));
    if (withDeadline.length === 0) return null;
    const g = withDeadline[0];
    return { name: g.name, targetDate: g.targetDate! };
  }, [goals, date]);

  const isLoading = loading || goalsLoading || completionsLoading;

  const updateWakingHours = useCallback((next: { startHour: number; endHour: number }) => {
    setWakingHours(next);
    localStorage.setItem(`dayview-waking-hours-${date}`, JSON.stringify(next));
  }, [date]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<StandaloneTask>) => {
    await remoteStorageClient.updateStandaloneTask(taskId, updates);
    setTasks(prev => prev.map(task => task.id === taskId ? { ...task, ...updates } : task));
    window.dispatchEvent(new Event("tasksUpdated"));
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    await updateTask(taskId, { status: "completed", completedAt: Date.now() });
  }, [updateTask]);

  const uncompleteTask = useCallback(async (taskId: string) => {
    await updateTask(taskId, { status: "due", completedAt: undefined });
  }, [updateTask]);

  const deleteTask = useCallback(async (taskId: string) => {
    await remoteStorageClient.deleteStandaloneTask(taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));
    window.dispatchEvent(new Event("tasksUpdated"));
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Date List Sidebar ──────────────────────────────────────────── */}
      <DateListSidebar date={date} navigateDay={navigateDay} navigateToday={navigateToday} focused={sidebarFocus === "dates"} onSelectDate={(key) => { setDate(key); window.history.replaceState(null, "", `/day/${key}`); }} onFocus={() => setSidebarFocus("dates")} />

      {/* ── Lens Selector Sidebar ──────────────────────────────────────── */}
      <LensSelector lens={lens} setLens={setLens} focused={sidebarFocus === "lens"} onFocus={() => setSidebarFocus("lens")} />

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 px-4 lg:px-8 overflow-y-auto pb-8 pt-4" onClick={() => setSidebarFocus("none")}>
      <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-6">

      {/* ── Day Progress Bento ────────────────────────────────────────── */}
      <DayProgressBento nearestDeadline={nearestDeadline} wakingHours={wakingHours} date={date} onWakingHoursChange={updateWakingHours} />

      {/* ── All-Day Events ────────────────────────────────────────────── */}
      {allDayImpacts.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-card p-4">
          {allDayImpacts.map((i, idx) => (
            <div key={idx} className="flex items-center gap-2 text-yellow-300">
              <CalendarIcon className="h-4 w-4 shrink-0" />
              <span className="font-medium">{i.activity}</span>
              {i.notes && <span className="text-yellow-300/60 text-sm">— {i.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── AI Summary Banner ─────────────────────────────────────────── */}
      {aiInsights?.summary && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-card p-5">
          <h2 className="text-purple-400 font-semibold text-sm mb-2 flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" />
            AI Analysis
          </h2>
          <p className="text-sm leading-relaxed">{aiInsights.summary}</p>
        </div>
      )}

      {/* ── Step Progress (overview lens) ──────────────────────────────── */}
      {lens === "overview" && aiInsights && aiInsights.insights.length > 0 && (
        <StepProgress insights={aiInsights.insights} storageKey={`dayview-steps-${date}`} />
      )}

      {/* ── Dismissed goals (collapsible undo) ─────────────────────────── */}
      {dismissedGoals.size > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors">{dismissedGoals.size} dismissed goal{dismissedGoals.size !== 1 ? "s" : ""}</summary>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {Array.from(dismissedGoals.entries()).map(([id, until]) => {
              const g = goalMap.get(id);
              if (!g) return null;
              return (
                <button key={id} onClick={() => undismissGoal(id)} className="px-2 py-0.5 bg-muted rounded hover:bg-muted/80 transition-colors">
                  {g.name} {until ? `(until ${new Date(until).toLocaleDateString("de-DE", { month: "short", day: "numeric" })})` : "(permanently)"} — undo
                </button>
              );
            })}
          </div>
        </details>
      )}

      {/* ── Reality Check + Scores (wide grid) ────────────────────────── */}
      {(lens === "overview" || lens === "activities") && (
        <div className="grid grid-cols-2 gap-3">
          <StreakStatCard streak={dailyStreak} />
          <StatCard label="Avg Daily" value={avgDayStats.avgMinutes > 0 ? formatMinutes(avgDayStats.avgMinutes) : "—"} sub={`${avgDayStats.avgRoutines.toFixed(1)} routines, ${avgDayStats.avgTasks.toFixed(1)} tasks`} color={totalTrackedMinutes >= avgDayStats.avgMinutes && avgDayStats.avgMinutes > 0 ? "text-green-400" : avgDayStats.avgMinutes > 0 ? "text-yellow-400" : "text-muted-foreground"} />
        </div>
      )}

      {/* ── Comparison Stats Row ──────────────────────────────────────── */}
      {(lens === "overview" || lens === "activities") && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <YesterdayComparison
          yesterday={yesterdayComparison}
          todayMinutes={Math.round(totalTrackedMinutes)}
          todayRoutines={dayCompletions.length}
          todayTasks={completedTasks.length}
        />
        <WeeklyComparisonPanel comparison={weeklyComparison} />
      </div>}

      {/* ── Lens: Activities ──────────────────────────────────────────── */}
      {(lens === "overview" || lens === "activities") && (
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">
              Activities
            </h2>
            {untrackedMinutes && (
              <UntrackedTimePanel
                untracked={untrackedMinutes.untracked}
                elapsed={untrackedMinutes.elapsed}
                total={untrackedMinutes.total}
                embedded
              />
            )}
            {timedImpacts.length === 0 ? (
              procrastinationSignal ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    It is past noon. Start with something small — even 5 minutes counts.
                  </p>
                  <Link
                    href="/timeline"
                    className="mt-3 inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
                  >
                    Track now
                  </Link>
                </>
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No activities logged.
                  {isToday(date) && <Link href="/timeline" className="text-primary hover:underline ml-1">Log one now</Link>}
                </p>
              )
            ) : (
              <div className="space-y-2">
                {timedImpacts.map((impact, idx) => {
                  const goal = impact.goalId ? goalMap.get(impact.goalId) : undefined;
                  const duration = impact.endTime ? (impact.endTime - impact.date) / 60000 : 0;
                  return (
                    <div key={impact.id ?? idx} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className="text-sm text-muted-foreground w-14 shrink-0 pt-0.5">{formatTime(impact.date)}</div>
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: goal?.color ?? "#555" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium truncate">{impact.activity}</span>
                          {duration > 0 && <span className="text-xs text-muted-foreground shrink-0">{formatMinutes(duration)}</span>}
                        </div>
                        {goal && <span className="text-xs text-muted-foreground">{goal.name}</span>}
                        {impact.notes && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{impact.notes}</p>}
                        <MoodPills impact={impact} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          {energyCurve.length > 0 && <EnergyCurvePanel entries={energyCurve} />}
          <WeekHeatmapPanel days={weekHeatmap} currentDate={date} />
          <MoodTrendPanel days={moodTrend} />
        </div>
      )}

      {/* ── Tasks (left) + Routines (right) on overview ──────────────────── */}
      {lens === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="bg-card border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">Tasks</h2>
            <div className="space-y-1.5">
              {[...completedTasks, ...(isToday(date) ? (pendingTasks.length > 10 ? pendingTasks.slice(0, 10) : pendingTasks) : [])].map(t => (
                <StandaloneTaskItem
                  key={t.id}
                  task={t}
                  onComplete={completeTask}
                  onUncomplete={uncompleteTask}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                  hideDescription
                  hideActions
                />
              ))}
              {isToday(date) && pendingTasks.length > 10 && <p className="text-xs text-muted-foreground">+{pendingTasks.length - 10} more</p>}
              {completedTasks.length === 0 && pendingTasks.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No tasks</p>}
            </div>
          </section>
          {(() => {
            const scheduled = routines.filter(
              r => r.name && r.name.trim().length > 0 && r.cron
            );
            if (scheduled.length === 0) return null;
            return (
              <section className="bg-card border border-border rounded-card p-5">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4" />
                  Routines
                </h2>
                <div className="space-y-2">
                  {scheduled.map(routine => {
                    const completed = dayCompletions.some(c => c.routineId === routine.id);
                    return (
                      <div key={routine.id} className="flex items-center gap-3 py-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${completed ? "bg-green-400" : isToday(date) ? "border-2 border-muted-foreground" : "bg-red-400"}`} />
                        <span className={`flex-1 text-sm ${completed ? "" : "text-muted-foreground"}`}>{routine.name}</span>
                        <span className="text-xs text-muted-foreground">{completed ? "Done" : isToday(date) ? "Pending" : "Missed"}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}
        </div>
      )}
      {lens === "tasks" && (
        <div className="space-y-6">
          {/* Task list for this day */}
            {completedTasks.length > 0 && (
              <section className="bg-card border border-border rounded-card p-5">
                <h2 className="text-sm font-semibold text-green-400 mb-4">Completed ({completedTasks.length})</h2>
                <div className="space-y-1.5">
                  {completedTasks.map(t => (
                    <StandaloneTaskItem
                      key={t.id}
                      task={t}
                      onComplete={completeTask}
                      onUncomplete={uncompleteTask}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      hideDescription
                      hideActions
                    />
                  ))}
                </div>
              </section>
            )}
            {isToday(date) && pendingTasks.length > 0 && (
              <section className="bg-card border border-border rounded-card p-5">
                <h2 className="text-sm font-semibold text-yellow-400 mb-4">Pending ({pendingTasks.length})</h2>
                <div className="space-y-1.5">
                  {pendingTasks.map(t => (
                    <StandaloneTaskItem
                      key={t.id}
                      task={t}
                      onComplete={completeTask}
                      onUncomplete={uncompleteTask}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                      hideDescription
                      hideActions
                    />
                  ))}
                </div>
              </section>
            )}
            {completedTasks.length === 0 && pendingTasks.length === 0 && (
              <section className="bg-card border border-border rounded-card p-5 text-center text-muted-foreground text-sm py-8">
                No tasks for this day
              </section>
            )}
        </div>
      )}

      {/* ── Lens: Routines (extras shared with overview lens) ──────────── */}
      {(lens === "overview" || lens === "routines") && (
        <div className="space-y-6">
          {lens === "routines" && routines.length > 0 && (
            <section className="bg-card border border-border rounded-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4" />
                Routines
              </h2>
              <div className="space-y-2">
                {routines
                  .filter(routine => routine.name && routine.name.trim().length > 0)
                  .map(routine => {
                  const completed = dayCompletions.some(c => c.routineId === routine.id);
                  return (
                    <div key={routine.id} className="flex items-center gap-3 py-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${completed ? "bg-green-400" : isToday(date) ? "border-2 border-muted-foreground" : "bg-red-400"}`} />
                      <span className={`flex-1 text-sm ${completed ? "" : "text-muted-foreground"}`}>{routine.name}</span>
                      <span className="text-xs text-muted-foreground">{completed ? "Done" : isToday(date) ? "Pending" : "Missed"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          <section className="bg-card border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">This Week</h2>
            <div className="grid grid-cols-7 gap-2 text-center">
              {weekMomentum.map(day => (
                <button key={day.date} onClick={() => { setDate(day.date); window.history.replaceState(null, "", `/day/${day.date}`); }} className="group outline-none">
                  <div className="text-xs text-muted-foreground mb-1">{day.label}</div>
                  <div className="h-20 flex flex-col justify-end items-center">
                    <div
                      className={`w-full rounded-t transition-all group-hover:opacity-80 ${day.date === date ? "ring-2 ring-primary" : ""} ${day.completions > 0 ? "bg-green-400/80" : day.date <= toDateKey(Date.now()) ? "bg-muted" : "bg-transparent"}`}
                      style={{ height: day.completions > 0 ? `${Math.max(8, (day.completions / maxMomentum) * 100)}%` : "4px" }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {day.completions > 0 ? day.completions : day.date <= toDateKey(Date.now()) ? "0" : "—"}
                  </div>
                  {day.minutes > 0 && <div className="text-xs text-muted-foreground">{formatMinutes(day.minutes)}</div>}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Lens: Goals ────────────────────────────────────────────────── */}
      {(lens === "overview" || lens === "goals") && (
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
              <FlagIcon className="h-4 w-4" />
              Goals
            </h2>
            <div className="space-y-3">
              {goals
                .filter(g => g.status !== "archived")
                .map(g => {
                  const type = goalTypeMap.get(g.type);
                  const hasDeadline = g.targetDate && g.targetDate > 0;
                  const hasMilestones = g.milestones && g.milestones.length > 0;
                  const completedMilestones = g.milestones?.filter(m => m.completed).length ?? 0;
                  const totalMilestones = g.milestones?.length ?? 0;
                  const goalImpactsToday = timedImpacts.filter(i => i.goalId === g.id && i.endTime);
                  const totalMinutes = goalImpactsToday.reduce((sum, i) => sum + ((i.endTime ?? i.date) - i.date) / 60000, 0);
                  const milestonePct = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
                  return (
                    <div key={g.id} className="py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        {g.color && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />}
                        <span className="font-medium text-sm">{g.name}</span>
                        {type && <span className="text-xs text-muted-foreground ml-auto">{type.name}</span>}
                      </div>
                      {hasMilestones && (
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${milestonePct}%` }}
                          />
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        {hasDeadline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground">
                            <span aria-hidden>📅</span>
                            {new Date(g.targetDate!).toLocaleDateString("de-DE", { month: "short", day: "numeric" })}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { window.location.href = `/goals#${g.id}`; }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-400 hover:bg-orange-400/20 hover:border-orange-400/60 transition-colors cursor-pointer"
                            title="Add a deadline"
                          >
                            <span aria-hidden>⚠</span>
                            No deadline
                          </button>
                        )}
                        {hasMilestones ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground tabular-nums">
                            <span aria-hidden>🏁</span>
                            {completedMilestones}/{totalMilestones}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { window.location.href = `/goals#${g.id}`; }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-orange-400/30 bg-orange-400/10 text-orange-400 hover:bg-orange-400/20 hover:border-orange-400/60 transition-colors cursor-pointer"
                            title="Add milestones"
                          >
                            <span aria-hidden>⚠</span>
                            No milestones
                          </button>
                        )}
                        {totalMinutes > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted/40 text-foreground">
                            <span aria-hidden>⏱</span>
                            {formatMinutes(totalMinutes)} today
                          </span>
                        )}

                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
          <GoalProgress goals={goals} impacts={allImpacts} currentDate={date} />
          {upcomingDeadlines.length > 0 && <UpcomingDeadlinesPanel deadlines={upcomingDeadlines} />}
        </div>
      )}

      {/* ── Lens: Health ───────────────────────────────────────────────── */}
      {(lens === "overview" || lens === "health") && (
        <div className="space-y-6">
          {/* Health Connect data for this day */}
          {dayHealth && <HealthConnectCard day={dayHealth} />}
          {lens === "health" && !dayHealth && (
            <div className="bg-card border border-border rounded-card p-5 text-center text-muted-foreground text-sm">
              No Health Connect data for this day
            </div>
          )}
          {/* 7-day health summary (health lens only) */}
          {lens === "health" && recentHealth.length > 1 && <HealthWeekSummary data={recentHealth} />}
          <WaterIntake date={date} />
          <WinsList date={date} />
          <GratitudeLog date={date} />
        </div>
      )}


      </div>
      {/* ── Sticky Daily Notes chat aside (all lenses) ─────────────────── */}
      <aside className="hidden lg:block w-[360px] shrink-0">
        <div className="sticky top-0 space-y-3">
          <DailyChatTile date={date} />
          <AccountabilityCheckin impacts={timedImpacts} date={date} />
          {lens === "tasks" && (
            <>
              <QuickWins routines={routines} tasks={tasks} dayCompletions={dayCompletions} date={date} />
              <PersonalRecordsPanel records={personalRecords} />
            </>
          )}
          {lens === "routines" && (
            <NextActionSuggestion goals={goals} routines={routines} tasks={tasks} dayCompletions={dayCompletions} date={date} />
          )}
        </div>
      </aside>
      </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

const SIDEBAR_ITEM_H = 40;

interface ScrollPickerItem {
  key: string;
  label: React.ReactNode;
  accent?: boolean; // e.g. isToday dot
}

function ScrollPicker({ items, selectedIndex, onSelect, width, focused, onFocus, footer }: {
  items: ScrollPickerItem[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
  width: string;
  focused: boolean;
  onFocus: () => void;
  footer?: React.ReactNode;
}) {
  const offset = -(selectedIndex * SIDEBAR_ITEM_H + SIDEBAR_ITEM_H / 2);

  return (
    <div className={`hidden lg:flex flex-col border-r shrink-0 h-full sticky top-0 transition-colors overflow-hidden ${width} ${focused ? "border-primary/40" : "border-border"}`} style={focused ? { background: "linear-gradient(to right, transparent, hsl(var(--primary) / 0.03))" } : undefined} onClick={onFocus}>
      <div className="flex-1 relative">
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none border-r-2 border-white"
          style={{ background: "linear-gradient(to right, transparent, hsl(var(--primary) / 0.12))", top: "50%", height: SIDEBAR_ITEM_H, transform: `translateY(-${SIDEBAR_ITEM_H / 2}px)` }}
        />
        <div
          className="absolute w-full transition-transform duration-150 ease-out"
          style={{ top: "50%", transform: `translateY(${offset}px)` }}
        >
          {items.map((item, idx) => (
            <button
              key={item.key}
              onClick={(e) => { onSelect(idx); (e.target as HTMLElement).blur(); }}
              className={`w-full flex flex-col items-center justify-center px-1 outline-none ${
                idx === selectedIndex
                  ? "text-primary font-semibold"
                  : item.accent
                    ? "text-primary/70 hover:bg-muted/50"
                    : "text-muted-foreground hover:bg-muted/50"
              }`}
              style={{ height: SIDEBAR_ITEM_H }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {footer}
    </div>
  );
}

type Lens = "overview" | "activities" | "tasks" | "routines" | "goals" | "health";

const LENSES: { id: Lens; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activities", label: "Activities" },
  { id: "tasks", label: "Tasks" },
  { id: "routines", label: "Routines" },
  { id: "goals", label: "Goals" },
  { id: "health", label: "Health" },
];

const DATE_RANGE = 60; // days before and after today
const DATE_CENTER = DATE_RANGE; // index of "today" in the list

function DateListSidebar({ date, navigateDay, navigateToday, onSelectDate, focused, onFocus }: { date: string; navigateDay: (offset: number) => void; navigateToday: () => void; onSelectDate: (dateKey: string) => void; focused: boolean; onFocus: () => void }) {
  // Fixed list anchored on today — never regenerated when date changes
  const { entries, todayKey } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = toDateKey(today.getTime());
    const list: ScrollPickerItem[] = [];
    for (let i = -DATE_RANGE; i <= DATE_RANGE; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = toDateKey(d.getTime());
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      const monthLabel = d.toLocaleDateString("en-US", { month: "short" });
      const isTodayDate = i === 0;
      list.push({
        key,
        accent: isTodayDate,
        label: (
          <>
            <span className="text-xs leading-none">{dayName}</span>
            <span className="text-sm font-semibold tabular-nums leading-tight">{dayNum}</span>
            {(dayNum === 1 || i === -DATE_RANGE) && <span className="text-xs text-muted-foreground leading-none">{monthLabel}</span>}
            {isTodayDate && <div className="w-1 h-1 rounded-full bg-primary" />}
          </>
        ),
      });
    }
    return { entries: list, todayKey: todayStr };
  }, []); // stable — never changes

  // Selected index shifts as date changes
  const selectedIdx = useMemo(() => {
    const idx = entries.findIndex(e => e.key === date);
    return idx >= 0 ? idx : DATE_CENTER;
  }, [entries, date]);

  const showToday = date !== todayKey;

  return (
    <ScrollPicker
      items={entries}
      selectedIndex={selectedIdx}
      onSelect={(idx) => {
        const entry = entries[idx];
        if (entry) onSelectDate(entry.key);
      }}
      width="w-16"
      focused={focused}
      onFocus={onFocus}
      footer={showToday ? (
        <button onClick={navigateToday} className="p-2 text-xs text-primary hover:bg-muted/50 border-t border-border outline-none">
          Today
        </button>
      ) : undefined}
    />
  );
}

function LensSelector({ lens, setLens, focused, onFocus }: { lens: Lens; setLens: (l: Lens) => void; focused: boolean; onFocus: () => void }) {
  const items: ScrollPickerItem[] = LENSES.map(l => ({
    key: l.id,
    label: <span className="text-xs">{l.label}</span>,
  }));
  const selectedIdx = LENSES.findIndex(l => l.id === lens);

  return (
    <ScrollPicker
      items={items}
      selectedIndex={selectedIdx}
      onSelect={(idx) => setLens(LENSES[idx].id)}
      width="w-20"
      focused={focused}
      onFocus={onFocus}
    />
  );
}

function LiveClock({ compact }: { compact?: boolean }) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })), 1000);
    return () => clearInterval(interval);
  }, []);
  if (compact) return <span className="text-2xl font-semibold tabular-nums">{time}</span>;
  return <div className="text-5xl font-semibold tabular-nums">{time}</div>;
}

function DeadlineCountdown({ targetDate, label, compact }: { targetDate: number; label: string; compact?: boolean }) {
  const [remaining, setRemaining] = useState(() => targetDate - Date.now());
  useEffect(() => {
    const interval = setInterval(() => setRemaining(targetDate - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const overdue = remaining <= 0;
  const hours = Math.floor(Math.abs(remaining) / 3600000);
  const minutes = Math.floor((Math.abs(remaining) % 3600000) / 60000);
  const seconds = Math.floor((Math.abs(remaining) % 60000) / 1000);
  const urgencyColor = overdue ? "text-red-400" : hours < 2 ? "text-red-400" : hours < 5 ? "text-orange-400" : hours < 24 ? "text-yellow-400" : "text-green-400";

  if (compact) {
    return (
      <div className={`text-right ${urgencyColor}`}>
        <div className="text-xs opacity-70">{label}</div>
        <div className="text-lg font-semibold tabular-nums">
          {overdue ? "Overdue" : `${hours}h ${String(minutes).padStart(2, "0")}m`}
        </div>
      </div>
    );
  }

  const borderColor = overdue ? "border-red-500/40" : hours < 2 ? "border-red-500/40" : hours < 5 ? "border-orange-500/30" : "border-yellow-500/30";
  const bgColor = overdue ? "bg-red-500/10" : hours < 2 ? "bg-red-500/10" : hours < 5 ? "bg-orange-500/5" : "bg-yellow-500/5";

  return (
    <div className={`${bgColor} border ${borderColor} rounded-card p-4 text-center max-w-[500px] w-full ${overdue ? "animate-pulse" : ""}`}>
      <div className={`${urgencyColor} text-sm font-semibold`}>{label}</div>
      <div className={`text-3xl font-semibold tabular-nums mt-1 ${urgencyColor}`}>
        {overdue ? "Overdue" : `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`}
      </div>
    </div>
  );
}

function RadialProgress({ pct, size, stroke, color, children }: { pct: number; size: number; stroke: number; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashoffset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={dashoffset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function parseRating(t?: string): number | null {
  if (!t) return null;
  const m = t.match(/^rating:\s*(-?\d+)\s*$/i);
  if (!m) return null;
  const v = Number(m[1]);
  if (!Number.isFinite(v) || v < -5 || v > 5) return null;
  return v;
}

function ratingColor(v: number): string {
  if (v >= 3) return "bg-green-500 text-white";
  if (v >= 1) return "bg-green-500/70 text-white";
  if (v === 0) return "bg-muted text-foreground";
  if (v >= -2) return "bg-orange-500/70 text-white";
  return "bg-red-500 text-white";
}

function RatingSlider({ onSubmit, onCancel }: { onSubmit: (v: number) => void; onCancel: () => void }) {
  const [value, setValue] = useState(0);
  return (
    <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-control shadow-xl p-3 z-10 w-[280px]">
      <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
        <span>Mood</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ratingColor(value)}`}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <input
        type="range"
        min={-5}
        max={5}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>-5</span><span>0</span><span>+5</span>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => onSubmit(value)}>
          Send
        </Button>
      </div>
    </div>
  );
}

function DailyChatTile({ date }: { date: string }) {
  const { notes, addNote } = useQuickNotes();
  const [text, setText] = useState("");
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayNotes = useMemo(() => {
    return notes
      .filter((n) => {
        const d = new Date(n.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return key === date;
      })
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [notes, date]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [todayNotes.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await addNote({ text: trimmed });
  };

  return (
    <section className="bg-card border border-border rounded-card flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground">Daily Notes</h2>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto p-3 space-y-2 bg-muted/20">
        {todayNotes.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            Drop a quick thought, mood, or note for today.
          </p>
        ) : (
          todayNotes.map((n) => {
            const ratingValue = parseRating(n.text);
            const time = new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            if (ratingValue !== null) {
              return (
                <div key={n.id} className="flex justify-end">
                  <div className={`rounded-2xl rounded-br-sm px-3 py-1.5 text-sm shadow-sm flex items-center gap-2 ${ratingColor(ratingValue)}`}>
                    <span className="text-xs opacity-80">Mood</span>
                    <span className="text-base font-semibold tabular-nums">
                      {ratingValue > 0 ? `+${ratingValue}` : ratingValue}
                    </span>
                    <span className="text-[10px] opacity-70">{time}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={n.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-1.5 text-sm shadow-sm">
                  <p className="whitespace-pre-wrap break-words">{n.text}</p>
                  <p className="text-[10px] opacity-70 mt-0.5 text-right">{time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        className="px-3 py-2 border-t border-border flex items-center gap-2 relative"
        onSubmit={(e) => { e.preventDefault(); void send(); }}
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Send a tiny note…"
            className="w-full bg-background rounded-full border border-input pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowRatingPicker((s) => !s)}
            aria-label="Submit a mood rating"
            title="Mood rating"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span className="text-base leading-none">😊</span>
          </button>
          {showRatingPicker && (
            <RatingSlider
              onSubmit={async (v) => {
                setShowRatingPicker(false);
                await addNote({ text: `rating: ${v > 0 ? `+${v}` : v}` });
              }}
              onCancel={() => setShowRatingPicker(false)}
            />
          )}
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim()}
          aria-label="Send"
        >
          <PaperAirplaneIcon />
        </Button>

      </form>
    </section>
  );
}

function DayProgressBento({ nearestDeadline, wakingHours, date, onWakingHoursChange }: { nearestDeadline: { name: string; targetDate: number } | null; wakingHours: { startHour: number; endHour: number }; date: string; onWakingHoursChange: (hours: { startHour: number; endHour: number }) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { start: wakingStart, end: wakingEnd } = getWakingWindow(date, wakingHours.startHour, wakingHours.endHour);
  const displayStart = new Date(wakingStart); displayStart.setHours(displayStart.getHours() - 1);
  const displayEnd = new Date(wakingEnd); displayEnd.setHours(displayEnd.getHours() + 1);
  const totalDisplay = displayEnd.getTime() - displayStart.getTime();
  const wakingOffset = ((wakingStart.getTime() - displayStart.getTime()) / totalDisplay) * 100;
  const wakingWidth = ((wakingEnd.getTime() - wakingStart.getTime()) / totalDisplay) * 100;
  const pct = Math.max(0, Math.min(((now - displayStart.getTime()) / totalDisplay) * 100, 100));
  const wakingProgressPct = Math.max(0, Math.min(((now - wakingStart.getTime()) / (wakingEnd.getTime() - wakingStart.getTime())) * 100, 100));
  const wakingProgressWidth = (wakingProgressPct / 100) * wakingWidth;
  const remainingMs = Math.max(0, wakingEnd.getTime() - now);
  const hoursLeft = remainingMs / 3600000;
  const fullHours = Math.floor(hoursLeft);
  const minsLeft = Math.round((hoursLeft % 1) * 60);
  const time = new Date(now).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const progressColor = wakingProgressPct > 80 ? "bg-red-400" : wakingProgressPct > 50 ? "bg-orange-400" : "bg-green-400";

  return (
    <div className="grid gap-3 grid-cols-1">
      <div className="bg-card border border-border rounded-card p-5 w-full">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-2xl font-semibold tabular-nums">{time}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-foreground">{Math.round(wakingProgressPct)}%</div>
            <div className="text-xs text-muted-foreground">{fullHours}h {minsLeft}m left</div>
          </div>
        </div>
        <div className="relative h-4 rounded-full bg-muted overflow-hidden">
          <div className="absolute inset-y-0 bg-muted-foreground/10" style={{ left: `${wakingOffset}%`, width: `${wakingWidth}%` }} />
          <div className={`absolute inset-y-0 ${progressColor}`} style={{ left: `${wakingOffset}%`, width: `${wakingProgressWidth}%` }} />
          <div className="absolute inset-y-0 w-px bg-foreground/70" style={{ left: `${pct}%` }} />
        </div>
        <div className="relative text-xs text-muted-foreground mt-2 h-7">
          <TimeChip
            hour={wakingHours.startHour}
            className="absolute -translate-x-1/2"
            style={{ left: `${wakingOffset}%` }}
            onChange={(hour) => onWakingHoursChange({ ...wakingHours, startHour: hour })}
          />
          <TimeChip
            hour={wakingHours.endHour}
            className="absolute -translate-x-1/2"
            style={{ left: `${wakingOffset + wakingWidth}%` }}
            onChange={(hour) => onWakingHoursChange({ ...wakingHours, endHour: hour })}
          />
        </div>
      </div>

      {nearestDeadline && (
        <DeadlineCountdown targetDate={nearestDeadline.targetDate} label={`${nearestDeadline.name} deadline`} />
      )}
    </div>
  );
}

function TimeChip({ hour, onChange, className, style }: { hour: number; onChange: (hour: number) => void; className?: string; style?: React.CSSProperties }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  return (
    <button
      type="button"
      onClick={openPicker}
      className={`${className ?? ""} inline-flex cursor-pointer items-center rounded-full border border-border bg-background px-2 py-0.5 tabular-nums hover:bg-muted/60`}
      style={style}
      title="Change waking time"
    >
      <span>{formatHour(hour)}</span>
      <input
        ref={inputRef}
        type="time"
        value={`${formatHour(hour)}:00`}
        onChange={(e) => onChange(parseHour(e.target.value))}
        className="absolute h-0 w-0 opacity-0 pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      />
    </button>
  );
}

function StepProgress({ insights, storageKey }: { insights: Array<{ type: string; text: string }>; storageKey: string }) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]") as number[];
      return new Set(stored);
    } catch { return new Set(); }
  });
  const [celebrating, setCelebrating] = useState(false);

  const completeStep = useCallback((idx: number) => {
    setCompletedSteps(prev => {
      const next = new Set(Array.from(prev));
      next.add(idx);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      return next;
    });
    setCelebrating(true);
    setTimeout(() => setCelebrating(false), 1500);
  }, [storageKey]);

  const uncompleteStep = useCallback((idx: number) => {
    setCompletedSteps(prev => {
      const next = new Set(Array.from(prev));
      next.delete(idx);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [storageKey]);

  const totalSteps = insights.length;
  const doneCount = completedSteps.size;
  const currentStep = insights.findIndex((_, i) => !completedSteps.has(i));
  const allDone = currentStep === -1;
  const progressPct = totalSteps > 0 ? (doneCount / totalSteps) * 100 : 0;

  return (
    <section className="bg-card border border-purple-500/20 rounded-card p-5 relative overflow-hidden">
      {/* Celebration overlay */}
      {celebrating && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="text-4xl animate-bounce">🎉</div>
          <div className="absolute inset-0 bg-green-400/5 animate-pulse" />
        </div>
      )}

      <h2 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
        <SparklesIcon className="h-4 w-4" />
        {allDone ? "All Steps Complete!" : "Your Plan"}
      </h2>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{doneCount}/{totalSteps} steps</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-green-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {allDone ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🏆</div>
          <p className="text-green-400 font-semibold">You did it! All steps completed.</p>
          <p className="text-xs text-muted-foreground mt-1">Now submit and celebrate.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Completed steps (collapsed) */}
          {doneCount > 0 && (
            <details className="text-xs text-muted-foreground mb-2">
              <summary className="cursor-pointer hover:text-foreground">{doneCount} step{doneCount !== 1 ? "s" : ""} completed</summary>
              <div className="mt-2 space-y-1">
                {insights.map((insight, i) => completedSteps.has(i) ? (
                  <button key={i} onClick={() => uncompleteStep(i)} className="flex items-start gap-2 w-full text-left p-1.5 rounded hover:bg-muted/50 transition-colors">
                    <CheckCircleIcon className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    <span className="line-through opacity-50">{insight.text.replace(/^STEP \d+ \([^)]+\): /, "")}</span>
                  </button>
                ) : null)}
              </div>
            </details>
          )}

          {/* Current step (prominent) */}
          {currentStep >= 0 && (
            <button
              onClick={() => completeStep(currentStep)}
              className="w-full text-left p-4 rounded-control bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full border-2 border-purple-400 flex items-center justify-center text-xs font-semibold text-purple-400 shrink-0 group-hover:bg-purple-400 group-hover:text-white transition-colors">
                  {currentStep + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{insights[currentStep].text}</p>
                  <p className="text-xs text-muted-foreground mt-1">Click when done →</p>
                </div>
              </div>
            </button>
          )}

          {/* Next step (preview, dimmed) */}
          {currentStep >= 0 && currentStep + 1 < totalSteps && !completedSteps.has(currentStep + 1) && (
            <div className="p-3 rounded-control opacity-40 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full border border-muted-foreground flex items-center justify-center text-xs shrink-0">
                  {currentStep + 2}
                </div>
                <span>{insights[currentStep + 1].text.replace(/^STEP \d+ \([^)]+\): /, "").slice(0, 60)}...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1 text-orange-400">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function ScoreCard({ label, score, detail }: { label: string; score: number; detail: string }) {
  const color = score >= 7 ? "text-green-400" : score >= 4 ? "text-yellow-400" : score >= 0 ? "text-red-400" : "text-muted-foreground";
  const barColor = score >= 7 ? "bg-green-400" : score >= 4 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="bg-card border border-border rounded-card p-4 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{score >= 0 ? score : "—"}</div>
      {score >= 0 && (
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score * 10}%` }} />
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-1 truncate">{detail}</div>
    </div>
  );
}

function MoodPills({ impact }: { impact: Impact }) {
  const moods: { label: string; value: number; color: string }[] = [];
  const add = (label: string, val: string | number | undefined, invert = false) => {
    if (typeof val !== "number") return;
    const v = invert ? 10 - val : val;
    moods.push({ label, value: val, color: v >= 7 ? "bg-green-500/20 text-green-400" : v >= 4 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400" });
  };
  add("Energy", impact.energy);
  add("Focus", impact.focus);
  add("Fulfillment", impact.fulfillment);
  add("Stress", impact.stress, true);
  if (moods.length === 0) return null;
  return (
    <div className="flex gap-1.5 mt-1 flex-wrap">
      {moods.map(m => <span key={m.label} className={`text-xs px-1.5 py-0.5 rounded ${m.color}`}>{m.label} {m.value}</span>)}
    </div>
  );
}

// ─── Streak Stat Card ────────────────────────────────────────────────────

function StreakStatCard({ streak }: { streak: number }) {
  const color = streak >= 7 ? "text-green-400" : streak >= 3 ? "text-yellow-400" : streak > 0 ? "text-orange-400" : "text-muted-foreground";
  return (
    <div className="bg-card border border-border rounded-card p-4">
      <div className="text-xs text-muted-foreground">Streak</div>
      <div className={`text-2xl font-semibold mt-1 ${color} flex items-center gap-1`}>
        <FireIcon className={`w-5 h-5 shrink-0 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        {streak}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5 truncate">
        {streak === 0 ? "Start today!" : `${streak} day${streak !== 1 ? "s" : ""} in a row`}
      </div>
    </div>
  );
}

// ─── Daily Streak Panel ──────────────────────────────────────────────────

function DailyStreakPanel({ streak, longestStreak }: { streak: number; longestStreak: number }) {
  const pct = longestStreak > 0 ? Math.min((streak / longestStreak) * 100, 100) : 0;
  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">Daily Streak</h2>
      <div className="flex items-center gap-4">
        <div className="text-4xl font-semibold text-orange-400 flex items-center gap-1">
          <span>{"\u{1F525}"}</span>
          {streak}
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-1">
            {streak >= longestStreak && longestStreak > 0 ? "New record!" : `Best: ${longestStreak} days`}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {streak === 0
          ? "Complete a routine today to start your streak."
          : streak >= 7
            ? "Incredible consistency! Keep the fire alive."
            : `${streak} consecutive day${streak !== 1 ? "s" : ""} with routine completions.`}
      </p>
    </section>
  );
}

// ─── Weekly Comparison Panel ─────────────────────────────────────────────

interface ComparisonMetric {
  current: number;
  previous: number;
}

function ComparisonArrow({ current, previous, unit }: { current: number; previous: number; unit: string }) {
  if (previous === 0 && current === 0) return <span className="text-muted-foreground text-xs">No data</span>;
  const diff = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;
  const color = isUp ? "text-green-400" : isDown ? "text-red-400" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-semibold">{unit === "min" ? formatMinutes(current) : current}</span>
      <span className={`text-xs ${color} font-medium`}>
        {isUp ? "\u2191" : isDown ? "\u2193" : "="}{" "}
        {Math.abs(Math.round(diff))}%
      </span>
    </div>
  );
}

function WeeklyComparisonPanel({ comparison }: { comparison: { time: ComparisonMetric; routines: ComparisonMetric; tasks: ComparisonMetric } }) {
  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">This Week vs Last</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tracked Time</span>
          <ComparisonArrow current={comparison.time.current} previous={comparison.time.previous} unit="min" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Routines</span>
          <ComparisonArrow current={comparison.routines.current} previous={comparison.routines.previous} unit="count" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tasks</span>
          <ComparisonArrow current={comparison.tasks.current} previous={comparison.tasks.previous} unit="count" />
        </div>
      </div>
    </section>
  );
}

// ─── Personal Records Panel ─────────────────────────────────────────────

interface PersonalRecordsData {
  maxTrackedMinutes: number;
  maxTasks: number;
  longestStreak: number;
  todayMinutes: number;
  todayTasks: number;
  currentStreak: number;
  isTimeRecord: boolean;
  isTaskRecord: boolean;
  isStreakRecord: boolean;
}

function PersonalRecordsPanel({ records }: { records: PersonalRecordsData }) {
  const hasAnyRecord = records.isTimeRecord || records.isTaskRecord || records.isStreakRecord;
  return (
    <section className={`border rounded-card p-5 ${hasAnyRecord ? "bg-yellow-500/5 border-yellow-500/30" : "bg-card border-border"}`}>
      <h2 className={`text-sm font-semibold mb-3 ${hasAnyRecord ? "text-yellow-400" : "text-muted-foreground"}`}>
        {hasAnyRecord ? "New record!" : "Personal Records"}
      </h2>
      <div className="space-y-2">
        <RecordRow
          label="Most tracked time"
          record={formatMinutes(records.maxTrackedMinutes)}
          current={formatMinutes(records.todayMinutes)}
          isRecord={records.isTimeRecord}
          closeness={records.maxTrackedMinutes > 0 ? records.todayMinutes / records.maxTrackedMinutes : 0}
        />
        <RecordRow
          label="Most tasks in a day"
          record={String(records.maxTasks)}
          current={String(records.todayTasks)}
          isRecord={records.isTaskRecord}
          closeness={records.maxTasks > 0 ? records.todayTasks / records.maxTasks : 0}
        />
        <RecordRow
          label="Longest streak"
          record={`${records.longestStreak} days`}
          current={`${records.currentStreak} days`}
          isRecord={records.isStreakRecord}
          closeness={records.longestStreak > 0 ? records.currentStreak / records.longestStreak : 0}
        />
      </div>
    </section>
  );
}

function RecordRow({ label, record, current, isRecord, closeness }: { label: string; record: string; current: string; isRecord: boolean; closeness: number }) {
  const isClose = closeness >= 0.8 && !isRecord;
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {isRecord && <span className="text-yellow-400">{"\u{1F3C6}"}</span>}
        {isClose && <span className="text-orange-400">{"\u{1F525}"}</span>}
        <span className={isRecord ? "text-yellow-400 font-medium" : "text-muted-foreground"}>{label}</span>
      </div>
      <div className="text-right">
        <span className={isRecord ? "text-yellow-400 font-semibold" : "font-medium"}>{record}</span>
        {!isRecord && isClose && (
          <span className="text-xs text-orange-400 ml-1">(today: {current})</span>
        )}
      </div>
    </div>
  );
}

// ─── Upcoming Deadlines Panel ────────────────────────────────────────────

function UpcomingDeadlinesPanel({ deadlines }: { deadlines: Array<{ goal: Goal; daysLeft: number }> }) {
  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">Upcoming Deadlines</h2>
      <div className="space-y-2">
        {deadlines.map(({ goal, daysLeft }) => {
          const urgencyColor = daysLeft <= 0 ? "text-red-400" : daysLeft <= 3 ? "text-orange-400" : daysLeft <= 7 ? "text-yellow-400" : "text-muted-foreground";
          const urgencyBg = daysLeft <= 0 ? "bg-red-500/10" : daysLeft <= 3 ? "bg-orange-500/10" : "";
          return (
            <div key={goal.id} className={`flex items-center justify-between py-1.5 px-2 rounded ${urgencyBg}`}>
              <div className="flex items-center gap-2 min-w-0">
                {goal.color && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: goal.color }} />}
                <span className="text-sm truncate">{goal.name}</span>
              </div>
              <span className={`text-xs font-semibold shrink-0 ml-2 ${urgencyColor}`}>
                {daysLeft <= 0 ? "Overdue" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Mood Trend Panel ────────────────────────────────────────────────────

function MoodTrendPanel({ days }: { days: Array<{ date: string; avg: number; count: number }> }) {
  const hasData = days.some(d => d.avg >= 0);
  if (!hasData) return null;
  const maxVal = 10;
  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">Mood Trend (7 Days)</h2>
      <div className="flex items-end gap-1.5 h-16">
        {days.map(day => {
          if (day.avg < 0) {
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full h-1 bg-muted/30 rounded-full" />
                <div className="text-xs text-muted-foreground/50 mt-1">{new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}</div>
              </div>
            );
          }
          const heightPct = (day.avg / maxVal) * 100;
          const color = day.avg >= 7 ? "bg-green-400" : day.avg >= 4 ? "bg-yellow-400" : "bg-red-400";
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center justify-end" title={`${day.date}: ${day.avg.toFixed(1)}/10 (${day.count} entries)`}>
              <div className="text-xs text-muted-foreground mb-0.5">{day.avg.toFixed(0)}</div>
              <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(heightPct, 5)}%` }} />
              <div className="text-xs text-muted-foreground mt-1">{new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Most Productive Hour Panel ──────────────────────────────────────────

function MostProductiveHourPanel({ hour, totalMinutes }: { hour: number; totalMinutes: number }) {
  const endHour = (hour + 1) % 24;
  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-2">Peak Hour</h2>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-green-400">
          {String(hour).padStart(2, "0")}:00-{String(endHour).padStart(2, "0")}:00
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{formatMinutes(totalMinutes)} tracked in this hour over 30 days</p>
    </section>
  );
}

// ─── Time by Goal Panel (Left Column) ───────────────────────────────────

// ─── Energy Curve Panel (Left Column) ───────────────────────────────────

function EnergyCurvePanel({ entries }: { entries: Array<{ time: number; energy: number; focus: number; label: string }> }) {
  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4">Energy / Focus Curve</h2>
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-between text-xs text-muted-foreground py-0.5">
          <span>10</span>
          <span>5</span>
          <span>0</span>
        </div>
        {/* Chart area */}
        <div className="ml-8">
          <div className="relative h-24 border-b border-l border-muted/30">
            {/* Grid lines */}
            <div className="absolute left-0 right-0 top-1/2 border-t border-muted/15" />
            {/* Energy line (dots + connections) */}
            <div className="absolute inset-0 flex items-end">
              {entries.map((entry, idx) => {
                const xPos = entries.length > 1 ? (idx / (entries.length - 1)) * 100 : 50;
                return (
                  <div key={`e-${idx}`} className="absolute" style={{ left: `${xPos}%`, bottom: `${entry.energy >= 0 ? entry.energy * 10 : 0}%` }} title={`${entry.label}: Energy ${entry.energy}`}>
                    {entry.energy >= 0 && <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-500 -translate-x-1/2 -translate-y-1/2" />}
                  </div>
                );
              })}
            </div>
            {/* Focus line (dots) */}
            <div className="absolute inset-0 flex items-end">
              {entries.map((entry, idx) => {
                const xPos = entries.length > 1 ? (idx / (entries.length - 1)) * 100 : 50;
                return (
                  <div key={`f-${idx}`} className="absolute" style={{ left: `${xPos}%`, bottom: `${entry.focus >= 0 ? entry.focus * 10 : 0}%` }} title={`${entry.label}: Focus ${entry.focus}`}>
                    {entry.focus >= 0 && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 border border-blue-500 -translate-x-1/2 -translate-y-1/2" />}
                  </div>
                );
              })}
            </div>
          </div>
          {/* X-axis labels */}
          <div className="flex justify-between mt-1">
            {entries.map((entry, idx) => (
              <div key={idx} className="text-xs text-muted-foreground truncate max-w-[60px] text-center" style={{ width: `${100 / entries.length}%` }}>
                {formatTime(entry.time)}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground ml-8">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Energy</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> Focus</div>
        </div>
      </div>
    </section>
  );
}

// ─── Week Heatmap Panel (Left Column) ───────────────────────────────────

function WeekHeatmapPanel({ days, currentDate }: { days: Array<{ date: string; label: string; minutes: number }>; currentDate: string }) {
  const maxMinutes = Math.max(...days.map(d => d.minutes), 1);
  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4">7-Day Activity Heatmap</h2>
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const intensity = day.minutes / maxMinutes;
          const bgColor = day.minutes === 0
            ? "bg-muted/30"
            : intensity >= 0.8 ? "bg-green-500" : intensity >= 0.5 ? "bg-green-400/70" : intensity >= 0.25 ? "bg-green-400/40" : "bg-green-400/20";
          const isCurrent = day.date === currentDate;
          return (
            <div key={day.date} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{day.label}</div>
              <div className={`aspect-square rounded-control ${bgColor} flex items-center justify-center ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                <span className="text-xs font-medium">{day.minutes > 0 ? formatMinutes(day.minutes) : ""}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground justify-end">
        <span>Less</span>
        <div className="w-3 h-3 rounded bg-muted/30" />
        <div className="w-3 h-3 rounded bg-green-400/20" />
        <div className="w-3 h-3 rounded bg-green-400/40" />
        <div className="w-3 h-3 rounded bg-green-400/70" />
        <div className="w-3 h-3 rounded bg-green-500" />
        <span>More</span>
      </div>
    </section>
  );
}

// ─── Untracked Time Panel ────────────────────────────────────────────────

function UntrackedTimePanel({ untracked, elapsed, total, embedded = false }: { untracked: number; elapsed: number; total: number; embedded?: boolean }) {
  const trackedMinutes = elapsed - untracked;
  const trackedPct = elapsed > 0 ? (trackedMinutes / elapsed) * 100 : 0;
  const allTracked = untracked <= 0;
  const color = trackedPct >= 60 ? "text-green-400" : trackedPct >= 30 ? "text-yellow-400" : "text-red-400";
  const barColor = trackedPct >= 60 ? "bg-green-400" : trackedPct >= 30 ? "bg-yellow-400" : "bg-red-400";
  const content = (
    <>
      <div className="text-xs text-muted-foreground mb-2">Waking hours</div>
      {allTracked ? (
        <div className="text-sm text-muted-foreground">All tracked</div>
      ) : (
        <div className={`text-xl font-semibold ${color}`}>{formatMinutes(untracked)} untracked</div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${trackedPct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {formatMinutes(trackedMinutes)} tracked
      </div>
    </>
  );

  if (embedded) return <div className="mb-4">{content}</div>;

  return <div className="bg-card border border-border rounded-card p-4">{content}</div>;
}

// ─── Yesterday Comparison Panel ──────────────────────────────────────────

function YesterdayComparison({ yesterday, todayMinutes, todayRoutines, todayTasks }: {
  yesterday: { minutes: number; routines: number; tasks: number };
  todayMinutes: number;
  todayRoutines: number;
  todayTasks: number;
}) {
  return (
    <div className="bg-card border border-border rounded-card p-4">
      <div className="text-xs text-muted-foreground mb-2">vs Yesterday</div>
      <div className="space-y-1.5">
        <YesterdayRow label="Time" yesterday={formatMinutes(yesterday.minutes)} today={formatMinutes(todayMinutes)} diff={todayMinutes - yesterday.minutes} />
        <YesterdayRow label="Routines" yesterday={String(yesterday.routines)} today={String(todayRoutines)} diff={todayRoutines - yesterday.routines} />
        <YesterdayRow label="Tasks" yesterday={String(yesterday.tasks)} today={String(todayTasks)} diff={todayTasks - yesterday.tasks} />
      </div>
    </div>
  );
}

function YesterdayRow({ label, yesterday, today, diff }: { label: string; yesterday: string; today: string; diff: number }) {
  const color = diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-muted-foreground";
  const arrow = diff > 0 ? "\u2191" : diff < 0 ? "\u2193" : "=";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/60 text-xs">{yesterday}</span>
        <span className={color}>{arrow}</span>
        <span className="font-medium">{today}</span>
      </div>
    </div>
  );
}

// ─── Health Connect Components ───────────────────────────────────────────

const EXERCISE_NAMES: Record<number, string> = {
  0: "Other", 2: "Badminton", 4: "Baseball", 5: "Basketball", 8: "Biking",
  10: "Boxing", 11: "Calisthenics", 14: "Cricket", 16: "Dancing",
  22: "Football", 25: "Golf", 26: "Guided Breathing", 29: "Gym",
  31: "Handball", 32: "HIIT", 33: "Hiking", 35: "Ice Skating",
  37: "Martial Arts", 44: "Pilates", 46: "Racquetball", 48: "Rock Climbing",
  50: "Rowing", 51: "Running", 54: "Skiing", 57: "Soccer", 58: "Softball",
  61: "Stair Climbing", 62: "Strength Training", 64: "Stretching",
  65: "Surfing", 66: "Swimming (Open Water)", 67: "Swimming (Pool)",
  68: "Table Tennis", 70: "Tennis", 73: "Volleyball", 74: "Walking",
  76: "Weightlifting", 78: "Yoga",
};

function formatSleepMins(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDist(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function HealthMetric({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-control px-3 py-2" style={{ backgroundColor: `${color}10` }}>
      <span className="text-lg">{icon}</span>
      <div>
        <div className="font-semibold text-sm" style={{ color }}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function HealthConnectCard({ day }: { day: DailyHealthData }) {
  const hasAny = day.steps || day.sleepMinutes || day.heartRateAvg || day.activeCalories || day.weightKg;
  if (!hasAny) return null;

  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4">Health Connect</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {day.steps != null && day.steps > 0 && (
          <HealthMetric icon="👟" value={day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}k` : `${day.steps}`} label="steps" color="#3b82f6" />
        )}
        {day.distanceMeters != null && day.distanceMeters > 0 && (
          <HealthMetric icon="📏" value={formatDist(day.distanceMeters)} label="distance" color="#14b8a6" />
        )}
        {day.activeCalories != null && day.activeCalories > 0 && (
          <HealthMetric icon="🔥" value={`${day.activeCalories}`} label="active kcal" color="#f97316" />
        )}
        {day.sleepMinutes != null && day.sleepMinutes > 0 && (
          <HealthMetric icon="😴" value={formatSleepMins(day.sleepMinutes)} label="sleep" color="#6366f1" />
        )}
        {day.heartRateAvg != null && day.heartRateAvg > 0 && (
          <HealthMetric icon="💓" value={`${day.heartRateAvg}`} label="avg bpm" color="#ef4444" />
        )}
        {day.restingHeartRate != null && day.restingHeartRate > 0 && (
          <HealthMetric icon="🫀" value={`${day.restingHeartRate}`} label="resting bpm" color="#ec4899" />
        )}
        {day.hrvRmssd != null && day.hrvRmssd > 0 && (
          <HealthMetric icon="📈" value={`${day.hrvRmssd}`} label="ms HRV" color="#a855f7" />
        )}
        {day.weightKg != null && (
          <HealthMetric icon="⚖️" value={`${day.weightKg} kg`} label="weight" color="#22c55e" />
        )}
        {day.bodyFatPct != null && (
          <HealthMetric icon="📊" value={`${day.bodyFatPct}%`} label="body fat" color="#a3763d" />
        )}
        {day.bloodPressureSystolic != null && (
          <HealthMetric icon="🩺" value={`${day.bloodPressureSystolic}/${day.bloodPressureDiastolic}`} label="mmHg" color="#ea580c" />
        )}
        {day.bloodGlucoseMmol != null && (
          <HealthMetric icon="💉" value={`${day.bloodGlucoseMmol}`} label="mmol/L" color="#eab308" />
        )}
        {day.oxygenSaturationPct != null && (
          <HealthMetric icon="🫁" value={`${day.oxygenSaturationPct}%`} label="SpO₂" color="#06b6d4" />
        )}
        {day.floorsClimbed != null && day.floorsClimbed > 0 && (
          <HealthMetric icon="🪜" value={`${day.floorsClimbed}`} label="floors" color="#84cc16" />
        )}
      </div>
      {day.exerciseSessions && day.exerciseSessions.length > 0 && (
        <div className="mt-4 border-t border-border pt-3 space-y-1.5">
          <div className="text-xs text-muted-foreground mb-1">Exercise</div>
          {day.exerciseSessions.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>🏋️</span>
              <span className="font-medium">{s.title || EXERCISE_NAMES[s.type] || "Exercise"}</span>
              <span className="text-muted-foreground">· {s.durationMinutes}min</span>
            </div>
          ))}
        </div>
      )}
      {day.sleepSessions && day.sleepSessions.length > 0 && (
        <div className="mt-3 border-t border-border pt-3 space-y-1.5">
          <div className="text-xs text-muted-foreground mb-1">Sleep Sessions</div>
          {day.sleepSessions.map((s, i) => {
            const start = new Date(s.startTime);
            const end = new Date(s.endTime);
            return (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🌙</span>
                <span>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span>· {formatSleepMins(s.durationMinutes)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HealthWeekSummary({ data }: { data: DailyHealthData[] }) {
  const stats = useMemo(() => {
    const avg = (arr: (number | undefined)[]) => {
      const valid = arr.filter((v): v is number => v != null && v > 0);
      return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    };
    return {
      days: data.length,
      avgSteps: avg(data.map(d => d.steps)),
      avgSleep: avg(data.map(d => d.sleepMinutes)),
      avgHR: avg(data.map(d => d.heartRateAvg)),
      avgRestingHR: avg(data.map(d => d.restingHeartRate)),
      exerciseDays: data.filter(d => d.exerciseSessions && d.exerciseSessions.length > 0).length,
    };
  }, [data]);

  const hasAny = stats.avgSteps > 0 || stats.avgSleep > 0 || stats.avgHR > 0;
  if (!hasAny) return null;

  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">{stats.days}-Day Health Summary</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.avgSteps > 0 && (
          <div>
            <div className="text-2xl font-semibold text-blue-400">{stats.avgSteps >= 1000 ? `${(stats.avgSteps / 1000).toFixed(1)}k` : stats.avgSteps}</div>
            <div className="text-xs text-muted-foreground">avg steps/day</div>
          </div>
        )}
        {stats.avgSleep > 0 && (
          <div>
            <div className="text-2xl font-semibold text-indigo-400">{formatSleepMins(stats.avgSleep)}</div>
            <div className="text-xs text-muted-foreground">avg sleep</div>
          </div>
        )}
        {stats.avgHR > 0 && (
          <div>
            <div className="text-2xl font-semibold text-red-400">{stats.avgHR}</div>
            <div className="text-xs text-muted-foreground">avg bpm</div>
          </div>
        )}
        {stats.avgRestingHR > 0 && (
          <div>
            <div className="text-2xl font-semibold text-pink-400">{stats.avgRestingHR}</div>
            <div className="text-xs text-muted-foreground">resting bpm</div>
          </div>
        )}
      </div>
      {stats.exerciseDays > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">Exercised {stats.exerciseDays} of {stats.days} days</div>
      )}
    </section>
  );
}
