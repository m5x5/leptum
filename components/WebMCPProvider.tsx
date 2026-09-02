"use client";
import { useEffect } from "react";
import type { Impact } from "../lib/remoteStorage";
declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema?: Record<string, unknown>;
          execute: (input: Record<string, unknown>, client?: unknown) => Promise<unknown>;
          annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
        },
        options?: { signal?: AbortSignal; exposedTo?: string[] },
      ) => Promise<void>;
    };
  }

  interface Document {
    modelContext?: Navigator["modelContext"];
  }

  interface Window {
    __leptum_webmcp_abort_controller?: AbortController;
    __webmcp_pending_suggestions: Map<string, PendingSuggestion>;
  }
}

export interface SuggestedTimeBlock {
  activity: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  notes?: string;
  goalId?: string;
  metrics?: {
    stress?: number;
    fulfillment?: number;
    motivation?: number;
    energy?: number;
    focus?: number;
  };
}

export interface PendingSuggestion {
  id: string;
  blocks: SuggestedTimeBlock[];
  status: "pending" | "confirmed" | "cancelled" | "edited";
  createdAt: number;
  sourceDescription: string;
}

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function nativeWebMCPResult(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as any).content) &&
    (data as any).content.length === 1 &&
    (data as any).content[0]?.type === "text"
  ) {
    const text = (data as any).content[0].text;
    if (typeof text === "string") {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
  return data;
}

function getNativeModelContext() {
  // The current explainer/spec draft uses document.modelContext. Older
  // Chrome 149 origin-trial builds only expose navigator.modelContext,
  // which is now deprecated there — prefer document's so we don't trip
  // that deprecation warning on browsers that already have it.
  return document.modelContext ?? navigator.modelContext;
}

function createNativeWebMCPAdapter(signal: AbortSignal) {
  let registrationQueue = Promise.resolve();

  return {
    registerTool(
      name: string,
      description: string,
      inputSchema: Record<string, unknown>,
      execute: (params: Record<string, unknown>, client?: unknown) => Promise<unknown>,
    ) {
      registrationQueue = registrationQueue
        .then(() => getNativeModelContext()?.registerTool(
          {
            name,
            title: name,
            description,
            inputSchema,
            execute: async (input: Record<string, unknown> = {}, client?: unknown) => {
              const result = await execute(input, client);
              return nativeWebMCPResult(result);
            },
          },
          { signal },
        ))
        .then(() => {
          console.info(`[WebMCP] Registered tool: ${name}`);
        })
        .catch((error) => {
          console.error(`[WebMCP] Failed to register ${name}:`, error);
        });
    },
  };
}

async function getClient() {
  const mod = await import("../lib/remoteStorage");
  return mod.remoteStorageClient;
}

export const SUGGESTIONS_STORAGE_KEY = "webmcp_pending_suggestions";

export function persistSuggestions(map: Map<string, PendingSuggestion>) {
  try {
    const arr = Array.from(map.values()).filter(s => s.status === "pending");
    sessionStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(arr));
  } catch { /* quota exceeded or unavailable */ }
}

export function getPendingSuggestions(): Map<string, PendingSuggestion> {
  if (!window.__webmcp_pending_suggestions) {
    window.__webmcp_pending_suggestions = new Map();
    // Restore from sessionStorage
    try {
      const stored = sessionStorage.getItem(SUGGESTIONS_STORAGE_KEY);
      if (stored) {
        const arr: PendingSuggestion[] = JSON.parse(stored);
        for (const s of arr) {
          window.__webmcp_pending_suggestions.set(s.id, s);
        }
      }
    } catch { /* parse error */ }
  }
  return window.__webmcp_pending_suggestions;
}

function computeDurations(impacts: Impact[], dateStr: string): Array<Impact & { durationMinutes: number; startTimeFormatted: string; endTimeFormatted: string }> {
  const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);
  const now = Date.now();

  const dayImpacts = impacts
    .filter((i) => {
      if (i.allDay) return false;
      const t = i.date;
      if (t >= dayStart && t <= dayEnd) return true;
      if (i.endTime && i.endTime > dayStart && t < dayStart) return true;
      return false;
    })
    .sort((a, b) => a.date - b.date);

  return dayImpacts.map((impact, idx) => {
    const start = Math.max(impact.date, dayStart);
    let end: number;
    if (impact.endTime) {
      end = Math.min(impact.endTime, dayEnd);
    } else if (idx < dayImpacts.length - 1) {
      end = dayImpacts[idx + 1].date;
    } else {
      end = now < dayEnd ? now : dayEnd;
    }
    const durationMinutes = Math.round((end - start) / 60000);
    const fmt = (ts: number) => {
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    return { ...impact, durationMinutes, startTimeFormatted: fmt(start), endTimeFormatted: fmt(end) };
  });
}

