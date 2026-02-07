import { useMemo, useState, useEffect } from 'react';
import { Impact } from '../../utils/timeCalculations';

interface DailyActivityBarProps {
  dateKey: string;
  impacts: Impact[];
  goals: Array<{ id: string; name: string; color?: string }> | null;
}

interface ActivitySegment {
  activity: string;
  color: string;
  startTime: number;
  endTime: number;
  startPercent: number;
  widthPercent: number;
  isVirtualContinuation?: boolean;
  originalStartTime?: number;
}

export function DailyActivityBar({ dateKey, impacts, goals }: DailyActivityBarProps) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const segments = useMemo(() => {
    // Filter impacts for this specific day
    const [year, month, day] = dateKey.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    const fullDayInMs = dayEnd - dayStart;
    const nowDate = now ? new Date(now) : new Date(0);
    const todayKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;

    // Sort all impacts chronologically first
    const sortedImpacts = [...impacts].sort((a, b) => a.date - b.date);

    // Find impacts that either start on this day OR continue into this day from previous day
    const dayImpacts: Array<Impact & { isVirtualContinuation?: boolean; originalStartTime?: number }> = [];
    
    sortedImpacts.forEach((impact, index) => {
      const impactDate = new Date(impact.date);
      const isStartingOnThisDay = (
        impactDate.getFullYear() === year &&
        impactDate.getMonth() === month - 1 &&
        impactDate.getDate() === day
      );

      if (isStartingOnThisDay) {
        dayImpacts.push(impact);
      } else {
        // Check if this impact spans into our day
        const nextImpact = index < sortedImpacts.length - 1 ? sortedImpacts[index + 1] : null;
        let endTime: number;

        if (!nextImpact) {
          // Last activity - check if it's today and ongoing
          const impactDateKey = `${impactDate.getFullYear()}-${String(impactDate.getMonth() + 1).padStart(2, '0')}-${String(impactDate.getDate()).padStart(2, '0')}`;
          
          if (impactDateKey === todayKey) {
            endTime = now || dayEnd;
          } else {
            const dayEndOfImpact = new Date(impact.date);
            dayEndOfImpact.setHours(23, 59, 59, 999);
            endTime = dayEndOfImpact.getTime();
          }
        } else {
          endTime = nextImpact.date;
        }

        // Check if the activity spans into this day
        if (impact.date < dayStart && endTime > dayStart) {
          // Create a virtual continuation impact starting at midnight
          dayImpacts.push({
            ...impact,
            date: dayStart,
            isVirtualContinuation: true,
            originalStartTime: impact.date
          });
        }
      }
    });

    if (dayImpacts.length === 0) return [];

    // Sort dayImpacts chronologically (including virtual continuations which start at midnight)
    dayImpacts.sort((a, b) => a.date - b.date);

    const getActivityColor = (impact: Impact) => {
      if (impact.goalId && goals) {
        const goal = goals.find(g => g.id === impact.goalId);
        if (goal?.color) return goal.color;
      }
      return 'bg-gray-400';
    };

    const formatTime = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    // Build timeline segments with actual positions
    const segments: ActivitySegment[] = [];

    for (let i = 0; i < dayImpacts.length; i++) {
      const current = dayImpacts[i];
      let endTime: number;

      // Find the next activity that's actually on this day (not virtual from tomorrow)
      let nextActivityTime: number | null = null;
      if (i < dayImpacts.length - 1) {
        nextActivityTime = dayImpacts[i + 1].date;
      }

      if (nextActivityTime) {
        // Duration goes until the next activity (capped at end of day)
        endTime = Math.min(nextActivityTime, dayEnd);
      } else {
        // Last activity - check if it ends on this day or continues beyond
        // For virtual continuations from yesterday, find the original end time
        if (current.isVirtualContinuation && current.originalStartTime) {
          // Find the next impact after the original start time
          const originalIndex = sortedImpacts.findIndex(imp => imp.date === current.originalStartTime);
          const nextAfterOriginal = originalIndex >= 0 && originalIndex < sortedImpacts.length - 1 
            ? sortedImpacts[originalIndex + 1] 
            : null;

          if (nextAfterOriginal) {
            endTime = Math.min(nextAfterOriginal.date, dayEnd);
          } else {
            // Original activity is still ongoing - check if today
            if (dateKey === todayKey) {
              endTime = now || dayEnd;
            } else {
              endTime = dayEnd;
            }
          }
        } else {
          // Regular activity - use end of day or current time if today
          if (dateKey === todayKey) {
            endTime = Math.min(now || dayEnd, dayEnd);
          } else {
            endTime = dayEnd;
          }
        }
      }

      // Clamp to day boundaries
      const startTime = Math.max(current.date, dayStart);
      endTime = Math.min(endTime, dayEnd);

      const startPercent = ((startTime - dayStart) / fullDayInMs) * 100;
      const widthPercent = ((endTime - startTime) / fullDayInMs) * 100;

      if (widthPercent > 0) {
        segments.push({
          activity: current.activity,
          color: getActivityColor(current),
          startTime,
          endTime,
          startPercent,
          widthPercent,
          isVirtualContinuation: current.isVirtualContinuation,
          originalStartTime: current.originalStartTime
        });
      }
    }

    return segments;
  }, [dateKey, impacts, goals, now]);

  if (segments.length === 0) return null;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="mb-3">
      <div className="text-xs text-muted-foreground mb-1">Daily Activity</div>
      <div className="relative w-full rounded overflow-hidden border border-border bg-muted/20 flex flex-col h-[300px]">
        {segments.map((segment, idx) => (
          <div
            key={`${segment.activity}-${idx}`}
            className={`${segment.color} flex items-start justify-start text-xs text-white font-medium ${
              idx < segments.length - 1 ? 'border-b border-background/50' : ''
            } ${segment.isVirtualContinuation ? 'border-t-2 border-t-yellow-400' : ''}`}
            style={{
              height: `${segment.widthPercent}%`,
            }}
            title={
              segment.isVirtualContinuation
                ? `${segment.activity}: Continued from ${formatTime(segment.originalStartTime || segment.startTime)} (previous day) - ${formatTime(segment.endTime)}`
                : `${segment.activity}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`
            }
          >
            {segment.widthPercent > 3 && (
              <span className="px-2 pt-1 truncate text-[10px] leading-tight flex items-center gap-1">
                {segment.isVirtualContinuation && '↪ '}
                {segment.activity}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
