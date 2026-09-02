import { useCallback, useMemo, useState } from 'react';
import { formatMinutesToReadable } from '../../utils/timeCalculations';
import { useNow } from '../../hooks/useNow';
import { Button } from '../ui/button';

interface Impact {
  id?: string;
  activity: string;
  date: number;
  endTime?: number;
  goalId?: string;
  allDay?: boolean;
  requiresOnlineTime?: boolean;
}

interface Goal {
  id: string;
  name: string;
  color?: string;
  type?: string;
}

interface GoalType {
  id: string;
  name: string;
}

interface TimelineMonthViewProps {
  impacts: Impact[];
  goals: Goal[];
  goalTypes?: GoalType[];
  isToday: (timestamp: number) => boolean;
  getDurationInMs: (startTime: number, endTime: number) => number;
  monthDate: Date; // any date in the target month
}

const BG_CLASS_TO_CSS: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#22c55e',
  'bg-yellow-500': '#eab308',
  'bg-red-500': '#ef4444',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
  'bg-teal-500': '#14b8a6',
  'bg-orange-500': '#f97316',
  'bg-cyan-500': '#06b6d4',
  'bg-emerald-500': '#10b981',
  'bg-lime-500': '#84cc16',
  'bg-amber-500': '#f59e0b',
  'bg-rose-500': '#f43f5e',
  'bg-violet-500': '#8b5cf6',
  'bg-fuchsia-500': '#d946ef',
  'bg-sky-500': '#0ea5e9',
  'bg-primary': 'hsl(var(--primary))',
};

function tailwindBgToCSS(bgClass: string): string {
  return BG_CLASS_TO_CSS[bgClass] || '#6b7280';
}

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function clipDurationToDay(startMs: number, endMs: number, dayDateKey: string): number {
  const [y, m, d] = dayDateKey.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  const clippedStart = Math.max(startMs, dayStart);
  const clippedEnd = Math.min(endMs, dayEnd);
  return Math.max(0, clippedEnd - clippedStart);
}