async function registerTools(widget: any) {
  widget.registerTool(
    "get-impacts",
    "Get timeline activity impacts, optionally filtered by date (YYYY-MM-DD)",
    {
      type: "object",
      properties: {
        date: { type: "string", description: "Optional date filter in YYYY-MM-DD format" },
      },
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const impacts = await client.getImpacts();
      if (params.date) {
        const dateStr = params.date as string;
        const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
        const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);
        const filtered = impacts.filter((i: any) => i.date >= dayStart && i.date <= dayEnd);
        return textResult({ count: filtered.length, impacts: filtered });
      }
      return textResult({ count: impacts.length, impacts });
    },
  );

  widget.registerTool(
    "log-impact",
    "Create a new impact (mood/activity) entry in the timeline",
    {
      type: "object",
      properties: {
        activity: { type: "string", description: "Activity name" },
        date: { type: "string", description: "ISO date string or timestamp" },
        stress: { type: "number", description: "Stress level 1-10" },
        fulfillment: { type: "number", description: "Fulfillment level 1-10" },
        motivation: { type: "number", description: "Motivation level 1-10" },
        energy: { type: "number", description: "Energy level 1-10" },
        focus: { type: "number", description: "Focus level 1-10" },
        notes: { type: "string", description: "Optional notes" },
      },
      required: ["activity"],
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const impacts = await client.getImpacts();
      const newImpact = {
        id: crypto.randomUUID(),
        activity: params.activity as string,
        date: params.date ? new Date(params.date as string).getTime() : Date.now(),
        stress: params.stress as number | undefined,
        fulfillment: params.fulfillment as number | undefined,
        motivation: params.motivation as number | undefined,
        energy: params.energy as number | undefined,
        focus: params.focus as number | undefined,
        notes: params.notes as string | undefined,
      };
      impacts.push(newImpact);
      await client.saveImpacts(impacts);
      return textResult({ success: true, impact: newImpact });
    },
  );

  widget.registerTool(
    "get-tasks",
    "Get all standalone (home) tasks",
    { type: "object", properties: {} },
    async () => {
      const client = await getClient();
      const tasks = await client.getStandaloneTasks();
      return textResult({ count: tasks.length, tasks });
    },
  );

  widget.registerTool(
    "create-task",
    "Create a new standalone task",
    {
      type: "object",
      properties: {
        name: { type: "string", description: "Task name" },
        description: { type: "string", description: "Task description" },
        effort: {
          type: "string",
          enum: ["XS", "S", "M", "L", "XL"],
          description: "Effort estimate",
        },
      },
      required: ["name"],
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const newTask = {
        id: crypto.randomUUID(),
        name: params.name as string,
        description: (params.description as string) || "",
        status: "due" as const,
        createdAt: Date.now(),
        effort: params.effort as "XS" | "S" | "M" | "L" | "XL" | undefined,
      };
      await client.addStandaloneTask(newTask);
      return textResult({ success: true, task: newTask });
    },
  );

  widget.registerTool(
    "get-routines",
    "Get all routines with their tasks",
    { type: "object", properties: {} },
    async () => {
      const client = await getClient();
      const routines = await client.getRoutines();
      return textResult({ count: routines.length, routines });
    },
  );

  widget.registerTool(
    "complete-routine",
    "Mark a routine as completed",
    {
      type: "object",
      properties: {
        routineId: { type: "string", description: "The routine ID to complete" },
      },
      required: ["routineId"],
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const routineId = params.routineId as string;
      const routines = await client.getRoutines();
      const routine = routines.find((r: any) => r.id === routineId);
      if (!routine) {
        return textResult({ success: false, error: "Routine not found" });
      }
      const completion = {
        routineId,
        routineInstanceId: `${routineId}-${Date.now()}`,
        routineName: routine.name,
        completedAt: Date.now(),
        taskCount: routine.tasks.length,
      };
      await client.addRoutineCompletion(completion);
      return textResult({ success: true, completion });
    },
  );

  widget.registerTool(
    "get-goals",
    "Get all goals",
    { type: "object", properties: {} },
    async () => {
      const client = await getClient();
      const goals = await client.getGoals();
      return textResult({ count: goals.length, goals });
    },
  );

  widget.registerTool(
    "create-goal",
    "Create a new goal",
    {
      type: "object",
      properties: {
        name: { type: "string", description: "Goal name" },
        color: { type: "string", description: "Tailwind color class (e.g. bg-green-500)" },
        type: { type: "string", description: "Goal type ID (optional)" },
        description: { type: "string", description: "Goal description (optional)" },
      },
      required: ["name"],
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const newGoal = {
        id: crypto.randomUUID(),
        name: params.name as string,
        color: (params.color as string) || "bg-blue-500",
        type: (params.type as string) || "892bfea3-61d5-4ac2-8390-7800412ae178",
        createdAt: Date.now(),
        status: "active",
        description: (params.description as string) || undefined,
        "@context": "http://remotestorage.io/spec/modules/leptum/Goal",
      };
      await client.saveGoal(newGoal as any);
      return textResult({ success: true, goal: newGoal });
    },
  );

  widget.registerTool(
    "update-impact",
    "Update an existing impact entry by ID. Only provided fields will be changed.",
    {
      type: "object",
      properties: {
        id: { type: "string", description: "The impact ID to update" },
        activity: { type: "string", description: "New activity name" },
        goalId: { type: "string", description: "Goal ID to assign" },
        notes: { type: "string", description: "New notes" },
        requiresOnlineTime: { type: "boolean", description: "Whether this activity counts as online/screen time" },
      },
      required: ["id"],
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const impacts = await client.getImpacts();
      const idx = impacts.findIndex((i: any) => i.id === params.id);
      if (idx === -1) {
        return textResult({ success: false, error: "Impact not found" });
      }
      if (params.activity !== undefined) impacts[idx].activity = params.activity as string;
      if (params.goalId !== undefined) impacts[idx].goalId = params.goalId as string;
      if (params.notes !== undefined) impacts[idx].notes = params.notes as string;
      if (params.requiresOnlineTime !== undefined) impacts[idx].requiresOnlineTime = params.requiresOnlineTime as boolean;
      await client.saveImpacts(impacts);
      window.dispatchEvent(new CustomEvent("impactsUpdated"));
      return textResult({ success: true, impact: impacts[idx] });
    },
  );

  widget.registerTool(
    "get-insights",
    "Get all insights (patterns and observations about wellbeing)",
    { type: "object", properties: {} },
    async () => {
      const client = await getClient();
      const insights = await client.getInsights();
      return textResult({ count: insights.length, insights });
    },
  );

  widget.registerTool(
    "create-insight",
    "Create a new insight about patterns affecting wellbeing",
    {
      type: "object",
      properties: {
        name: { type: "string", description: "Insight name/title" },
        affectedMetrics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              metric: { type: "string" },
              effect: { type: "string", enum: ["positive", "negative"] },
            },
            required: ["metric", "effect"],
          },
          description: "Metrics affected by this insight",
        },
        notes: { type: "string", description: "Additional notes" },
        category: { type: "string", description: "Insight category" },
      },
      required: ["name", "affectedMetrics"],
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const newInsight = {
        id: crypto.randomUUID(),
        name: params.name as string,
        affectedMetrics: params.affectedMetrics as Array<{ metric: string; effect: "positive" | "negative" }>,
        notes: params.notes as string | undefined,
        category: params.category as string | undefined,
        createdAt: Date.now(),
      };
      await client.saveInsight(newInsight);
      return textResult({ success: true, insight: newInsight });
    },
  );

  widget.registerTool(
    "get-weekly-summary",
    "Get a summary of impacts, tasks, and routine completions for the current week",
    { type: "object", properties: {} },
    async () => {
      const client = await getClient();
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const weekStart = monday.getTime();
      const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;

      const [impacts, tasks, completions] = await Promise.all([
        client.getImpacts(),
        client.getStandaloneTasks(),
        client.getRoutineCompletions(),
      ]);

      const weekImpacts = impacts.filter((i: any) => i.date >= weekStart && i.date < weekEnd);
      const weekTasks = tasks.filter(
        (t: any) =>
          t.createdAt >= weekStart ||
          (t.completedAt && t.completedAt >= weekStart && t.completedAt < weekEnd),
      );
      const weekCompletions = completions.filter(
        (c: any) => c.completedAt >= weekStart && c.completedAt < weekEnd,
      );

      return textResult({
        weekStart: monday.toISOString().slice(0, 10),
        impacts: { count: weekImpacts.length, items: weekImpacts },
        tasks: { count: weekTasks.length, items: weekTasks },
        routineCompletions: { count: weekCompletions.length, items: weekCompletions },
      });
    },
  );

  widget.registerTool(
    "get-user-settings",
    "Get user settings (date of birth, etc.)",
    { type: "object", properties: {} },
    async () => {
      const client = await getClient();
      const settings = await client.getUserSettings();
      return textResult(settings);
    },
  );

  widget.registerTool(
    "get-entities",
    "Get all entities (people, projects, contexts)",
    { type: "object", properties: {} },
    async () => {
      const client = await getClient();
      const entities = await client.getEntities();
      return textResult({ count: entities.length, entities });
    },
  );

  // --- Timeline day view with computed durations ---
  widget.registerTool(
    "get-timeline-day",
    "Get a detailed timeline for a specific day with computed durations, gaps, and all-day activities. Returns activities sorted chronologically with start/end times and duration in minutes.",
    {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format (defaults to today)" },
      },
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const [impacts, goals] = await Promise.all([
        client.getImpacts(),
        client.getGoals(),
      ]);
      const dateStr = (params.date as string) || new Date().toISOString().slice(0, 10);

      const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);

      const allDayActivities = impacts.filter(
        (i: Impact) => i.allDay && i.date >= dayStart && i.date <= dayEnd,
      );

      const timedActivities = computeDurations(impacts, dateStr);

      // Find gaps (untracked time)
      const gaps: Array<{ startTime: string; endTime: string; durationMinutes: number }> = [];
      for (let i = 0; i < timedActivities.length - 1; i++) {
        const currentEnd = timedActivities[i].endTime
          ? Math.min(timedActivities[i].endTime!, dayEnd)
          : timedActivities[i + 1].date;
        const nextStart = timedActivities[i + 1].date;
        const gapMinutes = Math.round((nextStart - currentEnd) / 60000);
        if (gapMinutes > 5) {
          const fmt = (ts: number) => {
            const d = new Date(ts);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          };
          gaps.push({
            startTime: fmt(currentEnd),
            endTime: fmt(nextStart),
            durationMinutes: gapMinutes,
          });
        }
      }

      const totalTracked = timedActivities.reduce((sum, a) => sum + a.durationMinutes, 0);

      return textResult({
        date: dateStr,
        totalTrackedMinutes: totalTracked,
        totalTrackedFormatted: `${Math.floor(totalTracked / 60)}h ${totalTracked % 60}m`,
        gapsCount: gaps.length,
        gaps,
        availableGoals: goals.map((g: any) => ({ id: g.id, name: g.name, color: g.color })),
        allDayActivities: allDayActivities.map((a: Impact) => ({
          id: a.id,
          activity: a.activity,
          notes: a.notes,
          goalId: a.goalId,
        })),
        activities: timedActivities.map((a) => ({
          id: a.id,
          activity: a.activity,
          startTime: a.startTimeFormatted,
          endTime: a.endTimeFormatted,
          durationMinutes: a.durationMinutes,
          notes: a.notes,
          goalId: a.goalId,
          stress: a.stress,
          fulfillment: a.fulfillment,
          motivation: a.motivation,
          energy: a.energy,
          focus: a.focus,
        })),
      });
    },
  );

  // --- ActivityWatch events for a date range ---
  widget.registerTool(
    "get-activity-watch-events",
    "Get ActivityWatch computer activity data for a date range. Returns app usage, editor activity, browser activity, and AFK status. Use this to understand what the user was actually doing on their computer to suggest time blocks.",
    {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format (defaults to today)" },
        bucketType: {
          type: "string",
          enum: ["window", "editor", "browser", "afkstatus", "all"],
          description: "Filter by bucket type (default: all except afkstatus)",
        },
        minDurationSeconds: {
          type: "number",
          description: "Minimum event duration in seconds to include (default: 60)",
        },
      },
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const dateStr = (params.date as string) || new Date().toISOString().slice(0, 10);
      const dayStart = new Date(dateStr).setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateStr).setHours(23, 59, 59, 999);
      const minDuration = (params.minDurationSeconds as number) || 60;
      const bucketType = (params.bucketType as string) || "all";

      const events = await client.getActivityWatchEventsInRange(dayStart, dayEnd);

      const filtered = events.filter((e: any) => {
        if (e.duration < minDuration) return false;
        if (bucketType === "all") return e.bucketType !== "afkstatus";
        return e.bucketType === bucketType;
      });

      // Group by app/activity for a summary
      const summary: Record<string, { totalMinutes: number; eventCount: number; bucketType: string }> = {};
      for (const e of filtered) {
        const key = e.displayName || "Unknown";
        if (!summary[key]) {
          summary[key] = { totalMinutes: 0, eventCount: 0, bucketType: e.bucketType };
        }
        summary[key].totalMinutes += Math.round(e.duration / 60);
        summary[key].eventCount += 1;
      }

      const sortedSummary = Object.entries(summary)
        .sort(([, a], [, b]) => b.totalMinutes - a.totalMinutes)
        .map(([name, data]) => ({ name, ...data }));

      return textResult({
        date: dateStr,
        totalEvents: filtered.length,
        summary: sortedSummary,
        events: filtered.slice(0, 100).map((e: any) => ({
          displayName: e.displayName,
          bucketType: e.bucketType,
          timestamp: new Date(e.timestamp).toISOString(),
          durationSeconds: Math.round(e.duration),
          durationMinutes: Math.round(e.duration / 60),
        })),
        truncated: filtered.length > 100,
      });
    },
  );

  // --- Suggest time blocks ---
  widget.registerTool(
    "suggest-time-blocks",
    "Suggest time blocks for the user's timeline based on analysis. Creates a pending suggestion that the user can review, edit, or confirm. The suggestion will NOT be saved until the user confirms it. Use get-timeline-day first to see available goals (in availableGoals) and link blocks to goals via goalId when the activity obviously relates to a goal.",
    {
      type: "object",
      properties: {
        date: { type: "string", description: "Date for the suggestions in YYYY-MM-DD format" },
        description: {
          type: "string",
          description: "Brief description of why these blocks are being suggested (e.g. 'Based on your ActivityWatch data' or 'Filling gaps in your morning')",
        },
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              activity: { type: "string", description: "Activity name" },
              startTime: {
                type: "string",
                description: "Start time as ISO string or HH:MM (will use the suggestion date)",
              },
              endTime: {
                type: "string",
                description: "End time as ISO string or HH:MM (will use the suggestion date)",
              },
              notes: { type: "string", description: "Optional notes" },
              goalId: { type: "string", description: "Optional goal ID to link" },
              stress: { type: "number", description: "Stress level 1-10" },
              fulfillment: { type: "number", description: "Fulfillment level 1-10" },
              motivation: { type: "number", description: "Motivation level 1-10" },
              energy: { type: "number", description: "Energy level 1-10" },
              focus: { type: "number", description: "Focus level 1-10" },
            },
            required: ["activity", "startTime", "endTime"],
          },
          description: "Array of suggested time blocks",
        },
      },
      required: ["blocks", "description"],
    },
    async (params: Record<string, unknown>) => {
      const dateStr = (params.date as string) || new Date().toISOString().slice(0, 10);
      const rawBlocks = params.blocks;
      const blocks: Array<Record<string, unknown>> = typeof rawBlocks === "string" ? JSON.parse(rawBlocks) : rawBlocks as Array<Record<string, unknown>>;
      const description = params.description as string;

      // Parse time strings, resolving HH:MM to full timestamps on the given date
      const parsedBlocks: SuggestedTimeBlock[] = blocks.map((b) => {
        const parseTime = (t: string): string => {
          if (t.includes("T")) return t; // Already ISO
          const [hours, minutes] = t.split(":").map(Number);
          const d = new Date(dateStr);
          d.setHours(hours, minutes, 0, 0);
          return d.toISOString();
        };
        return {
          activity: b.activity as string,
          startTime: parseTime(b.startTime as string),
          endTime: parseTime(b.endTime as string),
          notes: b.notes as string | undefined,
          goalId: b.goalId as string | undefined,
          metrics: {
            stress: b.stress as number | undefined,
            fulfillment: b.fulfillment as number | undefined,
            motivation: b.motivation as number | undefined,
            energy: b.energy as number | undefined,
            focus: b.focus as number | undefined,
          },
        };
      });

      const suggestion: PendingSuggestion = {
        id: crypto.randomUUID(),
        blocks: parsedBlocks,
        status: "pending",
        createdAt: Date.now(),
        sourceDescription: description,
      };

      const suggestionsMap = getPendingSuggestions();
      suggestionsMap.set(suggestion.id, suggestion);
      persistSuggestions(suggestionsMap);

      // Dispatch event so the UI can show the suggestion
      window.dispatchEvent(
        new CustomEvent("webmcp:suggestion", { detail: suggestion }),
      );

      return textResult({
        success: true,
        suggestionId: suggestion.id,
        status: "pending",
        message: `Created suggestion with ${parsedBlocks.length} time block(s) for ${dateStr}. The user needs to confirm, edit, or cancel this suggestion.`,
        blocks: parsedBlocks.map((b) => ({
          activity: b.activity,
          startTime: b.startTime,
          endTime: b.endTime,
          notes: b.notes,
        })),
      });
    },
  );

  // --- Get pending suggestions ---
  widget.registerTool(
    "get-suggestions",
    "Get all pending time block suggestions. Use this to check the status of previously made suggestions.",
    { type: "object", properties: {} },
    async () => {
      const suggestions = Array.from(getPendingSuggestions().values());
      return textResult({
        count: suggestions.length,
        suggestions: suggestions.map((s) => ({
          id: s.id,
          status: s.status,
          sourceDescription: s.sourceDescription,
          createdAt: new Date(s.createdAt).toISOString(),
          blockCount: s.blocks.length,
          blocks: s.blocks.map((b) => ({
            activity: b.activity,
            startTime: b.startTime,
            endTime: b.endTime,
          })),
        })),
      });
    },
  );

  // --- Edit a suggestion ---
  widget.registerTool(
    "edit-suggestion",
    "Edit a pending time block suggestion. You can modify individual blocks by index, add new blocks, or remove blocks. Only works on suggestions with status 'pending'.",
    {
      type: "object",
      properties: {
        suggestionId: { type: "string", description: "The suggestion ID to edit" },
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              blockIndex: { type: "number", description: "Index of the block to update (0-based)" },
              action: {
                type: "string",
                enum: ["update", "remove", "add"],
                description: "Action to perform on this block",
              },
              activity: { type: "string" },
              startTime: { type: "string" },
              endTime: { type: "string" },
              notes: { type: "string" },
              goalId: { type: "string" },
              stress: { type: "number" },
              fulfillment: { type: "number" },
              motivation: { type: "number" },
              energy: { type: "number" },
              focus: { type: "number" },
            },
            required: ["action"],
          },
          description: "Array of updates to apply",
        },
      },
      required: ["suggestionId", "updates"],
    },
    async (params: Record<string, unknown>) => {
      const suggestionId = params.suggestionId as string;
      const rawUpdates = params.updates;
      const updates: Array<Record<string, unknown>> = typeof rawUpdates === "string" ? JSON.parse(rawUpdates) : rawUpdates as Array<Record<string, unknown>>;
      const suggestions = getPendingSuggestions();
      const suggestion = suggestions.get(suggestionId);

      if (!suggestion) {
        return textResult({ success: false, error: "Suggestion not found" });
      }
      if (suggestion.status !== "pending") {
        return textResult({ success: false, error: `Suggestion is already ${suggestion.status}` });
      }

      for (const update of updates) {
        const action = update.action as string;
        const idx = update.blockIndex as number;

        if (action === "remove") {
          if (idx >= 0 && idx < suggestion.blocks.length) {
            suggestion.blocks.splice(idx, 1);
          }
        } else if (action === "add") {
          suggestion.blocks.push({
            activity: update.activity as string,
            startTime: update.startTime as string,
            endTime: update.endTime as string,
            notes: update.notes as string | undefined,
            goalId: update.goalId as string | undefined,
            metrics: {
              stress: update.stress as number | undefined,
              fulfillment: update.fulfillment as number | undefined,
              motivation: update.motivation as number | undefined,
              energy: update.energy as number | undefined,
              focus: update.focus as number | undefined,
            },
          });
        } else if (action === "update" && idx >= 0 && idx < suggestion.blocks.length) {
          const block = suggestion.blocks[idx];
          if (update.activity) block.activity = update.activity as string;
          if (update.startTime) block.startTime = update.startTime as string;
          if (update.endTime) block.endTime = update.endTime as string;
          if (update.notes !== undefined) block.notes = update.notes as string;
          if (update.goalId !== undefined) block.goalId = update.goalId as string;
          if (!block.metrics) block.metrics = {};
          if (update.stress !== undefined) block.metrics.stress = update.stress as number;
          if (update.fulfillment !== undefined) block.metrics.fulfillment = update.fulfillment as number;
          if (update.motivation !== undefined) block.metrics.motivation = update.motivation as number;
          if (update.energy !== undefined) block.metrics.energy = update.energy as number;
          if (update.focus !== undefined) block.metrics.focus = update.focus as number;
        }
      }

      suggestion.status = "pending";
      suggestions.set(suggestionId, suggestion);
      persistSuggestions(suggestions);

      window.dispatchEvent(
        new CustomEvent("webmcp:suggestion-updated", { detail: suggestion }),
      );

      return textResult({
        success: true,
        suggestionId,
        blocks: suggestion.blocks.map((b) => ({
          activity: b.activity,
          startTime: b.startTime,
          endTime: b.endTime,
          notes: b.notes,
        })),
      });
    },
  );

  // --- Confirm a suggestion (save to timeline) ---
  widget.registerTool(
    "confirm-suggestion",
    "Confirm a pending suggestion, saving all its time blocks to the timeline as real impact entries. Only works on suggestions with status 'pending'.",
    {
      type: "object",
      properties: {
        suggestionId: { type: "string", description: "The suggestion ID to confirm" },
      },
      required: ["suggestionId"],
    },
    async (params: Record<string, unknown>) => {
      const suggestionId = params.suggestionId as string;
      const suggestions = getPendingSuggestions();
      const suggestion = suggestions.get(suggestionId);

      if (!suggestion) {
        return textResult({ success: false, error: "Suggestion not found" });
      }
      if (suggestion.status !== "pending") {
        return textResult({ success: false, error: `Suggestion is already ${suggestion.status}` });
      }

      const client = await getClient();
      const impacts = await client.getImpacts();

      const newImpacts: Impact[] = suggestion.blocks.map((block) => ({
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
      await client.saveImpacts(impacts);

      suggestion.status = "confirmed";
      suggestions.set(suggestionId, suggestion);
      persistSuggestions(suggestions);

      // Trigger UI refresh so timeline re-renders with new impacts
      window.dispatchEvent(new CustomEvent("impactsUpdated"));
      window.dispatchEvent(
        new CustomEvent("webmcp:suggestion-confirmed", { detail: { suggestion, newImpacts } }),
      );

      return textResult({
        success: true,
        suggestionId,
        status: "confirmed",
        savedCount: newImpacts.length,
        impacts: newImpacts.map((i) => ({
          id: i.id,
          activity: i.activity,
          date: new Date(i.date).toISOString(),
          endTime: i.endTime ? new Date(i.endTime).toISOString() : undefined,
        })),
      });
    },
  );

  // --- Cancel a suggestion ---
  widget.registerTool(
    "cancel-suggestion",
    "Cancel a pending suggestion, discarding all its time blocks without saving. Only works on suggestions with status 'pending'.",
    {
      type: "object",
      properties: {
        suggestionId: { type: "string", description: "The suggestion ID to cancel" },
      },
      required: ["suggestionId"],
    },
    async (params: Record<string, unknown>) => {
      const suggestionId = params.suggestionId as string;
      const suggestions = getPendingSuggestions();
      const suggestion = suggestions.get(suggestionId);

      if (!suggestion) {
        return textResult({ success: false, error: "Suggestion not found" });
      }
      if (suggestion.status !== "pending") {
        return textResult({ success: false, error: `Suggestion is already ${suggestion.status}` });
      }

      suggestion.status = "cancelled";
      suggestions.set(suggestionId, suggestion);
      persistSuggestions(suggestions);

      window.dispatchEvent(
        new CustomEvent("webmcp:suggestion-cancelled", { detail: suggestion }),
      );

      return textResult({
        success: true,
        suggestionId,
        status: "cancelled",
        message: "Suggestion cancelled. No time blocks were saved.",
      });
    },
  );

  // --- Update a goal ---
  widget.registerTool(
    "update-goal",
    "Update an existing goal by ID. Only provided fields will be changed. Use this to set deadlines, descriptions, milestones, status, etc.",
    {
      type: "object",
      properties: {
        id: { type: "string", description: "The goal ID to update" },
        name: { type: "string", description: "New goal name" },
        description: { type: "string", description: "New description" },
        targetDate: { type: "number", description: "Deadline as Unix timestamp (ms)" },
        status: { type: "string", enum: ["active", "completed", "archived"], description: "Goal status" },
        color: { type: "string", description: "Color (hex or Tailwind class)" },
      },
      required: ["id"],
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const goals = await client.getGoals();
      const goal = goals.find((g: any) => g.id === params.id);
      if (!goal) {
        return textResult({ success: false, error: "Goal not found" });
      }
      if (params.name !== undefined) goal.name = params.name as string;
      if (params.description !== undefined) goal.description = params.description as string;
      if (params.targetDate !== undefined) goal.targetDate = params.targetDate as number;
      if (params.status !== undefined) goal.status = params.status as "active" | "completed" | "archived";
      if (params.color !== undefined) goal.color = params.color as string;
      await client.saveGoal(goal);
      window.dispatchEvent(new CustomEvent("goalsUpdated"));
      return textResult({ success: true, goal });
    },
  );

  // --- Dismiss a goal from day view urgency ---
  widget.registerTool(
    "dismiss-goal-urgency",
    "Dismiss a goal from the Day View urgency panel for today. The user has indicated this goal is not important right now. This stores the dismissal in sessionStorage so it persists until the browser is closed.",
    {
      type: "object",
      properties: {
        goalId: { type: "string", description: "The goal ID to dismiss from urgency" },
      },
      required: ["goalId"],
    },
    async (params: Record<string, unknown>) => {
      const goalId = params.goalId as string;
      const key = "dayview-dismissed-goals";
      const existing = JSON.parse(sessionStorage.getItem(key) || "[]") as string[];
      if (!existing.includes(goalId)) {
        existing.push(goalId);
        sessionStorage.setItem(key, JSON.stringify(existing));
      }
      window.dispatchEvent(new CustomEvent("dayview:goal-dismissed", { detail: { goalId } }));
      return textResult({ success: true, message: `Goal ${goalId} dismissed from urgency panel` });
    },
  );

  // --- Day View AI Insights ---
  widget.registerTool(
    "set-day-insights",
    "Push AI-generated insights into the Day View page. The insights will appear in the AI Insights panel on the right side of the day view. Use this after analyzing the user's data to provide personalized, actionable insights. The day view listens for a 'dayview:insights' CustomEvent.",
    {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "A 1-3 sentence summary of how the user is doing today, displayed prominently at the top",
        },
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["critical", "warning", "good", "info"],
                description: "Severity/type of the insight",
              },
              text: { type: "string", description: "The insight text — be specific, reference data" },
            },
            required: ["type", "text"],
          },
          description: "Array of data-driven insights",
        },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "What to do — specific and actionable" },
              why: { type: "string", description: "Why this matters — reference data or patterns" },
            },
            required: ["text", "why"],
          },
          description: "Prioritized action suggestions",
        },
      },
      required: ["insights"],
    },
    async (params: Record<string, unknown>) => {
      const insights = params.insights as Array<{ type: string; text: string }>;
      const actions = (params.actions as Array<{ text: string; why: string }>) || [];
      const summary = params.summary as string | undefined;

      window.dispatchEvent(
        new CustomEvent("dayview:insights", {
          detail: { insights, actions, summary },
        }),
      );

      return textResult({
        success: true,
        message: `Pushed ${insights.length} insights and ${actions.length} actions to the Day View`,
      });
    },
  );

  // --- Dismiss event from day view ---
  widget.registerTool(
    "dismiss-day-event",
    "Dismiss an all-day event or activity from the Day View. Use get-timeline-day first to find the event ID.",
    {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The impact/event ID to dismiss from the day view" },
      },
      required: ["eventId"],
    },
    async (params: Record<string, unknown>) => {
      const eventId = params.eventId as string;
      window.dispatchEvent(new CustomEvent("dayview:event-dismissed", { detail: { eventId } }));
      return textResult({ success: true, message: `Event ${eventId} dismissed from day view` });
    },
  );

  // --- Delete an impact ---
  widget.registerTool(
    "delete-impact",
    "Permanently delete an impact/event by ID.",
    {
      type: "object",
      properties: {
        id: { type: "string", description: "The impact ID to delete" },
      },
      required: ["id"],
    },
    async (params: Record<string, unknown>) => {
      const client = await getClient();
      const impacts = await client.getImpacts();
      const idx = impacts.findIndex((i: any) => i.id === params.id);
      if (idx === -1) {
        return textResult({ success: false, error: "Impact not found" });
      }
      const removed = impacts.splice(idx, 1)[0];
      await client.saveImpacts(impacts);
      window.dispatchEvent(new CustomEvent("impactsUpdated"));
      return textResult({ success: true, deleted: removed });
    },
  );

}

