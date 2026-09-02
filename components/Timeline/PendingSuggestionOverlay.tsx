"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  type PendingSuggestion,
  getPendingSuggestions,
  persistSuggestions,
} from "../WebMCPProvider";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { CALENDAR_DAY_HEIGHT } from "./calendarConstants";
import { Button } from "../ui/button";

interface Props {
  dateKey: string;
  dayStart: number;
  dayEnd: number;
  formatTime: (ts: number) => string;
}

interface OverlayBlock {
  suggestionId: string;
  blockIndex: number;
  start: number;
  end: number;
  activity: string;
  notes?: string;
}

function dateKeyOf(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PendingSuggestionOverlay({ dateKey, dayStart, dayEnd, formatTime }: Props) {
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    const map = getPendingSuggestions();
    setSuggestions(Array.from(map.values()).filter((s) => s.status === "pending"));
  }, []);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    reload();
    const events = [
      "webmcp:suggestion",
      "webmcp:suggestion-updated",
      "webmcp:suggestion-confirmed",
      "webmcp:suggestion-cancelled",
    ];
    events.forEach((e) => window.addEventListener(e, reload));
    return () => events.forEach((e) => window.removeEventListener(e, reload));
  }, [reload]);

  const fullDayMs = dayEnd - dayStart;
  const toTop = (t: number) => ((t - dayStart) / fullDayMs) * CALENDAR_DAY_HEIGHT;
  const toHeight = (s: number, e: number) =>
    Math.max(20, ((e - s) / fullDayMs) * CALENDAR_DAY_HEIGHT);

  const blocks: OverlayBlock[] = [];
  for (const s of suggestions) {
    s.blocks.forEach((b, i) => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      if (dateKeyOf(start) !== dateKey) return;
      blocks.push({
        suggestionId: s.id,
        blockIndex: i,
        start,
        end,
        activity: b.activity,
        notes: b.notes,
      });
    });
  }

  if (blocks.length === 0) return null;

  const confirmBlock = async (suggestionId: string, blockIndex: number) => {
    const busyKey = `${suggestionId}:${blockIndex}`;
    setBusy((prev) => new Set(prev).add(busyKey));
    try {
      const map = getPendingSuggestions();
      const s = map.get(suggestionId);
      if (!s || s.status !== "pending") return;
      const block = s.blocks[blockIndex];
      if (!block) return;
      const impacts = await remoteStorageClient.getImpacts();
      const newImpact = {
        id: crypto.randomUUID(),
        activity: block.activity,
        date: new Date(block.startTime).getTime(),
        endTime: new Date(block.endTime).getTime(),
        notes: block.notes,
        goalId: block.goalId,
        stress: block.metrics?.stress,
        fulfillment: block.metrics?.fulfillment,
        motivation: block.metrics?.motivation,
        energy: block.metrics?.energy,
        focus: block.metrics?.focus,
      };
      impacts.push(newImpact);
      await remoteStorageClient.saveImpacts(impacts);
      s.blocks = s.blocks.filter((_, i) => i !== blockIndex);
      if (s.blocks.length === 0) {
        s.status = "confirmed";
      }
      map.set(suggestionId, s);
      persistSuggestions(map);
      window.dispatchEvent(new CustomEvent("impactsUpdated"));
      window.dispatchEvent(
        new CustomEvent("webmcp:suggestion-updated", { detail: s })
      );
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(busyKey);
        return next;
      });
      reload();
    }
  };

  const dismissBlock = (suggestionId: string, blockIndex: number) => {
    const map = getPendingSuggestions();
    const s = map.get(suggestionId);
    if (!s || s.status !== "pending") return;
    s.blocks = s.blocks.filter((_, i) => i !== blockIndex);
    if (s.blocks.length === 0) {
      s.status = "cancelled";
    }
    map.set(suggestionId, s);
    persistSuggestions(map);
    window.dispatchEvent(new CustomEvent("webmcp:suggestion-updated", { detail: s }));
    reload();
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ height: CALENDAR_DAY_HEIGHT }}
    >
      {blocks.map((b) => {
        const top = toTop(Math.max(b.start, dayStart));
        const height = toHeight(Math.max(b.start, dayStart), Math.min(b.end, dayEnd));
        const isBusy = busy.has(`${b.suggestionId}:${b.blockIndex}`);
        return (
          <div
            key={`${b.suggestionId}-${b.blockIndex}`}
            className="absolute left-0 right-0 pointer-events-auto rounded-control border-2 border-dashed border-blue-400 dark:border-blue-500 bg-card shadow-sm overflow-hidden"
            style={{ top, height, zIndex: 20 }}
          >
            <div className="h-full flex flex-col p-2 gap-2 overflow-hidden">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {b.activity}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTime(b.start)} – {formatTime(b.end)} · suggested
                </p>
              </div>
              {height >= 64 && (
                <div className="mt-auto flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => dismissBlock(b.suggestionId, b.blockIndex)}
                    aria-label="Dismiss suggestion"
                    title="Dismiss"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
                    </svg>
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => confirmBlock(b.suggestionId, b.blockIndex)}
                    disabled={isBusy}
                    aria-label="Accept suggestion"
                    title="Accept"
                  >
                    {isBusy ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.55a1 1 0 0 1-1.42 0L3.29 9.745a1 1 0 0 1 1.42-1.41l3.79 3.815 6.79-6.84a1 1 0 0 1 1.414-.02Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
