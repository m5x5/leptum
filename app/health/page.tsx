"use client";

import { useEffect, useState, useMemo } from "react";
import { remoteStorageClient, type DailyHealthData } from "../../lib/remoteStorage";
import { Spinner } from "../../components/ui/spinner";
import { Button } from "../../components/ui/button";
import { useTimeFormat } from "../../utils/useTimeFormat";
import { CodeIcon } from "@heroicons/react/outline";
import { ExperimentGate } from "../../components/ExperimentGate";

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

function formatSteps(steps: number): string {
  return steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : `${steps}`;
}

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function formatDate(dateStr: string, use24Hour: boolean): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(use24Hour ? "de-DE" : "en-US", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatClockTime(value: string, use24Hour: boolean): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

function uniqueBy<T>(items: T[] | undefined, keyFn: (item: T) => string): T[] {
  if (!items) return [];
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeDuplicateDays(days: DailyHealthData[]): DailyHealthData[] {
  const byDate = new Map<string, DailyHealthData>();
  const maxNumber = (a?: number, b?: number) => {
    if (a == null) return b;
    if (b == null) return a;
    return Math.max(a, b);
  };

  for (const rawDay of days) {
    const day = { ...rawDay, date: rawDay.date.slice(0, 10) };
    const existing = byDate.get(day.date);
    if (!existing) {
      const sleepSessions = uniqueBy(day.sleepSessions, (s) => `${s.startTime}:${s.endTime}`);
      byDate.set(day.date, {
        ...day,
        sleepSessions,
        exerciseSessions: uniqueBy(day.exerciseSessions, (s) => `${s.type}:${s.title ?? ""}:${s.startTime}:${s.endTime}`),
        sleepMinutes: sleepSessions.length > 0
          ? sleepSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
          : day.sleepMinutes,
      });
      continue;
    }

    const sleepSessions = uniqueBy([...(existing.sleepSessions ?? []), ...(day.sleepSessions ?? [])], (s) => `${s.startTime}:${s.endTime}`);
    byDate.set(day.date, {
      ...existing,
      ...day,
      steps: maxNumber(existing.steps, day.steps),
      distanceMeters: maxNumber(existing.distanceMeters, day.distanceMeters),
      activeCalories: maxNumber(existing.activeCalories, day.activeCalories),
      totalCalories: maxNumber(existing.totalCalories, day.totalCalories),
      sleepMinutes: sleepSessions.length > 0
        ? sleepSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
        : maxNumber(existing.sleepMinutes, day.sleepMinutes),
      heartRateAvg: maxNumber(existing.heartRateAvg, day.heartRateAvg),
      heartRateMin: maxNumber(existing.heartRateMin, day.heartRateMin),
      heartRateMax: maxNumber(existing.heartRateMax, day.heartRateMax),
      restingHeartRate: maxNumber(existing.restingHeartRate, day.restingHeartRate),
      hrvRmssd: maxNumber(existing.hrvRmssd, day.hrvRmssd),
      weightKg: maxNumber(existing.weightKg, day.weightKg),
      bodyFatPct: maxNumber(existing.bodyFatPct, day.bodyFatPct),
      bloodPressureSystolic: maxNumber(existing.bloodPressureSystolic, day.bloodPressureSystolic),
      bloodPressureDiastolic: maxNumber(existing.bloodPressureDiastolic, day.bloodPressureDiastolic),
      bloodGlucoseMmol: maxNumber(existing.bloodGlucoseMmol, day.bloodGlucoseMmol),
      oxygenSaturationPct: maxNumber(existing.oxygenSaturationPct, day.oxygenSaturationPct),
      floorsClimbed: maxNumber(existing.floorsClimbed, day.floorsClimbed),
      exerciseSessions: uniqueBy([...(existing.exerciseSessions ?? []), ...(day.exerciseSessions ?? [])], (s) => `${s.type}:${s.title ?? ""}:${s.startTime}:${s.endTime}`),
      sleepSessions,
    });
  }
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

interface MetricProps {
  icon: string;
  value: string;
  label: string;
  color: string;
}

function MetricChip({ icon, value, label, color }: MetricProps) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-foreground"
      style={{ borderColor: color }}
    >
      <span>{icon}</span>
      <span className="font-semibold">{value}</span>
      <span className="opacity-70 text-xs">{label}</span>
    </div>
  );
}

function HealthChart({ data }: { data: DailyHealthData[] }) {
  const days = useMemo(() => data.slice(0, 14).reverse(), [data]);
  if (days.length === 0) return null;

  const maxSteps = Math.max(...days.map((d) => d.steps ?? 0), 1);
  const maxSleep = Math.max(...days.map((d) => d.sleepMinutes ?? 0), 1);

  return (
    <div className="bg-card border border-border rounded-card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Steps and sleep</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />steps</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400" />sleep</span>
        </div>
      </div>
      <div className="flex h-48 items-end gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const stepsHeight = Math.max(4, ((day.steps ?? 0) / maxSteps) * 100);
          const sleepHeight = Math.max(4, ((day.sleepMinutes ?? 0) / maxSleep) * 100);
          const d = new Date(day.date + "T00:00:00");
          return (
            <div key={day.date} tabIndex={0} className="group relative flex min-w-12 flex-1 flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-control">
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-control border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl group-hover:block group-focus:block group-focus-within:block group-active:block">
                <div className="font-medium">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                {(day.steps ?? 0) > 0 && <div className="text-orange-400">{formatSteps(day.steps ?? 0)} steps</div>}
                {(day.sleepMinutes ?? 0) > 0 && <div className="text-indigo-400">{formatSleep(day.sleepMinutes ?? 0)} sleep</div>}
              </div>
              <div className="flex h-36 w-full items-end justify-center gap-1">
                {(day.steps ?? 0) > 0 && (
                  <div className="w-3 rounded-t bg-orange-400" style={{ height: `${stepsHeight}%` }} title={`${formatSteps(day.steps ?? 0)} steps`} />
                )}
                {(day.sleepMinutes ?? 0) > 0 && (
                  <div className="w-3 rounded-t bg-indigo-400" style={{ height: `${sleepHeight}%` }} title={`${formatSleep(day.sleepMinutes ?? 0)} sleep`} />
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekSummary({ data }: { data: DailyHealthData[] }) {
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const avg = (arr: (number | undefined)[]) => {
      const valid = arr.filter((v): v is number => v != null && v > 0);
      return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    };
    return {
      days: data.length,
      avgSteps: avg(data.map((d) => d.steps)),
      avgSleep: avg(data.map((d) => d.sleepMinutes)),
      avgHR: avg(data.map((d) => d.heartRateAvg)),
      avgRestingHR: avg(data.map((d) => d.restingHeartRate)),
      totalExerciseDays: data.filter((d) => d.exerciseSessions && d.exerciseSessions.length > 0).length,
    };
  }, [data]);

  if (!stats || stats.days < 2) return null;

  return (
    <div className="bg-card border border-border rounded-card p-5 mb-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        {stats.days}-Day Summary
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.avgSteps > 0 && (
          <div>
            <div className="text-2xl font-semibold">{formatSteps(stats.avgSteps)}</div>
            <div className="text-xs text-muted-foreground">avg steps/day</div>
          </div>
        )}
        {stats.avgSleep > 0 && (
          <div>
            <div className="text-2xl font-semibold">{formatSleep(stats.avgSleep)}</div>
            <div className="text-xs text-muted-foreground">avg sleep</div>
          </div>
        )}
        {stats.avgHR > 0 && (
          <div>
            <div className="text-2xl font-semibold">{stats.avgHR}</div>
            <div className="text-xs text-muted-foreground">avg bpm</div>
          </div>
        )}
        {stats.avgRestingHR > 0 && (
          <div>
            <div className="text-2xl font-semibold">{stats.avgRestingHR}</div>
            <div className="text-xs text-muted-foreground">resting bpm</div>
          </div>
        )}
      </div>
      {stats.totalExerciseDays > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Exercised {stats.totalExerciseDays} of {stats.days} days
        </div>
      )}
    </div>
  );
}

function DayCard({ day, use24Hour, developerMode }: { day: DailyHealthData; use24Hour: boolean; developerMode: boolean }) {
  const exerciseSessions = uniqueBy(day.exerciseSessions, (s) => `${s.type}:${s.title ?? ""}:${s.startTime}:${s.endTime}`);
  const sleepSessions = uniqueBy(day.sleepSessions, (s) => `${s.startTime}:${s.endTime}`);
  const isToday = day.date === new Date().toISOString().slice(0, 10);

  return (
    <div className={`rounded-card border px-4 pt-4 pb-3 ${isToday ? "border-primary bg-primary/5" : "bg-card"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📅</span>
        <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
          {formatDate(day.date, use24Hour)}
        </span>
        {developerMode && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(day, null, 2))}
            className="ml-auto text-muted-foreground"
            title="Copy raw health JSON"
            aria-label="Copy raw health JSON"
          >
            <CodeIcon />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {day.steps != null && day.steps > 0 && (
          <MetricChip icon="👟" value={formatSteps(day.steps)} label="steps" color="#3b82f6" />
        )}
        {day.distanceMeters != null && day.distanceMeters > 0 && (
          <MetricChip icon="📏" value={formatDistance(day.distanceMeters)} label="" color="#14b8a6" />
        )}
        {day.activeCalories != null && day.activeCalories > 0 && (
          <MetricChip icon="🔥" value={`${day.activeCalories}`} label="kcal" color="#f97316" />
        )}
        {day.sleepMinutes != null && day.sleepMinutes > 0 && (
          <MetricChip icon="😴" value={formatSleep(day.sleepMinutes)} label="sleep" color="#6366f1" />
        )}
        {day.heartRateAvg != null && day.heartRateAvg > 0 && (
          <MetricChip icon="💓" value={`${day.heartRateAvg}`} label="avg bpm" color="#ef4444" />
        )}
        {day.restingHeartRate != null && day.restingHeartRate > 0 && (
          <MetricChip icon="🫀" value={`${day.restingHeartRate}`} label="resting" color="#ec4899" />
        )}
        {day.hrvRmssd != null && day.hrvRmssd > 0 && (
          <MetricChip icon="📈" value={`${day.hrvRmssd}`} label="ms HRV" color="#a855f7" />
        )}
        {day.weightKg != null && (
          <MetricChip icon="⚖️" value={`${day.weightKg}`} label="kg" color="#22c55e" />
        )}
        {day.bodyFatPct != null && (
          <MetricChip icon="📊" value={`${day.bodyFatPct}%`} label="body fat" color="#a3763d" />
        )}
        {day.bloodPressureSystolic != null && (
          <MetricChip
            icon="🩺"
            value={`${day.bloodPressureSystolic}/${day.bloodPressureDiastolic}`}
            label="mmHg"
            color="#ea580c"
          />
        )}
        {day.bloodGlucoseMmol != null && (
          <MetricChip icon="💉" value={`${day.bloodGlucoseMmol}`} label="mmol/L" color="#eab308" />
        )}
        {day.oxygenSaturationPct != null && (
          <MetricChip icon="🫁" value={`${day.oxygenSaturationPct}%`} label="SpO₂" color="#06b6d4" />
        )}
        {day.floorsClimbed != null && day.floorsClimbed > 0 && (
          <MetricChip icon="🪜" value={`${day.floorsClimbed}`} label="floors" color="#84cc16" />
        )}
      </div>

      {/* Exercise sessions */}
      {exerciseSessions.length > 0 && (
        <div className="mt-3 border-t pt-2 space-y-1">
          {exerciseSessions.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>🏋️</span>
              <span className="font-medium">
                {s.title || EXERCISE_NAMES[s.type] || "Exercise"}
              </span>
              <span className="text-muted-foreground">· {s.durationMinutes}min</span>
            </div>
          ))}
        </div>
      )}

      {/* Sleep sessions detail */}
      {sleepSessions.length > 0 && (
        <div className="mt-2 border-t pt-2 space-y-1">
          {sleepSessions.map((s, i) => {
            return (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🌙</span>
                <span>
                  {formatClockTime(s.startTime, use24Hour)} – {formatClockTime(s.endTime, use24Hour)}
                </span>
                <span>· {formatSleep(s.durationMinutes)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HealthPage() {
  return (
    <ExperimentGate id="health">
      <HealthPageContent />
    </ExperimentGate>
  );
}

function HealthPageContent() {
  const [data, setData] = useState<DailyHealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const { use24Hour } = useTimeFormat();
  const [developerMode, setDeveloperMode] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('developerMode') === 'true'
  );
  const dedupedData = useMemo(() => mergeDuplicateDays(data), [data]);

  useEffect(() => {
    const syncDeveloperMode = () => setDeveloperMode(localStorage.getItem('developerMode') === 'true');
    window.addEventListener('developerModeChanged', syncDeveloperMode);
    return () => window.removeEventListener('developerModeChanged', syncDeveloperMode);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await remoteStorageClient.getHealthData();
        if (!cancelled) setData(result);
      } catch (err) {
        console.error("Failed to load health data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <span className="text-4xl mb-4">🫀</span>
        <h2 className="text-lg font-semibold">No health data</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Health data from Health Connect will appear here once synced from the Leptum Android app.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6 w-full">
      <div>
        <HealthChart data={dedupedData} />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {dedupedData.map((day) => (
          <div key={day.date} className="w-[420px] max-w-[85vw] shrink-0 snap-start">
            <DayCard day={day} use24Hour={use24Hour} developerMode={developerMode} />
          </div>
        ))}
      </div>
    </div>
  );
}
