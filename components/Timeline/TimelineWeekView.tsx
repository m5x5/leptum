import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/solid';

interface Impact {
  id?: string;
  activity: string;
  date: number;
  goalId?: string;
  stress?: string | number;
  fulfillment?: string | number;
  motivation?: string | number;
  cleanliness?: string | number;
  energy?: string | number;
  isVirtualContinuation?: boolean;
  originalStartTime?: number;
  photoIds?: string[];
  [key: string]: any;
}

interface Goal {
  id: string;
  name: string;
  color?: string;
}

interface TimelineWeekViewProps {
  impacts: Impact[];
  goals: Goal[];
  onEditActivity: (impact: Impact, index: number) => void;
  onAddActivity: (dateKey: string) => void;
  getActivityColor: (impact: Impact) => string;
  formatDate: (timestamp: number) => string;
  formatTime: (timestamp: number) => string;
  isToday: (timestamp: number) => boolean;
  getDurationInMs: (startTime: number, endTime: number) => number;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart(timestamp: number): Date {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = date.getDate() - day;
  const weekStart = new Date(date.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function TimelineWeekView({
  impacts,
  goals,
  onEditActivity,
  onAddActivity,
  getActivityColor,
  formatDate,
  formatTime,
  isToday,
  getDurationInMs,
}: TimelineWeekViewProps) {
  // Default to current week
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    return getWeekStart(Date.now());
  });

  const handlePreviousWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStartDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStartDate(newDate);
  };

  // Generate 7 days starting from weekStartDate
  const days = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + idx);
    return date;
  });

  // Group impacts by day
  const groupedImpacts: { [dateKey: string]: Impact[] } = {};
  impacts.forEach((impact) => {
    const dateKey = getDateKey(impact.date);
    if (!groupedImpacts[dateKey]) {
      groupedImpacts[dateKey] = [];
    }
    groupedImpacts[dateKey].push(impact);
  });

  // Sort each day's impacts chronologically
  Object.keys(groupedImpacts).forEach((dateKey) => {
    groupedImpacts[dateKey].sort((a, b) => a.date - b.date);
  });

  // Format week display
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekDisplay = `${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="w-full">
      {/* Week Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handlePreviousWeek}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Previous week"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <div className="text-center text-sm font-medium text-foreground">
          {weekDisplay}
        </div>
        <button
          onClick={handleNextWeek}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Next week"
        >
          <ChevronRightIcon className="w-5 h-5" />
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

          return (
            <div
              key={dateKey}
              className={`rounded-lg border ${
                isTodayFlag
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              } overflow-hidden`}
            >
              {/* Day Header */}
              <div className={`p-3 border-b border-border ${isTodayFlag ? 'bg-primary/10' : 'bg-muted/30'}`}>
                <div className="font-semibold text-foreground text-sm">
                  {dayOfWeek}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dayNum}
                </div>
              </div>

              {/* Day Content */}
              <div className="p-3 space-y-2 min-h-[200px]">
                {dayImpacts.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No activities
                  </div>
                ) : (
                  dayImpacts.map((impact, idx) => {
                    const nextImpact = dayImpacts[idx + 1];
                    const endTime = nextImpact ? nextImpact.date : (impact.date + 3600000); // Default to 1 hour if no next activity
                    const durationMs = getDurationInMs(impact.date, endTime);
                    const durationMins = Math.round(durationMs / 60000);

                    return (
                      <div
                        key={impact.id || idx}
                        onClick={() => onEditActivity(impact, idx)}
                        className={`p-2 rounded text-xs cursor-pointer transition-colors ${getActivityColor(
                          impact
                        )} hover:opacity-80 truncate`}
                        title={`${impact.activity} (${formatTime(impact.date)} - ${durationMins}m)`}
                      >
                        <div className="font-medium truncate">{impact.activity}</div>
                        <div className="text-white/70 text-xs">
                          {formatTime(impact.date)} ({durationMins}m)
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Add Activity Button */}
                <button
                  onClick={() => onAddActivity(dateKey)}
                  className="w-full mt-2 p-2 text-xs border border-dashed border-border rounded hover:bg-muted/50 transition text-muted-foreground hover:text-foreground"
                >
                  + Add Activity
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
