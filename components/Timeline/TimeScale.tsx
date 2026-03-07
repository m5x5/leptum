"use client";
import React from "react";
import { CALENDAR_PX_PER_HOUR, CALENDAR_DAY_HEIGHT } from "./calendarConstants";

export function TimeScale() {
  return (
    <div
      className="flex flex-col shrink-0 text-xs font-mono text-muted-foreground pr-2"
      style={{ width: "3rem", height: CALENDAR_DAY_HEIGHT }}
    >
      {Array.from({ length: 24 }, (_, h) => (
        <div
          key={h}
          className="text-right"
          style={{
            height: CALENDAR_PX_PER_HOUR,
            lineHeight: `${CALENDAR_PX_PER_HOUR}px`,
          }}
        >
          {h.toString().padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}
