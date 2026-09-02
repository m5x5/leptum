"use client";
import { useState, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { ProcessedAWEvent } from "../../activity-watch.d";

interface ManualActivity {
  date: number;
  endTime?: number;
  requiresOnlineTime?: boolean;
}

interface HeaderPresenceBarProps {
  dateKey: string;
  afkEvents: ProcessedAWEvent[];
  isTodayFlag: boolean;
  formatTime: (ts: number) => string;
  dayImpacts?: ManualActivity[];
}

const BLOCK_SIZE = 15 * 60 * 1000;

/**
 * Self-contained presence (AFK status) bar for the day card header.
 * Owns its own hover state so mouse moves never re-render the parent tree.
 */
export const HeaderPresenceBar = memo(function HeaderPresenceBar({
  dateKey,
  afkEvents,
  isTodayFlag,
  formatTime,
  dayImpacts = [],
}: HeaderPresenceBarProps) {
  const [hoverState, setHoverState] = useState<{
    x: number;
    y: number;
    percent: number;
    status: string;
    time: string;
  } | null>(null);

  const { dayStart, dayEnd } = useMemo(() => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return {
      dayStart: new Date(year, month - 1, day).getTime(),
      dayEnd: new Date(year, month - 1, day, 23, 59, 59, 999).getTime(),
    };
  }, [dateKey]);

  const { afkMap, blocks, activeMs } = useMemo(() => {
    const map = new Map<number, boolean>();

    // AFK events
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

    // Manual activities with requiresOnlineTime — mark their blocks as active
    dayImpacts.forEach((impact) => {
      if (!impact.requiresOnlineTime || !impact.endTime) return;
      const eventStart = impact.date;
      const eventEnd = impact.endTime;
      const firstBlock = Math.floor(eventStart / BLOCK_SIZE) * BLOCK_SIZE;
      const lastBlock = Math.floor(eventEnd / BLOCK_SIZE) * BLOCK_SIZE;
      for (let bs = firstBlock; bs <= lastBlock; bs += BLOCK_SIZE) {
        const overlapStart = Math.max(eventStart, bs);
        const overlapEnd = Math.min(eventEnd, bs + BLOCK_SIZE);
        if (overlapEnd > overlapStart) {
          map.set(bs, true);
        }
      }
    });

    const blks: Array<{ time: number; isActive: boolean }> = [];
    let active = 0;
    for (let t = dayStart; t < dayEnd; t += BLOCK_SIZE) {
      const isActive = map.get(t) === true;
      blks.push({ time: t, isActive });
      if (isActive) active += BLOCK_SIZE;
    }
    return { afkMap: map, blocks: blks, activeMs: active };
  }, [afkEvents, dayImpacts, dayStart, dayEnd]);

  const formatActiveTime = (ms: number) => {
    const h = Math.floor(ms / (60 * 60 * 1000));
    const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const currentTimePercent = isTodayFlag
    ? ((Date.now() - dayStart) / (dayEnd - dayStart)) * 100
    : null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const timeAtPosition = dayStart + (percent / 100) * (dayEnd - dayStart);
    const bs = Math.floor(timeAtPosition / BLOCK_SIZE) * BLOCK_SIZE;
    setHoverState({
      x: e.clientX,
      y: rect.bottom + 6,
      percent,
      status: afkMap.get(bs) === true ? "Active" : "Away",
      time: formatTime(timeAtPosition),
    });
  };

  const handleMouseLeave = () => setHoverState(null);

  // Monday = first day of week; show the Active/Away legend only on Mondays.
  const isFirstOfWeek = new Date(dayStart).getDay() === 1;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted-foreground">
          {activeMs === 0
            ? "Offline day"
            : `Online (${formatActiveTime(activeMs)})${isFirstOfWeek ? ":" : ""}`}
        </span>
        {isFirstOfWeek && (
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-muted-foreground">Away</span>
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <div
          className="relative flex h-2 rounded overflow-hidden border border-border"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {blocks.map((block, idx) => (
            <div
              key={idx}
              className={`flex-1 ${block.isActive ? "bg-green-500" : "bg-gray-600"}`}
              title={`${formatTime(block.time)}: ${block.isActive ? "Active" : "Away"}`}
            />
          ))}
          {currentTimePercent !== null &&
            currentTimePercent >= 0 &&
            currentTimePercent <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: `${currentTimePercent}%` }}
              />
            )}
          {hoverState !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-foreground/60 z-20 pointer-events-none"
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
              <div className="font-semibold">{hoverState.status}</div>
              <div className="text-muted-foreground">{hoverState.time}</div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
});
