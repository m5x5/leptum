"use client";
import Image from "next/image";
import React, { useState, useCallback, useEffect } from "react";
import DraftTimelineEntry from "./DraftTimelineEntry";
import { LiveActivityDuration } from "./LiveActivityDuration";
import { GCalBadge } from "../ui/gcal-badge";
import { HighlightedMentions } from "../ui/mention-input";
import { CALENDAR_PX_PER_HOUR, CALENDAR_DAY_HEIGHT, QUARTER_HOUR_MS, PX_PER_QUARTER } from "./calendarConstants";

interface Impact {
  id?: string;
  activity: string;
  date: number;
  endTime?: number;
  isVirtualContinuation?: boolean;
  originalStartTime?: number;
  photoIds?: string[];
  sourceUrl?: string;
}

interface CalendarDayColumnProps {
  dayImpacts: Impact[];
  dayStart: number;
  dayEnd: number;
  isTodayFlag: boolean;
  impacts: Impact[];
  impactIndexMap: Map<string, number>;
  formatTime: (ts: number) => string;
  getDuration: (start: number, end: number) => string;
  getActivityColor: (impact: Impact) => string;
  getPhotosForImpact: (id: string) => Array<{ id: string; thumbnail: string }>;
  roundToNearest15Minutes: (ts: number) => number;
  onOpenEditModal: (impact: Impact, index: number, anchorRect?: DOMRect) => void;
  onInlineGapSubmit: (slotStart: number, data: { activity: string; goalId: string }, endTime?: number) => void;
  onResizeImpact?: (impactIndex: number, newStart: number, newEnd: number) => void;
  editingSlot: { start: number; end: number } | null;
  setEditingSlot: (v: { start: number; end: number } | null) => void;
  hideTimeScale?: boolean;
}

