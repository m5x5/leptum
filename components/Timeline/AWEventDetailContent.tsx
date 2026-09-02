"use client";
import React, { useState, useEffect, useRef } from "react";
import { ProcessedAWEvent } from "../../activity-watch.d";
import { Button } from "../ui/button";

interface AWEventDetailContentProps {
  event: ProcessedAWEvent;
  onCreateManualEntry?: (event: ProcessedAWEvent) => void;
  onClose: () => void;
  compact?: boolean;
}

/**
 * Renders AW event detail. Defers JSON.stringify to avoid blocking the main thread on click.
 * The popup appears immediately with header/basic info; Event Data is filled in asynchronously.
 */
export function AWEventDetailContent({
  event,
  onCreateManualEntry,
  onClose,
  compact = false,
}: AWEventDetailContentProps) {
  const [eventDataJson, setEventDataJson] = useState<string | null>(null);
  const eventIdRef = useRef(event.id);
  const isMountedRef = useRef(true);
  const processedEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (processedEventIdRef.current === event.id) return;
    processedEventIdRef.current = event.id;

    isMountedRef.current = true;
    eventIdRef.current = event.id;
    setEventDataJson(null);

    const id = requestAnimationFrame(() => {
      if (!isMountedRef.current) return;
      const json = JSON.stringify(event.eventData, null, 2);
      if (eventIdRef.current === event.id && isMountedRef.current) {
        setEventDataJson(json);
      }
    });

    return () => {
      isMountedRef.current = false;
      processedEventIdRef.current = null;
      cancelAnimationFrame(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- event.eventData intentionally omitted to avoid re-run on parent re-render
  }, [event.id]);

  return (
    <div className={compact ? "space-y-2" : "space-y-4 mt-4"}>
      {/* Header Info */}
      <div className={`flex items-center gap-3 bg-muted rounded-control ${compact ? "p-2" : "p-3"}`}>
        <div className={`rounded-cell ${event.color} ${compact ? "w-2 h-8" : "w-3 h-12"}`} />
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{event.displayName}</h4>
          <p className="text-sm text-muted-foreground">{event.bucketType}</p>
        </div>
      </div>

      {/* Basic Info - renders immediately */}
      <div className={compact ? "space-y-1" : "space-y-2"}>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Timestamp</p>
            <p className="text-sm text-muted-foreground">
              {new Date(event.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Duration</p>
            <p className="text-sm text-muted-foreground">
              {Math.floor(event.duration / 60)}m {Math.floor(event.duration % 60)}s
            </p>
          </div>
        </div>
      </div>

      {/* Event Data - deferred to avoid blocking */}
      <div className={`border-t border-border ${compact ? "pt-2" : "pt-4"}`}>
        <h5 className={`font-semibold text-foreground mb-1 ${compact ? "text-xs" : "text-sm"}`}>
          Event Data
        </h5>
        <div
          className={`bg-background rounded-control border border-border overflow-y-auto scrollbar-hide ${compact ? "p-2 max-h-32" : "p-3 max-h-64"}`}
        >
          <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words">
            {eventDataJson ?? (
              <span className="text-muted-foreground italic">Loading…</span>
            )}
          </pre>
        </div>
      </div>

      <div className={`flex gap-2 justify-between ${compact ? "pt-2" : "pt-4"}`}>
        {onCreateManualEntry && (
          <Button
            variant="secondary"
            onClick={() => {
              onCreateManualEntry(event);
              onClose();
            }}
          >
            Create Manual Entry
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={onClose}
          className="ml-auto"
        >
          Close
        </Button>
      </div>
    </div>
  );
}
