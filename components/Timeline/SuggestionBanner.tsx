"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  type PendingSuggestion,
  getPendingSuggestions,
  persistSuggestions,
} from "../WebMCPProvider";
import { remoteStorageClient } from "../../lib/remoteStorage";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function dateKeyOf(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function scrollToDay(iso: string) {
  const el = document.getElementById(`day-${dateKeyOf(iso)}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  el.classList.add("ring-2", "ring-blue-400", "ring-offset-2");
  setTimeout(() => el.classList.remove("ring-2", "ring-blue-400", "ring-offset-2"), 1500);
}

export function SuggestionBanner() {
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
  const [confirming, setConfirming] = useState<Set<string>>(new Set());

  const loadSuggestions = useCallback(() => {
    const map = getPendingSuggestions();
    const pending = Array.from(map.values()).filter((s) => s.status === "pending");
    setSuggestions(pending);
  }, []);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadSuggestions();

    const onNew = () => loadSuggestions();
    const onUpdated = () => loadSuggestions();
    const onConfirmed = () => loadSuggestions();
    const onCancelled = () => loadSuggestions();

    window.addEventListener("webmcp:suggestion", onNew);
    window.addEventListener("webmcp:suggestion-updated", onUpdated);
    window.addEventListener("webmcp:suggestion-confirmed", onConfirmed);
    window.addEventListener("webmcp:suggestion-cancelled", onCancelled);

    // Also check sessionStorage on focus (in case another tab changed it)
    const onFocus = () => loadSuggestions();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("webmcp:suggestion", onNew);
      window.removeEventListener("webmcp:suggestion-updated", onUpdated);
      window.removeEventListener("webmcp:suggestion-confirmed", onConfirmed);
      window.removeEventListener("webmcp:suggestion-cancelled", onCancelled);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadSuggestions]);

  const handleConfirm = useCallback(async (id: string) => {
    setConfirming((prev) => new Set(prev).add(id));
    try {
      const map = getPendingSuggestions();
      const suggestion = map.get(id);
      if (!suggestion || suggestion.status !== "pending") return;

      const impacts = await remoteStorageClient.getImpacts();
      const newImpacts = suggestion.blocks.map((block) => ({
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
      }));

      impacts.push(...newImpacts);
      await remoteStorageClient.saveImpacts(impacts);

      suggestion.status = "confirmed";
      map.set(id, suggestion);
      persistSuggestions(map);

      window.dispatchEvent(new CustomEvent("impactsUpdated"));
      window.dispatchEvent(
        new CustomEvent("webmcp:suggestion-confirmed", { detail: { suggestion, newImpacts } })
      );
    } finally {
      setConfirming((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadSuggestions();
    }
  }, [loadSuggestions]);

  const handleCancel = useCallback((id: string) => {
    const map = getPendingSuggestions();
    const suggestion = map.get(id);
    if (!suggestion || suggestion.status !== "pending") return;

    suggestion.status = "cancelled";
    map.set(id, suggestion);
    persistSuggestions(map);

    window.dispatchEvent(
      new CustomEvent("webmcp:suggestion-cancelled", { detail: suggestion })
    );
    loadSuggestions();
  }, [loadSuggestions]);

  const handleConfirmAll = useCallback(async () => {
    for (const s of suggestions) {
      await handleConfirm(s.id);
    }
  }, [suggestions, handleConfirm]);

  const handleCancelAll = useCallback(() => {
    for (const s of suggestions) {
      handleCancel(s.id);
    }
  }, [suggestions, handleCancel]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4 rounded-control border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
            {suggestions.length} pending suggestion{suggestions.length !== 1 ? "s" : ""}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirmAll}
            className="px-3 py-1 text-xs font-medium rounded-chip bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Confirm all
          </button>
          <button
            onClick={handleCancelAll}
            className="px-3 py-1 text-xs font-medium rounded-chip bg-transparent text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            Dismiss all
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {suggestions.map((suggestion) => {
          const isLoading = confirming.has(suggestion.id);
          const firstStart = suggestion.blocks[0]?.startTime;
          const dateStr = firstStart ? formatDate(firstStart) : "Unknown date";

          return (
            <div
              key={suggestion.id}
              className="rounded-chip border border-blue-200 dark:border-blue-800/50 bg-white dark:bg-blue-950/20 overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{dateStr}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {suggestion.sourceDescription}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {firstStart && (
                    <button
                      onClick={() => scrollToDay(firstStart)}
                      className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                    >
                      Go to day
                    </button>
                  )}
                  <button
                    onClick={() => handleConfirm(suggestion.id)}
                    disabled={isLoading}
                    className="px-2 py-0.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? "..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => handleCancel(suggestion.id)}
                    className="px-2 py-0.5 text-xs rounded bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