export function WebMCPProvider() {
  useEffect(() => {
    function registerNativeTools() {
      if (!getNativeModelContext()?.registerTool) return false;

      // HMR/remount-safe: aborting unregisters tools registered by the previous instance.
      window.__leptum_webmcp_abort_controller?.abort();
      const controller = new AbortController();
      window.__leptum_webmcp_abort_controller = controller;

      registerTools(createNativeWebMCPAdapter(controller.signal));
      console.info("[WebMCP] Registered Leptum tools via navigator.modelContext/document.modelContext");
      return true;
    }

    if (registerNativeTools()) {
      return () => {
        window.__leptum_webmcp_abort_controller?.abort();
        if (window.__leptum_webmcp_abort_controller?.signal.aborted) {
          delete window.__leptum_webmcp_abort_controller;
        }
      };
    }

    // Chrome's native WebMCP API is exposed only in Chrome 149+ with
    // WebMCPTesting and DevToolsWebMCPSupport enabled. Poll briefly because the
    // experimental API may appear after hydration in instrumented browsers.
    const interval = setInterval(() => {
      if (registerNativeTools()) clearInterval(interval);
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!getNativeModelContext()?.registerTool) {
        console.info("[WebMCP] navigator.modelContext/document.modelContext is unavailable; start Chrome 149+ with WebMCP flags to expose Leptum tools.");
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.__leptum_webmcp_abort_controller?.abort();
      if (window.__leptum_webmcp_abort_controller?.signal.aborted) {
        delete window.__leptum_webmcp_abort_controller;
      }
    };
  }, []);
  return null;
}