export function TimelineMonthView({
  impacts,
  goals,
  goalTypes = [],
  isToday,
  getDurationInMs,
  monthDate,
}: TimelineMonthViewProps) {
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const goalsMap = useMemo(() => new Map(goals.map(g => [g.id, g])), [goals]);
  const goalTypesMap = useMemo(() => new Map(goalTypes.map(gt => [gt.id, gt])), [goalTypes]);

  const activeMonth = useMemo(() => {
    const d = new Date(monthDate);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthDate, monthOffset]);

  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = useNow();

  // Generate all days in the month
  const days = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    [year, month, daysInMonth]
  );

  // Build per-day goal breakdown
  const dayData = useMemo(() => {
    // Index impacts by day (including overnight splits)
    const impactsByDay: Record<string, Impact[]> = {};
    impacts.forEach(impact => {
      if (impact.allDay) return;
      const startKey = getDateKey(impact.date);
      if (!impactsByDay[startKey]) impactsByDay[startKey] = [];
      impactsByDay[startKey].push(impact);

      if (impact.endTime) {
        const endKey = getDateKey(impact.endTime);
        if (endKey !== startKey) {
          const startDate = new Date(impact.date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(impact.endTime);
          endDate.setHours(0, 0, 0, 0);
          const d = new Date(startDate);
          d.setDate(d.getDate() + 1);
          while (d <= endDate) {
            const dk = getDateKey(d.getTime());
            if (!impactsByDay[dk]) impactsByDay[dk] = [];
            impactsByDay[dk].push(impact);
            d.setDate(d.getDate() + 1);
          }
        }
      }
    });

    return days.map(date => {
      const dateKey = getDateKey(date.getTime());
      const dayImpacts = (impactsByDay[dateKey] || []).sort((a, b) => a.date - b.date);
      const isFuture = date.getTime() > now && !isToday(date.getTime());

      const goalMins: Record<string, number> = {};
      let totalTracked = 0;

      dayImpacts.forEach((impact, idx) => {
        const nextImpact = dayImpacts[idx + 1];
        const endTime = impact.endTime ?? (nextImpact ? nextImpact.date : (impact.date + 3600000));
        const clippedMs = clipDurationToDay(impact.date, endTime, dateKey);
        const mins = Math.round(clippedMs / 60000);
        if (mins === 0) return;
        totalTracked += mins;
        const key = impact.goalId || '__none__';
        goalMins[key] = (goalMins[key] || 0) + mins;
      });

      const available = isFuture ? 0 : isToday(date.getTime())
        ? Math.round((now - new Date(date).setHours(0, 0, 0, 0)) / 60000)
        : 24 * 60;
      const untracked = Math.max(0, available - totalTracked);

      return { date, dateKey, goalMins, totalTracked, untracked, available, isFuture };
    });
  }, [days, impacts, now, isToday]);

  // Compute dominant color per category (most common color among its goals)
  const categoryColors = useMemo(() => {
    const colorCounts: Record<string, Record<string, number>> = {};
    goals.forEach(g => {
      const catId = g.type || '__none__';
      if (!colorCounts[catId]) colorCounts[catId] = {};
      const color = g.color || 'bg-blue-500';
      colorCounts[catId][color] = (colorCounts[catId][color] || 0) + 1;
    });
    const result: Record<string, string> = {};
    Object.entries(colorCounts).forEach(([catId, counts]) => {
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      result[catId] = dominant ? tailwindBgToCSS(dominant[0]) : '#6b7280';
    });
    return result;
  }, [goals]);

  // Helper: map goalId to category key
  const goalToCategory = useCallback((goalId: string): string => {
    if (goalId === '__none__') return '__none__';
    const goal = goalsMap.get(goalId);
    return goal?.type || '__none__';
  }, [goalsMap]);

  // Re-key dayData goalMins by category when grouping
  const dayDataGrouped = useMemo(() => {
    if (!groupByCategory || goalTypes.length === 0) return dayData;
    return dayData.map(d => {
      const catMins: Record<string, number> = {};
      Object.entries(d.goalMins).forEach(([goalId, mins]) => {
        const catKey = goalToCategory(goalId);
        catMins[catKey] = (catMins[catKey] || 0) + mins;
      });
      return { ...d, goalMins: catMins };
    });
  }, [dayData, groupByCategory, goalTypes.length, goalToCategory]);

  // Aggregate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let totalTracked = 0;
    let totalUntracked = 0;

    dayDataGrouped.forEach(d => {
      totalTracked += d.totalTracked;
      totalUntracked += d.untracked;
      Object.entries(d.goalMins).forEach(([key, mins]) => {
        totals[key] = (totals[key] || 0) + mins;
      });
    });

    const sorted = Object.entries(totals)
      .map(([key, mins]) => {
        if (groupByCategory && goalTypes.length > 0) {
          const cat = key === '__none__' ? undefined : goalTypesMap.get(key);
          return { key, label: cat?.name || 'No category', color: categoryColors[key] || '#6b7280', mins };
        } else {
          const goal = key === '__none__' ? undefined : goalsMap.get(key);
          const cssColor = goal?.color
            ? tailwindBgToCSS(goal.color) !== '#6b7280' ? tailwindBgToCSS(goal.color) : goal.color
            : '#6b7280';
          return { key, label: goal?.name || 'No goal', color: cssColor, mins };
        }
      })
      .sort((a, b) => b.mins - a.mins);

    return { sorted, totalTracked, totalUntracked };
  }, [dayDataGrouped, groupByCategory, goalTypes.length, goalsMap, goalTypesMap, categoryColors]);

  // Find the max daily total for chart scaling
  const maxDayMins = useMemo(() =>
    Math.max(1, ...dayDataGrouped.map(d => d.totalTracked + d.untracked)),
    [dayDataGrouped]
  );

  // Collect keys in order for consistent stacking
  const stackOrder = useMemo(() =>
    monthlyTotals.sorted.map(g => g.key),
    [monthlyTotals]
  );

  // Build a color map for chart bars
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    monthlyTotals.sorted.forEach(({ key, color }) => { map[key] = color; });
    return map;
  }, [monthlyTotals]);

  const monthName = activeMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="mb-4 flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonthOffset(o => o - 1)}
          className="text-muted-foreground"
          aria-label="Previous month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </Button>
        <span className="text-sm font-medium text-foreground min-w-0 sm:min-w-[140px] text-center truncate">{monthName}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonthOffset(o => o + 1)}
          className="text-muted-foreground"
          aria-label="Next month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>

      {/* Monthly Summary */}
      <div className="mb-6 rounded-control border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">By {groupByCategory ? 'Category' : 'Goal'}</h3>
            {goalTypes.length > 0 && (
              <button
                onClick={() => setGroupByCategory(!groupByCategory)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  groupByCategory
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {groupByCategory ? 'Categories' : 'Goals'}
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatMinutesToReadable(monthlyTotals.totalTracked)} tracked
          </span>
        </div>
        <div className="space-y-2">
          {monthlyTotals.sorted.map(({ key, label, color, mins }) => {
            const total = monthlyTotals.totalTracked + monthlyTotals.totalUntracked;
            const pct = total > 0 ? (mins / total) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-cell shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-foreground">{label}</span>
                  </div>
                  <span className="text-muted-foreground">{formatMinutesToReadable(mins)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
          {monthlyTotals.totalUntracked > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-cell shrink-0 border border-border" style={{ backgroundColor: 'transparent' }} />
                  <span className="text-muted-foreground">Untracked</span>
                </div>
                <span className="text-muted-foreground">{formatMinutesToReadable(monthlyTotals.totalUntracked)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-muted-foreground/20 transition-all"
                  style={{ width: `${(monthlyTotals.totalUntracked / (monthlyTotals.totalTracked + monthlyTotals.totalUntracked)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stacked Bar Chart — one bar per day */}
      <div className="rounded-control border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Daily Breakdown</h3>
        <div className="flex items-end gap-[2px] h-48">
          {dayDataGrouped.map((d) => {
            const total = d.totalTracked + d.untracked;
            const barHeight = maxDayMins > 0 ? (total / maxDayMins) * 100 : 0;
            const isTodayFlag = isToday(d.date.getTime());

            return (
              <div
                key={d.dateKey}
                className="flex-1 flex flex-col items-center gap-0.5 h-full"
                title={`${d.date.getDate()}: ${formatMinutesToReadable(d.totalTracked)} tracked, ${formatMinutesToReadable(d.untracked)} untracked`}
              >
                <div className="w-full flex-1 flex flex-col justify-end">
                  {!d.isFuture && total > 0 && (
                    <div
                      className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse"
                      style={{ height: `${barHeight}%` }}
                    >
                      {/* Untracked slice */}
                      {d.untracked > 0 && (
                        <div
                          style={{
                            height: `${(d.untracked / total) * 100}%`,
                            backgroundColor: 'hsl(var(--muted))',
                          }}
                        />
                      )}
                      {/* Stacked slices */}
                      {stackOrder.map(key => {
                        const mins = d.goalMins[key];
                        if (!mins) return null;
                        return (
                          <div
                            key={key}
                            style={{
                              height: `${(mins / total) * 100}%`,
                              backgroundColor: colorMap[key] || '#6b7280',
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className={`text-xs leading-none ${isTodayFlag ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {d.date.getDate() === 1 || d.date.getDate() % 5 === 0 || isTodayFlag
                    ? d.date.getDate()
                    : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-border">
          {monthlyTotals.sorted.slice(0, 8).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-cell" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-cell border border-border" style={{ backgroundColor: 'transparent' }} />
            <span>Untracked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
