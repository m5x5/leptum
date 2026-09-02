"use client";

import { useMemo } from "react";
import type { Goal, Impact } from "../../../lib/remoteStorage";
import Link from "next/link";
import { useNow } from "../../../hooks/useNow";

// ─── Utility ─────────────────────────────────────────────────────────────────

function toDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatMinutes(m: number): string {
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
}

// ─── Don't Break the Chain ───────────────────────────────────────────────────

interface HabitChainProps {
  completions: Array<{ completedAt: number }>;
  currentDate: string;
  longestStreak?: number;
}

export function HabitChain({ completions, currentDate, longestStreak = 0 }: HabitChainProps) {
  const { days, streak, message } = useMemo(() => {
    const completionDates = new Set(completions.map(c => toDateKey(c.completedAt)));
    const dayList: Array<{ date: string; completed: boolean; isToday: boolean; label: string }> = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(currentDate + "T12:00:00");
      d.setDate(d.getDate() - i);
      const key = toDateKey(d.getTime());
      dayList.push({
        date: key,
        completed: completionDates.has(key),
        isToday: key === currentDate,
        label: String(d.getDate()),
      });
    }

    // Calculate streak
    let s = 0;
    for (let i = dayList.length - 1; i >= 0; i--) {
      if (dayList[i].completed) s++;
      else if (dayList[i].isToday) continue; // today can still be completed
      else break;
    }

    const msg =
      s === 0 ? "Start your chain today!" :
      s <= 3 ? "Good start! Don't break it!" :
      s <= 7 ? "Building momentum!" :
      s <= 14 ? "Two weeks strong!" :
      s <= 30 ? "Unstoppable!" :
      "Legendary streak!";

    return { days: dayList, streak: s, message: msg };
  }, [completions, currentDate]);

  const bestPct = longestStreak > 0 ? Math.min((streak / longestStreak) * 100, 100) : 0;
  const isNewRecord = longestStreak > 0 && streak >= longestStreak;

  return (
    <section className="bg-card border border-border rounded-card p-5">
      <h2 className="text-xs font-semibold text-muted-foreground mb-3">The Chain</h2>

      {/* Streak hero */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl font-semibold text-orange-400 flex items-center gap-1">
          <span>{"\u{1F525}"}</span>
          {streak}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-1">
            {isNewRecord ? "New record!" : longestStreak > 0 ? `Best: ${longestStreak} days` : "No record yet"}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-400 transition-all" style={{ width: `${bestPct}%` }} />
          </div>
        </div>
      </div>

      {/* 30-day grid */}
      <div className="grid grid-cols-10 gap-1">
        {days.map(day => (
          <Link key={day.date} href={`/day/${day.date}`}>
            <div
              className={`w-full aspect-square rounded-full flex items-center justify-center text-xs transition-all ${
                day.completed
                  ? "bg-green-500 text-white"
                  : day.isToday
                    ? "border-2 border-green-400 animate-pulse text-green-400"
                    : "bg-muted/50 text-muted-foreground"
              }`}
              title={day.date}
            >
              {day.label}
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center italic">{message}</div>
    </section>
  );
}

// ─── Goal Progress Rings ─────────────────────────────────────────────────────

interface GoalProgressProps {
  goals: Goal[];
  impacts: Impact[];
  currentDate: string;
}

// Waking-hour window used for "tracked vs untracked" math.
const WAKING_START_HOUR = 7;
const WAKING_END_HOUR = 23;
const WAKING_MIN_PER_DAY = (WAKING_END_HOUR - WAKING_START_HOUR) * 60;

export function GoalProgress({ goals, impacts, currentDate }: GoalProgressProps) {
  const now = useNow();

  const goalData = useMemo(() => {
    const d = new Date(currentDate + "T12:00:00");
    const dow = d.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(monday.getDate() + mondayOffset);
    const weekStartTs = new Date(monday.toISOString().slice(0, 10) + "T00:00:00").getTime();

    const lastMonday = new Date(monday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastWeekStart = new Date(lastMonday.toISOString().slice(0, 10) + "T00:00:00").getTime();

    return goals
      .filter(g => g.status !== "completed" && g.status !== "archived")
      .map(g => {
        const goalImpacts = impacts.filter(i => i.goalId === g.id && !i.allDay && i.endTime);
        const thisWeekMins = goalImpacts
          .filter(i => i.date >= weekStartTs)
          .reduce((s, i) => s + ((i.endTime ?? i.date) - i.date) / 60000, 0);
        const lastWeekMins = goalImpacts
          .filter(i => i.date >= lastWeekStart && i.date < weekStartTs)
          .reduce((s, i) => s + ((i.endTime ?? i.date) - i.date) / 60000, 0);

        const milestonePct = g.milestones && g.milestones.length > 0
          ? (g.milestones.filter(m => m.completed).length / g.milestones.length) * 100
          : null;

        const daysUntilDeadline = g.targetDate && g.targetDate > 0
          ? Math.ceil((g.targetDate - now) / 86400000)
          : null;

        return {
          goal: g,
          thisWeekMins,
          lastWeekMins,
          trend: thisWeekMins > lastWeekMins ? "up" as const : thisWeekMins < lastWeekMins ? "down" as const : "same" as const,
          milestonePct,
          daysUntilDeadline,
        };
      })
      .sort((a, b) => b.thisWeekMins - a.thisWeekMins);
  }, [goals, impacts, currentDate, now]);

  // Untracked time this week: total waking minutes elapsed (Mon → now/today end)
  // minus minutes covered by any tracked impact (across all goals or unassigned).
  const weekUntracked = useMemo(() => {
    const d = new Date(currentDate + "T12:00:00");
    const dow = d.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(monday.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const weekStartTs = monday.getTime();

    const todayEnd = new Date(d); todayEnd.setHours(23, 59, 59, 999);
    const cap = Math.min(now, todayEnd.getTime());

    // Available waking minutes: 7:00–23:00 each day, but only count up to "cap".
    let available = 0;
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday); day.setDate(day.getDate() + i);
      const wakingStart = new Date(day); wakingStart.setHours(WAKING_START_HOUR, 0, 0, 0);
      const wakingEnd = new Date(day); wakingEnd.setHours(WAKING_END_HOUR, 0, 0, 0);
      if (wakingStart.getTime() > cap) break;
      const upper = Math.min(wakingEnd.getTime(), cap);
      if (upper > wakingStart.getTime()) {
        available += (upper - wakingStart.getTime()) / 60000;
      }
    }

    // Tracked: sum of all impacts in this week (regardless of goal), clipped to waking window.
    let tracked = 0;
    impacts.forEach(i => {
      if (i.allDay || !i.endTime) return;
      const s = i.date;
      const e = i.endTime;
      if (e <= weekStartTs || s >= cap) return;
      // Clip to each day's waking window
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const day = new Date(monday); day.setDate(day.getDate() + dayIdx);
        const wakingStart = new Date(day); wakingStart.setHours(WAKING_START_HOUR, 0, 0, 0);
        const wakingEnd = new Date(day); wakingEnd.setHours(WAKING_END_HOUR, 0, 0, 0);
        const lo = Math.max(s, wakingStart.getTime());
        const hi = Math.min(e, wakingEnd.getTime(), cap);
        if (hi > lo) tracked += (hi - lo) / 60000;
      }
    });

    const untracked = Math.max(0, available - tracked);
    return { untracked, available, tracked };
  }, [impacts, currentDate, now]);

  if (goalData.length === 0) return null;

  const trackedPct = weekUntracked.available > 0
    ? (weekUntracked.tracked / weekUntracked.available) * 100
    : 0;

  return (
    <section className="bg-card border border-border rounded-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground">Goal Progress</h2>
        {weekUntracked.available > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <span className="text-foreground font-semibold">{formatMinutes(weekUntracked.untracked)}</span> untracked this week
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="tabular-nums">{Math.round(trackedPct)}% tracked</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {goalData.map(({ goal, thisWeekMins, trend, milestonePct, daysUntilDeadline }) => {
          const circumference = 2 * Math.PI * 18;
          const pctFill = milestonePct !== null ? milestonePct : Math.min((thisWeekMins / 60) * 10, 100); // 10h/week = full if no milestones

          return (
            <div key={goal.id} className="flex items-center gap-3">
              {/* Progress ring */}
              <div className="relative w-10 h-10 shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                  <circle
                    cx="20" cy="20" r="18" fill="none" strokeWidth="3"
                    stroke={goal.color ?? "#3b82f6"}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (pctFill / 100) * circumference}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {Math.round(pctFill)}%
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{goal.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatMinutes(thisWeekMins)}</span>
                  {trend === "up" && <span className="text-green-400 text-xs">↑</span>}
                  {trend === "down" && <span className="text-red-400 text-xs">↓</span>}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>this week</span>
                  {daysUntilDeadline !== null && (
                    <span className={daysUntilDeadline <= 3 ? "text-red-400" : daysUntilDeadline <= 7 ? "text-yellow-400" : ""}>
                      {daysUntilDeadline > 0 ? `${daysUntilDeadline}d left` : "Overdue"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
