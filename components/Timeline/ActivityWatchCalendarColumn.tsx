"use client";
import React, { useCallback } from "react";
import { ProcessedAWEvent } from "../../activity-watch.d";
import { TimeBlock, isLoginWindowOnlyBlock } from "../../utils/timeBlocks";
import { CALENDAR_DAY_HEIGHT } from "./calendarConstants";

interface ActivityWatchCalendarColumnProps {
  timeBlocks: TimeBlock[];
  dayStart: number;
  dayEnd: number;
  isTodayFlag: boolean;
  formatTime: (ts: number) => string;
  formatDuration: (ms: number) => string;
  onAWEventClick: (event: ProcessedAWEvent, anchorRect: DOMRect) => void;
  onAWHourClick: (events: ProcessedAWEvent[], anchorRect: DOMRect) => void;
}

function computeOverlapLayout(blocks: TimeBlock[]) {
  const events = blocks.map((block, idx) => ({
    start: block.startTime,
    end: block.endTime,
    block,
    idx,
  }));
  const cols: number[] = new Array(events.length).fill(0);
  const QUARTER_HOUR_MS = 15 * 60 * 1000;

  for (let i = 0; i < events.length; i++) {
    const used = new Set<number>();
    for (let j = 0; j < i; j++) {
      if (events[j].end > events[i].start && events[i].end > events[j].start) {
        used.add(cols[j]);
      }
    }
    let c = 0;
    while (used.has(c)) c++;
    cols[i] = c;
  }

  const maxConcurrent = (start: number, end: number) => {
    let max = 0;
    for (let t = start; t < end; t += QUARTER_HOUR_MS) {
      const count = events.filter((e) => e.start < t + QUARTER_HOUR_MS && e.end > t).length;
      max = Math.max(max, count);
    }
    return max;
  };

  return events.map((e, i) => {
    const total = maxConcurrent(e.start, e.end);
    return { ...e, col: cols[i], total, left: cols[i] / total, width: 1 / total };
  });
}

export function ActivityWatchCalendarColumn({
  timeBlocks,
  dayStart,
  dayEnd,
  isTodayFlag,
  formatTime,
  formatDuration,
  onAWEventClick,
  onAWHourClick,
}: ActivityWatchCalendarColumnProps) {
  const fullDayMs = dayEnd - dayStart;

  const toTop = useCallback(
    (t: number) => ((t - dayStart) / fullDayMs) * CALENDAR_DAY_HEIGHT,
    [dayStart, fullDayMs]
  );
  const toHeight = useCallback(
    (start: number, end: number) =>
      Math.max(2, ((end - start) / fullDayMs) * CALENDAR_DAY_HEIGHT),
    [fullDayMs]
  );

  const sortedBlocks = [...timeBlocks].sort((a, b) => a.startTime - b.startTime);
  const layoutBlocks = computeOverlapLayout(sortedBlocks);

  return (
    <div className="relative flex-1 min-w-0 overflow-hidden" style={{ height: CALENDAR_DAY_HEIGHT }}>
      {/* Grid lines */}
      {Array.from({ length: 25 }, (_, i) => (
        <div
          key={`aw-grid-${i}`}
          className="absolute left-0 right-0 h-px bg-border/30 pointer-events-none"
          style={{ top: i * 48 }}
        />
      ))}

      {layoutBlocks.map(({ block, left, width }) => {
        const isInactive = isLoginWindowOnlyBlock(block);
        const durationMs = block.endTime - block.startTime;
        const durationStr = formatDuration(durationMs);
        const dominantEvent = block.dominantActivity;
        const leftPct = left * 100;
        const widthPct = width * 100;

        return (
          <div
            key={`aw-${block.startTime}`}
            className={`absolute z-10 rounded-lg border shadow-sm cursor-pointer transition-shadow hover:shadow-md overflow-hidden ${
              isInactive ? "border-muted/50" : "border-border"
            }`}
            style={{
              left: `${leftPct}%`,
              width: width < 1 ? `calc(${widthPct}% - 2px)` : `${widthPct}%`,
              marginRight: width < 1 ? 2 : 0,
              top: toTop(block.startTime),
              height: toHeight(block.startTime, block.endTime),
              minHeight: 32,
            }}
            onClick={(ev) => {
              if (isInactive) return;
              const meaningfulEvents = block.allEvents.filter(
                (e) => e.bucketType !== "afkstatus" && e.displayName?.toLowerCase() !== "loginwindow"
              );
              const eventsToShow = meaningfulEvents.length > 0 ? meaningfulEvents : block.allEvents;
              if (eventsToShow.length === 0) return;
              const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
              if (eventsToShow.length === 1) {
                onAWEventClick(eventsToShow[0], rect);
              } else {
                onAWHourClick(eventsToShow, rect);
              }
            }}
          >
            <div className="h-full flex flex-col p-2 overflow-hidden bg-card relative">
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                  isInactive ? "bg-muted" : dominantEvent.color
                }`}
              />
              <div className="flex items-center gap-1 min-w-0 pl-3">
                <span
                  className={`text-sm font-semibold truncate ${
                    isInactive ? "text-muted-foreground italic" : "text-foreground"
                  }`}
                >
                  {isInactive ? "(Inactive)" : dominantEvent.displayName}
                </span>
                {block.allEvents.length > 1 && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    +{block.allEvents.length - 1}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 min-h-0 pl-3 mt-0.5">
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {formatTime(block.startTime)}
                </span>
                <span className="text-xs text-muted-foreground truncate">{durationStr}</span>
              </div>
              {!isInactive && block.allEvents.length > 1 && (
                <div className="text-[10px] text-muted-foreground pl-3 mt-0.5 truncate">
                  {dominantEvent.bucketType}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
