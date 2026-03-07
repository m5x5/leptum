"use client";
import React, { useState, useMemo, useEffect } from "react";
import { ProcessedAWEvent } from "../../activity-watch.d";
import { chunkEventsIntoTimeBlocks } from "../../utils/timeBlocks";
import { CalendarDayColumn } from "./CalendarDayColumn";
import { ActivityWatchCalendarColumn } from "./ActivityWatchCalendarColumn";

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
  notes?: string;
  sourceUrl?: string;
  allDay?: boolean;
}

interface FilterSettings {
  showManual: boolean;
  showActivityWatch: boolean;
}

interface DayTimelineContentProps {
  dateKey: string;
  dayImpacts: Impact[];
  impacts: Impact[]; // full flat array for actualIndex lookup
  isTodayFlag: boolean;
  filterSettings: FilterSettings;
  /** When true, calendar uses shared time scale; hide per-column time labels */
  sharedTimeScale?: boolean;
  getFilteredAWEventsForDate: (dateKey: string) => ProcessedAWEvent[];
  formatTime: (ts: number) => string;
  getDuration: (start: number, end: number) => string;
  getDurationInMs: (start: number, end: number) => number;
  formatDuration: (ms: number) => string;
  getActivityColor: (impact: Impact) => string;
  getLocalDateTimeStrings: (ts: number) => { dateStr: string; timeStr: string };
  roundToNearest15Minutes: (ts: number) => number;
  getPhotosForImpact: (id: string) => Array<{ id: string; thumbnail: string }>;
  onOpenAddModal: (data: { activity: string; date: string; time: string; goalId: string }) => void;
  onOpenEditModal: (impact: Impact, index: number, anchorRect?: DOMRect) => void;
  onInlineGapSubmit: (slotStart: number, data: { activity: string; goalId: string }, endTime?: number) => void;
  onResizeImpact?: (impactIndex: number, newStart: number, newEnd: number) => void;
  onAWEventClick: (event: ProcessedAWEvent, anchorRect: DOMRect) => void;
  onAWHourClick: (events: ProcessedAWEvent[], anchorRect: DOMRect) => void;
}

const BLOCK_SIZE = 15 * 60 * 1000;

/**
 * Per-day timeline content (manual + AW columns).
 * Owns expandedBlockStart, editingSlotStart for those interactions
 * only re-render this component, not the entire page.
 * AW computations are memoized and only rerun when AW data actually changes.
 */
export function DayTimelineContent({
  dateKey,
  dayImpacts,
  impacts,
  isTodayFlag,
  filterSettings,
  getFilteredAWEventsForDate,
  formatTime,
  getDuration,
  getDurationInMs,
  formatDuration,
  getActivityColor,
  getLocalDateTimeStrings,
  roundToNearest15Minutes,
  getPhotosForImpact,
  onOpenAddModal,
  onOpenEditModal,
  onInlineGapSubmit,
  onResizeImpact,
  onAWEventClick,
  onAWHourClick,
  sharedTimeScale = false,
}: DayTimelineContentProps) {
  const [expandedBlockStart, setExpandedBlockStart] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<{ start: number; end: number } | null>(null);

  // Close expanded block on outside click
  useEffect(() => {
    const handler = () => setExpandedBlockStart(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Memoised AW computations ──────────────────────────────────────────────
  const { dayStart, dayEnd } = useMemo(() => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return {
      dayStart: new Date(year, month - 1, day).getTime(),
      dayEnd: new Date(year, month - 1, day, 23, 59, 59, 999).getTime(),
    };
  }, [dateKey]);

  // allAWEvents only recomputes when getFilteredAWEventsForDate or dateKey changes
  // (getFilteredAWEventsForDate is a useCallback that changes with awData/filterSettings)
  const allAWEvents = useMemo(
    () => getFilteredAWEventsForDate(dateKey),
    [getFilteredAWEventsForDate, dateKey]
  );

  const awEvents = useMemo(
    () => allAWEvents.filter((e) => e.bucketType !== "afkstatus"),
    [allAWEvents]
  );

  const afkEvents = useMemo(
    () => allAWEvents.filter((e) => e.bucketType === "afkstatus"),
    [allAWEvents]
  );

  // afkMap: recomputed only when afkEvents changes
  const afkMap = useMemo(() => {
    const map = new Map<number, boolean>();
    afkEvents.forEach((event) => {
      const isActive =
        event.displayName === "Active" || event.eventData?.status === "not-afk";
      const eventStart = event.timestamp;
      const eventEnd = eventStart + event.duration * 1000;
      const firstBlock = Math.floor(eventStart / BLOCK_SIZE) * BLOCK_SIZE;
      const lastBlock = Math.floor(eventEnd / BLOCK_SIZE) * BLOCK_SIZE;
      for (let bs = firstBlock; bs <= lastBlock; bs += BLOCK_SIZE) {
        const overlapStart = Math.max(eventStart, bs);
        const overlapEnd = Math.min(eventEnd, bs + BLOCK_SIZE);
        if (overlapEnd > overlapStart) {
          const cur = map.get(bs);
          if (cur === true || (cur === undefined && isActive)) {
            map.set(bs, isActive);
          }
        }
      }
    });
    return map;
  }, [afkEvents]);

  const checkPresence = (time: number) =>
    afkMap.get(Math.floor(time / BLOCK_SIZE) * BLOCK_SIZE) === true;

  // Hourly blocks: group AW events by hour for calendar display
  const hourlyBlocks = useMemo(() => {
    if (awEvents.length === 0) return [];
    return chunkEventsIntoTimeBlocks(awEvents, 60, dayStart, dayEnd);
  }, [awEvents, dayStart, dayEnd]);

  // Pre-build a map for O(1) impact index lookup (Fix 5)
  const impactIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    impacts.forEach((imp, i) => {
      if (!imp.isVirtualContinuation) {
        m.set(`${imp.date}-${imp.activity}`, i);
      }
    });
    return m;
  }, [impacts]);

  const hasAWColumn = filterSettings.showActivityWatch && hourlyBlocks.length > 0;

  return (
    <div className={`grid grid-cols-1 gap-6 ${hasAWColumn ? "lg:grid-cols-2" : ""}`}>
      {/* ── Calendar-style Day View (time scale + event cards) ───────────────── */}
      {filterSettings.showManual && (
        <CalendarDayColumn
          dayImpacts={dayImpacts}
          dayStart={dayStart}
          dayEnd={dayEnd}
          isTodayFlag={isTodayFlag}
          impacts={impacts}
          impactIndexMap={impactIndexMap}
          formatTime={formatTime}
          getDuration={getDuration}
          getActivityColor={getActivityColor}
          getPhotosForImpact={getPhotosForImpact}
          roundToNearest15Minutes={roundToNearest15Minutes}
          onOpenEditModal={onOpenEditModal}
          onInlineGapSubmit={onInlineGapSubmit}
          onResizeImpact={onResizeImpact}
          editingSlot={editingSlot}
          setEditingSlot={setEditingSlot}
          hideTimeScale={sharedTimeScale}
        />
      )}

      {/* ── ActivityWatch Column (calendar cards, same style as manual) ──────── */}
      {filterSettings.showActivityWatch && hourlyBlocks.length > 0 && (
        <ActivityWatchCalendarColumn
          timeBlocks={hourlyBlocks}
          dayStart={dayStart}
          dayEnd={dayEnd}
          isTodayFlag={isTodayFlag}
          formatTime={formatTime}
          formatDuration={formatDuration}
          onAWEventClick={onAWEventClick}
          onAWHourClick={onAWHourClick}
        />
      )}

    </div>
  );
}
