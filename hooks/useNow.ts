"use client";

import { useEffect, useState } from "react";

/**
 * Ticking "now" timestamp for render computations that need the current time
 * (deadlines, countdowns, "time since"). Reading `Date.now()` directly inside
 * a render/useMemo body is impure — React Compiler may cache the result and
 * never re-evaluate it as real time passes. This hook makes the passage of
 * time an explicit dependency instead: the consuming component re-renders
 * every `intervalMs`, and callers should include the returned value in their
 * `useMemo`/`useCallback` dependency arrays.
 */
export function useNow(intervalMs: number = 60000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
