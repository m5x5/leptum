"use client";
import { useState, useMemo, memo } from "react";
import { createPortal } from "react-dom";

interface Impact {
  activity: string;
  date: number;
  goalId?: string;
  endTime?: number;
}

interface StaticSummaryBarProps {
  dateKey: string;
  dayImpacts: Impact[];
  getActivityColor: (impact: Impact) => string;
  formatTime: (ts: number) => string;
}

/**
 * Self-contained static summary bar for past days.
 * Owns its own hover state so mouse moves never re-render the parent tree.
 */
export const StaticSummaryBar = memo(function StaticSummaryBar({
  dateKey,
  dayImpacts,
  getActivityColor,
  formatTime,
}: StaticSummaryBarProps) {
  const [hoverState, setHoverState] = useState<{
    x: number;
    y: number;
    percent: number;
    activity: string;
    time: string;
  } | null>(null);

  const { dayStart, dayEnd, fullDayInMs } = useMemo(() => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const start = new Date(year, month - 1, day).getTime();
    const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    return { dayStart: start, dayEnd: end, fullDayInMs: end - start };
  }, [dateKey]);

  const segments = useMemo(() => {
    return Array.from({ length: dayImpacts.length }, (_, i) => {
      const idx = dayImpacts.length - 1 - i; // oldest first
      const current = dayImpacts[idx];
      let endTime: number;
      if (current.endTime != null) {
        endTime = current.endTime;
      } else if (idx === 0) {
        endTime = dayEnd;
      } else {
        endTime = dayImpacts[idx - 1].date;
      }
      let widthPercent = Math.max(0, ((endTime - current.date) / fullDayInMs) * 100);
      // Ensure events with endTime get at least minimal display when width is 0 (avoids invisible segments)
      if (widthPercent === 0 && current.endTime != null && current.endTime >= current.date) {
        widthPercent = (60000 / fullDayInMs) * 100; // ~0.07% for 1 minute
      }
      return {
        activity: current.activity,
        color: getActivityColor(current),
        startTime: current.date,
        endTime,
        startPercent: ((current.date - dayStart) / fullDayInMs) * 100,
        widthPercent,
      };
    });
  }, [dayImpacts, dayStart, dayEnd, fullDayInMs, getActivityColor]);

  const now = Date.now();
  const currentTimePercent =
    now >= dayStart && now <= dayEnd
      ? ((now - dayStart) / fullDayInMs) * 100
      : null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const timeAtPosition = dayStart + (percent / 100) * fullDayInMs;

    let activity = "No activity";
    for (let i = dayImpacts.length - 1; i >= 0; i--) {
      const current = dayImpacts[i];
      let endTime: number;
      if (current.endTime != null) endTime = current.endTime;
      else if (i === 0) endTime = dayEnd;
      else endTime = dayImpacts[i - 1].date;
      if (timeAtPosition >= current.date && timeAtPosition <= endTime) {
        activity = current.activity;
        break;
      }
    }

    setHoverState({
      x: e.clientX,
      y: rect.bottom + 6,
      percent,
      activity,
      time: formatTime(timeAtPosition),
    });
  };

  const handleMouseLeave = () => setHoverState(null);

  return (
    <div className="relative">
      <div
        className="relative h-8 rounded-lg overflow-hidden border border-border bg-muted/20"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {segments.map((segment, idx) => (
          <div
            key={`${segment.activity}-${idx}`}
            className={`${segment.color} absolute top-0 bottom-0 flex items-center justify-center text-xs text-white font-medium ${
              idx < segments.length - 1 ? "border-r border-background/50" : ""
            }`}
            style={{
              left: `${segment.startPercent}%`,
              width: `${segment.widthPercent}%`,
            }}
            title={`${segment.activity}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
          >
            {segment.widthPercent > 8 && (
              <span className="px-1 truncate">{segment.activity}</span>
            )}
          </div>
        ))}
        {currentTimePercent !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${currentTimePercent}%` }}
            title={`Current time: ${formatTime(now)}`}
          />
        )}
        {hoverState !== null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/40 z-20 pointer-events-none"
            style={{ left: `${hoverState.percent}%` }}
          />
        )}
      </div>
      {hoverState &&
        createPortal(
          <div
            className="fixed -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border whitespace-nowrap z-[9999] pointer-events-none"
            style={{ left: hoverState.x, top: hoverState.y }}
          >
            <div className="font-semibold">{hoverState.activity}</div>
            <div className="text-muted-foreground">{hoverState.time}</div>
          </div>,
          document.body
        )}
    </div>
  );
});