export function CalendarDayColumn({
  dayImpacts,
  dayStart,
  dayEnd,
  isTodayFlag,
  impacts,
  impactIndexMap,
  formatTime,
  getDuration,
  getActivityColor,
  getPhotosForImpact,
  roundToNearest15Minutes,
  onOpenEditModal,
  onInlineGapSubmit,
  onResizeImpact,
  editingSlot,
  setEditingSlot,
  hideTimeScale = false,
}: CalendarDayColumnProps) {
  const fullDayMs = dayEnd - dayStart;
  const dayTop = isTodayFlag
    ? Math.min(roundToNearest15Minutes(Date.now()), dayEnd)
    : dayEnd;

  const toTop = (t: number) => ((t - dayStart) / fullDayMs) * CALENDAR_DAY_HEIGHT;
  const toHeight = (start: number, end: number) =>
    Math.max(2, ((end - start) / fullDayMs) * CALENDAR_DAY_HEIGHT);

  const timeFromY = useCallback(
    (y: number) => {
      const t = dayStart + (y / CALENDAR_DAY_HEIGHT) * fullDayMs;
      return roundToNearest15Minutes(t);
    },
    [dayStart, fullDayMs, roundToNearest15Minutes]
  );

  const HOUR_MS = 60 * 60 * 1000;
  const [dragPreview, setDragPreview] = useState<{ start: number; end: number } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{
    impact: Impact;
    idx: number;
    actualIndex: number;
    edge: "top" | "bottom";
    start: number;
    end: number;
  } | null>(null);
  const resizingRef = React.useRef<typeof resizingEvent>(null);
  resizingRef.current = resizingEvent;
  const gridRef = React.useRef<HTMLDivElement>(null);

  const sortedImpacts = [...dayImpacts].sort((a, b) => a.date - b.date);

  const getEventEnd = (impact: Impact, idx: number): number => {
    if (impact.endTime != null) return impact.endTime;
    if (idx < sortedImpacts.length - 1) return sortedImpacts[idx + 1].date;
    return isTodayFlag ? dayTop : dayEnd;
  };

  const hasDraggedRef = React.useRef(false);
  const dragPreviewRef = React.useRef<{ start: number; end: number } | null>(null);
  dragPreviewRef.current = dragPreview;

  const handleSlotMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const localY = e.clientY - rect.top;
      const startTime = timeFromY(localY);
      const minEnd = Math.min(startTime + QUARTER_HOUR_MS, dayEnd);
      const initial = { start: startTime, end: minEnd };
      dragPreviewRef.current = initial;
      setDragPreview(initial);
      hasDraggedRef.current = false;
    },
    [timeFromY, dayEnd]
  );

  useEffect(() => {
    if (!dragPreview) return;
    const handleMove = (e: MouseEvent) => {
      hasDraggedRef.current = true;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const localY = Math.max(0, Math.min(e.clientY - rect.top, CALENDAR_DAY_HEIGHT));
      const endTime = timeFromY(localY);
      setDragPreview((p) => {
        if (!p) return null;
        const snapped = roundToNearest15Minutes(endTime);
        const newEnd = Math.max(p.start + QUARTER_HOUR_MS, Math.min(snapped, dayEnd));
        const next = { ...p, end: newEnd };
        dragPreviewRef.current = next;
        return next;
      });
    };
    const handleUp = () => {
      const p = dragPreviewRef.current;
      dragPreviewRef.current = null;
      setDragPreview(null);
      if (p) {
        if (!hasDraggedRef.current) {
          setEditingSlot({
            start: p.start,
            end: Math.min(p.start + HOUR_MS, dayEnd),
          });
        } else {
          const end = Math.max(p.end, p.start + QUARTER_HOUR_MS);
          setEditingSlot({ start: p.start, end: Math.min(end, dayEnd) });
        }
      }
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [dragPreview, dayEnd, setEditingSlot]);

  useEffect(() => {
    if (!resizingEvent || !onResizeImpact) return;
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = "ns-resize";
    const handleMove = (e: MouseEvent) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const localY = Math.max(0, Math.min(e.clientY - rect.top, CALENDAR_DAY_HEIGHT));
      const t = timeFromY(localY);
      const snapped = roundToNearest15Minutes(t);
      setResizingEvent((prev) => {
        if (!prev) return null;
        const { impact, idx, actualIndex, edge } = prev;
        const nextEventStart = idx < sortedImpacts.length - 1 ? sortedImpacts[idx + 1].date : null;
        const prevEventEnd = idx > 0 ? getEventEnd(sortedImpacts[idx - 1], idx - 1) : dayStart;
        if (edge === "bottom") {
          const minEnd = prev.start + QUARTER_HOUR_MS;
          const maxEnd = nextEventStart != null ? Math.min(nextEventStart, dayEnd) : (isTodayFlag ? dayTop : dayEnd);
          const newEnd = Math.max(minEnd, Math.min(snapped, maxEnd));
          return { ...prev, end: newEnd };
        } else {
          const minStart = Math.max(prevEventEnd, dayStart);
          const maxStart = prev.end - QUARTER_HOUR_MS;
          const newStart = Math.max(minStart, Math.min(snapped, maxStart));
          return { ...prev, start: newStart };
        }
      });
    };
    const handleUp = () => {
      const r = resizingRef.current;
      document.body.style.cursor = prevCursor;
      setResizingEvent(null);
      if (r && onResizeImpact) {
        onResizeImpact(r.actualIndex, r.start, r.end);
      }
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.body.style.cursor = prevCursor;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [resizingEvent, onResizeImpact, timeFromY, roundToNearest15Minutes, sortedImpacts, dayStart, dayEnd, dayTop, isTodayFlag]);

  const computeOverlapLayout = useCallback(() => {
    const events = sortedImpacts.map((imp, idx) => ({
      start: imp.date,
      end: getEventEnd(imp, idx),
      impact: imp,
      idx,
    }));
    const cols: number[] = new Array(events.length).fill(0);
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
  }, [sortedImpacts]);

  const layoutEvents = computeOverlapLayout();
  const slots: React.JSX.Element[] = [];

  for (let h = 0; h < 24; h++) {
    const slotStart = dayStart + h * HOUR_MS;
    const slotEnd = Math.min(slotStart + HOUR_MS, dayEnd);
    if (slotStart >= dayEnd) break;
    slots.push(
      <div
        key={`slot-${slotStart}`}
        className="absolute left-0 right-2 cursor-crosshair border-b border-border/30"
        style={{ top: toTop(slotStart), height: toHeight(slotStart, slotEnd) }}
        onMouseDown={handleSlotMouseDown}
      />
    );
  }

  if (editingSlot && !dragPreview) {
    slots.push(
      <div
        key={`draft-${editingSlot.start}`}
        className="absolute left-0 right-2 z-10"
        style={{
          top: toTop(editingSlot.start),
          height: toHeight(editingSlot.start, editingSlot.end),
        }}
      >
        <DraftTimelineEntry
          startTime={editingSlot.start}
          endTime={editingSlot.end}
          formatTime={formatTime}
          slotHeightPx={toHeight(editingSlot.start, editingSlot.end)}
          onCancel={() => setEditingSlot(null)}
          onSubmit={(data) => {
            onInlineGapSubmit(editingSlot.start, data, editingSlot.end);
            setEditingSlot(null);
          }}
        />
      </div>
    );
  }

  if (dragPreview) {
    slots.push(
      <div
        key="drag-preview"
        className="absolute left-0 right-2 z-30 rounded border-2 border-primary bg-primary/15 pointer-events-none"
        style={{
          top: toTop(dragPreview.start),
          height: toHeight(dragPreview.start, dragPreview.end),
        }}
      >
        <div className="p-1 text-xs font-mono text-primary">
          {formatTime(dragPreview.start)} – {formatTime(dragPreview.end)}
        </div>
      </div>
    );
  }

  layoutEvents.forEach(({ impact, idx, left, width }) => {
    const actualIndex =
      impact.isVirtualContinuation && impact.originalStartTime
        ? impacts.findIndex(
            (imp) =>
              imp.date === impact.originalStartTime &&
              imp.activity === impact.activity &&
              !imp.isVirtualContinuation
          )
        : (impactIndexMap.get(`${impact.date}-${impact.activity}`) ?? -1);
    const isResizing = resizingEvent?.actualIndex === actualIndex;
    const eventStart = isResizing ? resizingEvent.start : impact.date;
    const eventEnd = isResizing ? resizingEvent.end : getEventEnd(impact, idx);

    const isLive =
      isTodayFlag &&
      idx === sortedImpacts.length - 1 &&
      !impact.isVirtualContinuation &&
      impact.endTime == null;
    const duration = getDuration(impact.date, eventEnd);

    const leftPct = left * 100;
    const widthPct = width * 100;

    const canResize = onResizeImpact && !impact.isVirtualContinuation;

    slots.push(
      <div
        key={`event-${impact.date}-${idx}`}
        className={`absolute z-10 rounded-lg border shadow-sm cursor-pointer transition-shadow hover:shadow-md overflow-hidden group ${
          isLive ? "border-primary border-2" : "border-border"
        }`}
        style={{
          left: `${leftPct}%`,
          width: width < 1 ? `calc(${widthPct}% - 2px)` : `${widthPct}%`,
          marginRight: width < 1 ? 2 : 0,
          top: toTop(eventStart),
          height: toHeight(eventStart, eventEnd),
          minHeight: 32,
        }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onOpenEditModal(impact, actualIndex, rect);
        }}
      >
        <div className="h-full flex flex-col p-2 overflow-hidden bg-card relative">
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${getActivityColor(
              impact
            )}`}
          />
          <div className="flex items-center gap-1 min-w-0 pl-3">
            {impact.id?.startsWith("gcal-") && (
              <GCalBadge href={impact.sourceUrl} />
            )}
            <span
              className={`text-sm font-semibold truncate ${
                isLive ? "text-primary" : "text-foreground"
              }`}
            >
              <HighlightedMentions text={impact.activity} />
            </span>
            {impact.isVirtualContinuation && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">
                ↗
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1 min-h-0 pl-3 mt-0.5">
            <span
              className={`text-xs font-mono shrink-0 ${
                isLive ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              {formatTime(impact.date)}
            </span>
            {isLive && (
              <LiveActivityDuration
                startTime={impact.date}
                formatDuration={getDuration}
              />
            )}
            {!isLive && (
              <span className="text-xs text-muted-foreground truncate">
                {duration}
              </span>
            )}
          </div>
          {impact.id && getPhotosForImpact(impact.id).length > 0 && (
            <div className="flex gap-1 mt-1 overflow-x-auto scrollbar-hide pl-3">
              {getPhotosForImpact(impact.id).slice(0, 3).map((photo) => (
                <Image
                  key={photo.id}
                  src={photo.thumbnail}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="w-6 h-6 object-cover rounded shrink-0"
                />
              ))}
            </div>
          )}
          {canResize && (
            <>
              <div
                className="absolute left-0 right-0 top-0 h-3 cursor-n-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-10 select-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingEvent({
                    impact,
                    idx,
                    actualIndex,
                    edge: "top",
                    start: eventStart,
                    end: eventEnd,
                  });
                }}
                title="Drag to resize"
              >
                <div className="w-8 h-0.5 rounded-full bg-muted-foreground/50" />
              </div>
              <div
                className="absolute left-0 right-0 bottom-0 h-3 cursor-n-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-10 select-none"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingEvent({
                    impact,
                    idx,
                    actualIndex,
                    edge: "bottom",
                    start: eventStart,
                    end: eventEnd,
                  });
                }}
                title="Drag to resize"
              >
                <div className="w-8 h-0.5 rounded-full bg-muted-foreground/50" />
              </div>
            </>
          )}
        </div>
      </div>
    );

  });

  return (
    <div className="flex gap-3">
      {/* Time scale - hidden when shared time scale is used */}
      {!hideTimeScale && (
        <div
          className="flex flex-col shrink-0 text-xs font-mono text-muted-foreground"
          style={{ width: "3rem" }}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="pr-2 text-right"
              style={{
                height: CALENDAR_PX_PER_HOUR,
                lineHeight: `${CALENDAR_PX_PER_HOUR}px`,
              }}
            >
              {h.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>
      )}

      {/* Calendar column - grid of hourly slots */}
      <div
        ref={gridRef}
        className={`relative ${hideTimeScale ? "w-full" : "flex-1"} min-w-0 overflow-hidden`}
        style={{ height: CALENDAR_DAY_HEIGHT }}
      >
        {/* Grid lines - hour (bold) and 15-min (subtle) */}
        {Array.from({ length: 97 }, (_, i) => (
          <div
            key={`grid-${i}`}
            className={`absolute left-0 right-0 h-px pointer-events-none ${i % 4 === 0 ? "bg-border/60" : "bg-border/25"}`}
            style={{ top: i * PX_PER_QUARTER }}
          />
        ))}
        {/* Current time line */}
        {isTodayFlag && (() => {
          const now = Date.now();
          if (now < dayStart || now > dayEnd) return null;
          const topPx =
            ((now - dayStart) / (dayEnd - dayStart)) * CALENDAR_DAY_HEIGHT;
          return (
            <div
              className="absolute left-0 right-0 z-20 h-0.5 bg-red-500 pointer-events-none"
              style={{ top: topPx }}
              title={`Now: ${formatTime(now)}`}
            >
              <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
            </div>
          );
        })()}
        {slots}
      </div>
    </div>
  );
}
