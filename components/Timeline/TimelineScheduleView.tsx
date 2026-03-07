import { useMemo, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/solid';
import { HighlightedMentions } from '../ui/mention-input';
import { GCalBadge } from '../ui/gcal-badge';
import { ImportSourceButton } from '../ui/import-source-button';

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
  isVirtualContinuation?: boolean;
  originalStartTime?: number;
  photoIds?: string[];
  sourceUrl?: string;
  allDay?: boolean;
}

interface TimelineScheduleViewProps {
  impacts: Impact[];
  goals: Array<{ id: string; name: string; color?: string }> | null;
  onEditActivity: (impact: Impact, index: number) => void;
  onAddActivity: (dateKey: string) => void;
  onImportAW?: (dateKey: string) => void;
  onImportGCal?: (dateKey: string) => void;
  daysToShow: number;
}

export function TimelineScheduleView({
  impacts,
  goals,
  onEditActivity,
  onAddActivity,
  onImportAW,
  onImportGCal,
  daysToShow,
}: TimelineScheduleViewProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isToday = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getDuration = (startTime: number, endTime: number) => {
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getActivityColor = (impact: Impact) => {
    if (impact.goalId && goals) {
      const goal = goals.find(g => g.id === impact.goalId);
      if (goal && goal.color) {
        return goal.color;
      }
    }
    return "bg-gray-400";
  };

  const groupByDate = useCallback((impactsToGroup: Impact[]) => {
    const toDateKey = (timestamp: number) => {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const now = Date.now();
    const todayKey = toDateKey(now);

    const allDayImpacts = impactsToGroup.filter(i => i.allDay);
    const timedImpacts  = impactsToGroup.filter(i => !i.allDay);

    const sortedImpacts = [...timedImpacts].sort((a, b) => b.date - a.date);

    const grouped: { [key: string]: Impact[] } = {};

    allDayImpacts.forEach(impact => {
      const dateKey = toDateKey(impact.date);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(impact);
    });

    sortedImpacts.forEach((impact, index) => {
      let endTime: number;

      if (impact.endTime != null) {
        endTime = impact.endTime;
      } else if (index === 0) {
        const impactDateKey = toDateKey(impact.date);
        if (impactDateKey === todayKey) {
          endTime = now;
        } else {
          const dayEnd = new Date(impact.date);
          dayEnd.setHours(24, 0, 0, 0);
          endTime = dayEnd.getTime();
        }
      } else {
        endTime = sortedImpacts[index - 1].date;
      }

      const startDateKey = toDateKey(impact.date);
      const endDateKey = toDateKey(endTime);

      if (!grouped[startDateKey]) {
        grouped[startDateKey] = [];
      }
      grouped[startDateKey].push(impact);

      if (startDateKey !== endDateKey) {
        const nextDayStart = new Date(impact.date);
        nextDayStart.setHours(24, 0, 0, 0);
        const nextDateKey = toDateKey(nextDayStart.getTime());

        if (nextDateKey === endDateKey) {
          const virtualImpact: Impact = {
            id: impact.id,
            activity: impact.activity,
            date: nextDayStart.getTime(),
            endTime: impact.endTime,
            goalId: impact.goalId,
            isVirtualContinuation: true,
            originalStartTime: impact.date,
          };

          if (!grouped[nextDateKey]) {
            grouped[nextDateKey] = [];
          }
          grouped[nextDateKey].push(virtualImpact);
        }
      }
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => b.date - a.date);
    });

    return grouped;
  }, []);

  const groupedImpacts = useMemo(() => groupByDate(impacts), [impacts, groupByDate]);

  const allDates = useMemo(() => {
    const dateSet = new Set<string>(Object.keys(groupedImpacts));
    return Array.from(dateSet).sort().reverse();
  }, [groupedImpacts]);

  const dates = allDates.slice(0, daysToShow);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-7 gap-8">
      {dates.map((dateKey) => {
        const allDayImpacts = (groupedImpacts[dateKey] || []).filter(i => i.allDay);
        const dayImpacts    = (groupedImpacts[dateKey] || []).filter(i => !i.allDay);

        let displayDate: string;
        let isTodayFlag: boolean;

        const firstImpact = dayImpacts[0] ?? allDayImpacts[0];
        if (firstImpact) {
          displayDate = formatDate(firstImpact.date);
          isTodayFlag = isToday(firstImpact.date);
        } else {
          const [year, month, day] = dateKey.split('-').map(Number);
          const dateTimestamp = new Date(year, month - 1, day).getTime();
          displayDate = formatDate(dateTimestamp);
          isTodayFlag = isToday(dateTimestamp);
        }

        return (
          <div key={dateKey} className="space-y-4">
            <div className="sticky top-0 bg-background z-20 pb-3 border-b border-border">
              {/* Title row */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {displayDate}
                  {isTodayFlag && (
                    <span className="ml-2 text-sm font-normal text-primary">
                      (Today)
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  {(onImportAW || onImportGCal) && (
                    <ImportSourceButton
                      size="sm"
                      onActivityWatch={() => onImportAW?.(dateKey)}
                      onGoogleCalendar={() => onImportGCal?.(dateKey)}
                    />
                  )}
                  <button
                    onClick={() => onAddActivity(dateKey)}
                    className="flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
              {/* All-day event chips */}
              {allDayImpacts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {allDayImpacts.map(imp => (
                    <div
                      key={imp.id ?? imp.activity}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs text-foreground"
                    >
                      {imp.id?.startsWith('gcal-') && <GCalBadge href={imp.sourceUrl} />}
                      <span className="truncate max-w-[18rem]">{imp.activity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule List View */}
            <div className="space-y-2">
              {dayImpacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activities this day
                </div>
              ) : (
                dayImpacts.map((impact, index) => {
                  const isFirstItem = index === 0;
                  const isVirtualContinuation = impact.isVirtualContinuation || false;
                  const isLive = isTodayFlag && isFirstItem && !isVirtualContinuation && impact.endTime == null;

                  let duration = null;
                  let endTime: number;
                  let displayStartTime = impact.date;

                  if (isVirtualContinuation) {
                    displayStartTime = impact.date;
                  }

                  if (impact.endTime != null) {
                    endTime = impact.endTime;
                    duration = getDuration(displayStartTime, endTime);
                  } else if (isFirstItem && !isTodayFlag) {
                    const dayEnd = new Date(impact.date);
                    dayEnd.setHours(24, 0, 0, 0);
                    endTime = dayEnd.getTime();
                    duration = getDuration(displayStartTime, endTime);
                  } else if (!isFirstItem) {
                    const nextActivity = dayImpacts[index - 1];
                    endTime = nextActivity.date;
                    duration = getDuration(displayStartTime, endTime);
                  } else {
                    endTime = Date.now();
                    duration = getDuration(displayStartTime, endTime);
                  }

                  const actualIndex = impacts.findIndex(
                    (imp) => {
                      if (isVirtualContinuation && impact.originalStartTime) {
                        return imp.date === impact.originalStartTime && imp.activity === impact.activity && !imp.isVirtualContinuation;
                      }
                      return imp.date === impact.date && imp.activity === impact.activity && !imp.isVirtualContinuation;
                    }
                  );

                  return (
                    <div
                      key={`schedule-${impact.date}-${index}`}
                      className={`flex items-center gap-4 p-4 bg-card border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
                        isLive ? 'border-primary border-2' : 'border-border'
                      }`}
                      onClick={() => {
                        if (actualIndex !== -1) {
                          onEditActivity(impact, actualIndex);
                        }
                      }}
                    >
                      {/* Color indicator */}
                      <div className={`w-1 h-12 rounded ${getActivityColor(impact)} ${isLive ? 'animate-pulse' : ''}`} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-mono whitespace-nowrap ${isLive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            {formatTime(displayStartTime)} → {formatTime(endTime)}
                          </span>
                          {isVirtualContinuation && (
                            <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded whitespace-nowrap border border-amber-500/20" title={`Continued from ${formatTime(impact.originalStartTime || 0)}`}>
                              ↗ Continued
                            </span>
                          )}
                          {isLive && <span className="text-xs text-primary whitespace-nowrap">(Live)</span>}
                        </div>
                        <h3 className={`text-base font-semibold truncate flex items-center gap-1.5 ${isLive ? 'text-primary' : 'text-foreground'}`}>
                          {impact.id?.startsWith('gcal-') && <GCalBadge href={impact.sourceUrl} />}
                          <HighlightedMentions text={impact.activity} />
                        </h3>
                      </div>

                      {/* Duration */}
                      {duration && (
                        <span className="text-sm px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground whitespace-nowrap">
                          {duration}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
