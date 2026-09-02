"use client";
import React, { useCallback } from "react";
import { ProcessedAWEvent } from "../../activity-watch.d";
import { TimeBlock, isLoginWindowOnlyBlock } from "../../utils/timeBlocks";
import { CALENDAR_DAY_HEIGHT } from "./calendarConstants";

const BLOCK_SIZE = 15 * 60 * 1000;

interface ActivityWatchCalendarColumnProps {
  timeBlocks: TimeBlock[];
  dayStart: number;
  dayEnd: number;
  isTodayFlag: boolean;
  formatTime: (ts: number) => string;
  formatDuration: (ms: number) => string;
  onAWEventClick: (event: ProcessedAWEvent, anchorRect: DOMRect) => void;
  onAWHourClick: (events: ProcessedAWEvent[], anchorRect: DOMRect) => void;
  /** Map of 15-min block start -> isActive. Used to dim blocks where user was AFK. */
  afkMap?: Map<number, boolean>;
  /** Skip rendering hour gridlines (e.g. when a continuous overlay is drawing them) */
  hideGridLines?: boolean;
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

/** Check if a block's time range is mostly AFK (away) based on the afkMap */
function isBlockMostlyAfk(block: TimeBlock, afkMap?: Map<number, boolean>): boolean {
  if (!afkMap || afkMap.size === 0) return false;

  let activeSlots = 0;
  let totalSlots = 0;
  for (let t = block.startTime; t < block.endTime; t += BLOCK_SIZE) {
    totalSlots++;
    const slotKey = Math.floor(t / BLOCK_SIZE) * BLOCK_SIZE;
    if (afkMap.get(slotKey) === true) activeSlots++;
  }
  if (totalSlots === 0) return false;
  // If less than 25% of the block was active, consider it AFK
  return activeSlots / totalSlots < 0.25;
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
  afkMap,
  hideGridLines = false,
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
    <div className="relative flex-1 min-w-0" style={{ height: CALENDAR_DAY_HEIGHT }}>
      {/* Grid lines - bleed into the surrounding gap-x to look continuous across days. */}
      {!hideGridLines && (
        <div
          className="absolute inset-y-0 pointer-events-none"
          style={{ left: "-0.5rem", right: "-0.5rem" }}
        >
          {Array.from({ length: 25 }, (_, i) => (
            <div
              key={`aw-grid-${i}`}
              className="absolute left-0 right-0 h-px bg-border/30"
              style={{ top: i * 48 }}
            />
          ))}
        </div>
      )}
      <div className="absolute inset-0 overflow-hidden">

      {layoutBlocks.map(({ block, left, width }) => {
        const isInactive = isLoginWindowOnlyBlock(block);
        // Skip rendering fully inactive blocks to reduce DOM size
        if (isInactive) return null;
        const isAfk = isBlockMostlyAfk(block, afkMap);
        const isDimmed = isAfk;
        const durationMs = block.endTime - block.startTime;
        const durationStr = formatDuration(durationMs);
        const dominantEvent = block.dominantActivity;
        const leftPct = left * 100;
        const widthPct = width * 100;

        return (
          <div
            key={`aw-${block.startTime}`}
            className={`absolute z-10 rounded-control border border-border bg-card hover:bg-muted/30 cursor-pointer transition-colors overflow-hidden ${
              isDimmed ? "opacity-40" : ""
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
              if (isDimmed) return;
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
            <div className="h-full flex items-start gap-2 p-2 overflow-hidden">
              <div
                className={`w-1.5 h-8 rounded shrink-0 ${isDimmed ? "bg-muted" : dominantEvent.color}`}
              />
              <div className="flex-1 min-w-0 flex flex-col leading-tight">
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`text-sm font-semibold truncate ${
                      isDimmed ? "text-muted-foreground italic" : "text-foreground"
                    }`}
                  >
                    {isInactive ? "(Inactive)" : dominantEvent.displayName}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(block.startTime).getHours()} - {new Date(block.endTime).getHours() || 24} Uhr
                </span>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
