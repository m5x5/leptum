import { useState } from 'react';
import { GCalBadge } from '../ui/gcal-badge';
import { formatMinutesToReadable } from '../../utils/timeCalculations';
import { useNow } from '../../hooks/useNow';

// Map Tailwind bg classes to CSS colors for table color dots
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

interface Impact {
  id?: string;
  activity: string;
  date: number;
  endTime?: number;
  goalId?: string;
  stress?: string | number;
  fulfillment?: string | number;
  motivation?: string | number;
  cleanliness?: string | number;
  energy?: string | number;
  sourceUrl?: string;
  isVirtualContinuation?: boolean;
  originalStartTime?: number;
  photoIds?: string[];
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

interface TimelineWeekViewProps {
  impacts: Impact[];
  goals: Goal[];
  goalTypes?: GoalType[];
  onEditActivity: (impact: Impact, index: number) => void;
  onAddActivity: (dateKey: string) => void;
  getActivityColor: (impact: Impact) => string;
  formatDate: (timestamp: number) => string;
  formatTime: (timestamp: number) => string;
  isToday: (timestamp: number) => boolean;
  getDurationInMs: (startTime: number, endTime: number) => number;
  weekStartDate: Date;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Clip an impact's duration to a specific day's boundaries (midnight to midnight). */
function clipDurationToDay(startMs: number, endMs: number, dayDateKey: string): number {
  const [y, m, d] = dayDateKey.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  const clippedStart = Math.max(startMs, dayStart);
  const clippedEnd = Math.min(endMs, dayEnd);
  return Math.max(0, clippedEnd - clippedStart);
}

export function TimelineWeekView({
  impacts,
  goals,
  goalTypes = [],
  onEditActivity,
  onAddActivity,
  getActivityColor,
  formatDate: _formatDate,
  formatTime,
  isToday,
  getDurationInMs,
  weekStartDate,
}: TimelineWeekViewProps) {
  const [groupByGoal, setGroupByGoal] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const now = useNow();

  const goalsMap = new Map(goals.map(g => [g.id, g]));
  const goalTypesMap = new Map(goalTypes.map(gt => [gt.id, gt]));

  // Dominant color per category
  const categoryColors: Record<string, string> = {};
  {
    const colorCounts: Record<string, Record<string, number>> = {};
    goals.forEach(g => {
      const catId = g.type || '__none__';
      if (!colorCounts[catId]) colorCounts[catId] = {};
      const color = g.color || 'bg-blue-500';
      colorCounts[catId][color] = (colorCounts[catId][color] || 0) + 1;
    });
    Object.entries(colorCounts).forEach(([catId, counts]) => {
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      categoryColors[catId] = dominant ? tailwindBgToCSS(dominant[0]) : '#6b7280';
    });
  }

  // Generate 7 days starting from weekStartDate
  const days = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + idx);
    return date;
  });

  // Group impacts by day, excluding all-day events.
  // Impacts that span midnight are added to both days.
  const groupedImpacts: { [dateKey: string]: Impact[] } = {};
  impacts.forEach((impact) => {
    if (impact.allDay) return;
    const startKey = getDateKey(impact.date);
    if (!groupedImpacts[startKey]) groupedImpacts[startKey] = [];
    groupedImpacts[startKey].push(impact);

    // If impact spans past midnight, also add to the next day(s)
    if (impact.endTime) {
      const endKey = getDateKey(impact.endTime);
      if (endKey !== startKey) {
        // Add to each day between start and end
        const startDate = new Date(impact.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(impact.endTime);
        endDate.setHours(0, 0, 0, 0);
        const d = new Date(startDate);
        d.setDate(d.getDate() + 1);
        while (d <= endDate) {
          const dk = getDateKey(d.getTime());
          if (!groupedImpacts[dk]) groupedImpacts[dk] = [];
          groupedImpacts[dk].push(impact);
          d.setDate(d.getDate() + 1);
        }
      }
    }
  });

  // Sort each day's impacts chronologically
  Object.keys(groupedImpacts).forEach((dateKey) => {
    groupedImpacts[dateKey].sort((a, b) => a.date - b.date);
  });

  return (
    <div className="w-full">
      {/* Weekly Goal Summary */}
      {(() => {
        // Compute per-goal totals, clipping durations to day boundaries
        const goalTotals = new Map<string, { goal: Goal | undefined; totalMins: number }>();
        for (const date of days) {
          const dateKey = getDateKey(date.getTime());
          const dayImpacts = groupedImpacts[dateKey] || [];
          dayImpacts.forEach((impact, idx) => {
            const nextImpact = dayImpacts[idx + 1];
            const endTime = impact.endTime ?? (nextImpact ? nextImpact.date : (impact.date + 3600000));
            const clippedMs = clipDurationToDay(impact.date, endTime, dateKey);
            const durationMins = Math.round(clippedMs / 60000);
            if (durationMins === 0) return;
            const key = impact.goalId || '__none__';
            const existing = goalTotals.get(key);
            if (existing) {
              existing.totalMins += durationMins;
            } else {
              goalTotals.set(key, {
                goal: impact.goalId ? goalsMap.get(impact.goalId) : undefined,
                totalMins: durationMins,
              });
            }
          });
        }

        const trackedMinutes = Array.from(goalTotals.values()).reduce((sum, g) => sum + g.totalMins, 0);

        // Calculate untracked time
        let totalAvailableMins = 0;
        for (const date of days) {
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          if (dayStart.getTime() > now) continue;
          if (isToday(date.getTime())) {
            totalAvailableMins += Math.round((now - dayStart.getTime()) / 60000);
          } else {
            totalAvailableMins += 24 * 60;
          }
        }
        const untrackedMinutes = Math.max(0, totalAvailableMins - trackedMinutes);
        const totalWithUntracked = trackedMinutes + untrackedMinutes;

        if (trackedMinutes === 0) return null;

        // Build display rows: either per-goal or per-category
        let displayRows: Array<{ key: string; label: string; color: string; totalMins: number }>;

        if (groupByCategory && goalTypes.length > 0) {
          const categoryTotals = new Map<string, { name: string; totalMins: number }>();
          goalTotals.forEach(({ goal, totalMins }) => {
            const catId = goal?.type || '__none__';
            const cat = goal?.type ? goalTypesMap.get(goal.type) : undefined;
            const existing = categoryTotals.get(catId);
            if (existing) {
              existing.totalMins += totalMins;
            } else {
              categoryTotals.set(catId, {
                name: cat?.name || 'No category',
                totalMins,
              });
            }
          });
          displayRows = Array.from(categoryTotals.entries())
            .sort((a, b) => b[1].totalMins - a[1].totalMins)
            .map(([key, { name, totalMins }]) => ({
              key,
              label: name,
              color: categoryColors[key] || '#6b7280',
              totalMins,
            }));
        } else {
          displayRows = Array.from(goalTotals.entries())
            .sort((a, b) => b[1].totalMins - a[1].totalMins)
            .map(([key, { goal, totalMins }]) => ({
              key,
              label: goal?.name || 'No goal',
              color: goal?.color
                ? tailwindBgToCSS(goal.color) !== '#6b7280' ? tailwindBgToCSS(goal.color) : goal.color
                : '#6b7280',
              totalMins,
            }));
        }

        return (
          <div className="mb-6 rounded-control border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {groupByCategory ? 'Week by Category' : 'Week by Goal'}
                </h3>
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
                {formatMinutesToReadable(trackedMinutes)} tracked
              </span>
            </div>
            <div className="space-y-2">
              {displayRows.map(({ key, label, color, totalMins }) => {
                const pct = totalWithUntracked > 0 ? (totalMins / totalWithUntracked) * 100 : 0;
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
                      <span className="text-muted-foreground">
                        {formatMinutesToReadable(totalMins)}
                      </span>
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
              {untrackedMinutes > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-cell shrink-0 border border-border"
                        style={{ backgroundColor: 'transparent' }}
                      />
                      <span className="text-muted-foreground">Untracked</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatMinutesToReadable(untrackedMinutes)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/20 transition-all"
                      style={{ width: `${totalWithUntracked > 0 ? (untrackedMinutes / totalWithUntracked) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Group by toggle */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setGroupByGoal(!groupByGoal)}
          className={`text-xs px-3 py-1.5 rounded-chip border transition-colors ${
            groupByGoal
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          {groupByGoal ? 'Grouped by goal' : 'Group by goal'}
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {days.map((date) => {
          const dateKey = getDateKey(date.getTime());
          const dayImpacts = groupedImpacts[dateKey] || [];
          const isTodayFlag = isToday(date.getTime());
          const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
          const dayNum = date.getDate();

          // Compute online time and total tracked time for the day, clipped to day boundaries
          let dayOnlineMins = 0;
          let dayTrackedMins = 0;
          dayImpacts.forEach((impact, idx) => {
            const nextImpact = dayImpacts[idx + 1];
            const endTime = impact.endTime ?? (nextImpact ? nextImpact.date : (impact.date + 3600000));
            const clippedMs = clipDurationToDay(impact.date, endTime, dateKey);
            const mins = Math.round(clippedMs / 60000);
            if (mins === 0) return;
            dayTrackedMins += mins;
            if (impact.requiresOnlineTime) dayOnlineMins += mins;
          });
          const isFuture = date.getTime() > now && !isTodayFlag;
          const dayAvailableMins = isFuture ? 0 : isTodayFlag
            ? Math.round((now - new Date(date).setHours(0, 0, 0, 0)) / 60000)
            : 24 * 60;
          const dayUntrackedMins = Math.max(0, dayAvailableMins - dayTrackedMins);

          return (
            <div
              key={dateKey}
              className={`rounded-control border ${
                isTodayFlag
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              } overflow-hidden`}
            >
              {/* Day Header */}
              <div className="p-3">
                <div className="flex items-baseline justify-between">
                  <div className="font-semibold text-foreground text-sm">
                    {dayOfWeek}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dayNum}
                  </div>
                </div>
                {!isFuture && dayOnlineMins > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatMinutesToReadable(dayOnlineMins)} online
                  </div>
                )}

                {/* Activity table */}
                {dayImpacts.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4 mt-2">
                    No activities
                  </div>
                ) : groupByGoal ? (
                  <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-xs mt-2">
                    <tbody>
                      {(() => {
                        const goalGroups = new Map<string, { goal: Goal | undefined; totalMins: number; firstStart: number }>();
                        dayImpacts.forEach((impact, idx) => {
                          const nextImpact = dayImpacts[idx + 1];
                          const endTime = impact.endTime ?? (nextImpact ? nextImpact.date : (impact.date + 3600000));
                          const clippedMs = clipDurationToDay(impact.date, endTime, dateKey);
                          const durationMins = Math.round(clippedMs / 60000);
                          if (durationMins === 0) return;
                          const key = impact.goalId || '__none__';
                          const existing = goalGroups.get(key);
                          if (existing) {
                            existing.totalMins += durationMins;
                            existing.firstStart = Math.min(existing.firstStart, impact.date);
                          } else {
                            goalGroups.set(key, {
                              goal: impact.goalId ? goalsMap.get(impact.goalId) : undefined,
                              totalMins: durationMins,
                              firstStart: impact.date,
                            });
                          }
                        });
                        return Array.from(goalGroups.entries())
                          .sort((a, b) => b[1].totalMins - a[1].totalMins)
                          .map(([key, { goal, totalMins, firstStart }]) => {
                            const cssColor = goal?.color
                              ? tailwindBgToCSS(goal.color) !== '#6b7280' ? tailwindBgToCSS(goal.color) : goal.color
                              : '#6b7280';
                            return (
                              <tr key={key} className="transition-colors">
                                <td className="py-1 pr-1.5 w-3">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-cell"
                                    style={{ backgroundColor: cssColor }}
                                  />
                                </td>
                                <td className="py-1 pr-2 text-muted-foreground whitespace-nowrap">
                                  {formatTime(firstStart)}
                                </td>
                                <td className="py-1 truncate max-w-0 w-full text-foreground">
                                  {goal?.name || 'No goal'}
                                </td>
                                <td className="py-1 pl-2 text-muted-foreground whitespace-nowrap text-right">
                                  {formatMinutesToReadable(totalMins)}
                                </td>
                              </tr>
                            );
                          });
                      })()}
                      {!isFuture && dayUntrackedMins > 0 && (
                        <tr className="text-muted-foreground/60">
                          <td className="py-1 pr-1.5 w-3">
                            <span className="inline-block w-2.5 h-2.5 rounded-cell border border-border/50" />
                          </td>
                          <td className="py-1 pr-2 whitespace-nowrap"></td>
                          <td className="py-1 truncate max-w-0 w-full">Untracked</td>
                          <td className="py-1 pl-2 whitespace-nowrap text-right">{formatMinutesToReadable(dayUntrackedMins)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table></div>
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4"><table className="w-full text-xs mt-2">
                    <tbody>
                      {dayImpacts.map((impact, idx) => {
                        const nextImpact = dayImpacts[idx + 1];
                        const endTime = impact.endTime ?? (nextImpact ? nextImpact.date : (impact.date + 3600000));
                        const clippedMs = clipDurationToDay(impact.date, endTime, dateKey);
                        const durationMins = Math.round(clippedMs / 60000);
                        if (durationMins === 0) return null;
                        const cssColor = tailwindBgToCSS(getActivityColor(impact));

                        return (
                          <tr
                            key={impact.id || idx}
                            onClick={() => onEditActivity(impact, idx)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-1 pr-1.5 w-3">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-cell"
                                style={{ backgroundColor: cssColor }}
                              />
                            </td>
                            <td className="py-1 pr-2 text-muted-foreground whitespace-nowrap">
                              {formatTime(impact.date)}
                            </td>
                            <td className="py-1 truncate max-w-0 w-full text-foreground">
                              {impact.id?.startsWith('gcal-') && <GCalBadge href={impact.sourceUrl} />}
                              {impact.activity}
                            </td>
                            <td className="py-1 pl-2 text-muted-foreground whitespace-nowrap text-right">
                              {formatMinutesToReadable(durationMins)}
                            </td>
                          </tr>
                        );
                      })}
                      {!isFuture && dayUntrackedMins > 0 && (
                        <tr className="text-muted-foreground/60">
                          <td className="py-1 pr-1.5 w-3">
                            <span className="inline-block w-2.5 h-2.5 rounded-cell border border-border/50" />
                          </td>
                          <td className="py-1 pr-2 whitespace-nowrap"></td>
                          <td className="py-1 truncate max-w-0 w-full">Untracked</td>
                          <td className="py-1 pl-2 whitespace-nowrap text-right">{formatMinutesToReadable(dayUntrackedMins)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
