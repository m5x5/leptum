# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Overview

Leptum is a Next.js personal productivity tracker with user-owned data storage in Solid pods. Users control where their data lives, and the app reads/writes directly from the browser through Solid-OIDC + LDP.

**No app backend required** - all data operations happen client-side against the user's Solid pod.

## Build & Development Commands

```bash
# Development server
npm run dev        # Starts Next.js dev server at http://localhost:3000

# Production build
npm run build      # Creates production build
npm start          # Runs production server

# Linting
npm run lint       # ESLint (next/core-web-vitals)

# Type checking
npx tsc --noEmit   # Run TypeScript compiler without emitting files

# Tests (Playwright — e2e only, no unit test framework)
npx playwright test                          # Run all *.verification.spec.ts files
npx playwright test task-effort-estimation   # Run a single spec
```

## Architecture

### Data Layer: Solid Storage (`lib/remoteStorage.ts` facade + `lib/solidRdf/`)

The core data persistence layer is Solid-backed. Most app code still imports `remoteStorageClient` from `lib/remoteStorage.ts` as a compatibility facade, but the implementation routes to Solid backends in `lib/solidRdf/`.

- **Solid auth**: `lib/solidAuth.ts` handles Solid-OIDC login/session state.
- **RDF storage**: `lib/solidRdf/transform.ts` writes Turtle RDF resources; `shapes/*.shex` + generated `lib/solidRdf/_ldo/` types back typed LDO readers.
- **Binary resources**: photos and QuickNote audio are stored as real pod binary resources, referenced from RDF metadata by IRI.
- **Client-side only**: Solid calls must happen in browser context.
- **Key methods**:
  - `getGoals()`, `saveGoal()`, `deleteGoal()` - Goal tracking
  - `getHomeTasks()`, `addStandaloneTask()`, `updateStandaloneTask()`, `deleteStandaloneTask()` - Task management
  - `getImpacts()`, `saveImpacts()` - Timeline activity logs
  - `getRoutines()`, `saveRoutine()`, `deleteRoutine()` - Routine scheduling
  - `getActivityWatchData()`, `saveActivityWatchData()` - ActivityWatch integration

**Important**: keep new storage work in Solid/RDF backends. Do not reintroduce RemoteStorage.js, Todonna, Stacks, Jobs, or WeeklyGoals.

### Custom Hooks Pattern (`utils/*.ts`)

Data operations use React hooks that wrap the storage facade:

- `useGoals()` - Goal CRUD operations
- `useGoalTypes()` - Goal type/category management
- `useActivityWatch()` - ActivityWatch data import/filtering
- `useRoutineScheduler()` - CRON-based task scheduling
- `useRoutineCompletions()` - Track habit completion states
- `useStandaloneTasks()` - One-off task management

**Pattern**: Hooks handle loading state, provide CRUD methods, and maintain local React state synced with Solid. There is no Solid push listener here; hooks use polling plus local `CustomEvent`s after writes.

### Pages Structure (App Router)

- `app/page.tsx` - Home dashboard with routines and quick tasks
- `app/timeline/` - Activity impact logging with ActivityWatch integration (see below)
- `app/goals/` - Goal and goal type management
- `app/routines/` - Habit/routine scheduling with CRON expressions
- `app/day/[date]/` - ADHD-friendly daily command center (see Day View below)
- `app/impact/` - Impact/activity logging
- `app/settings/` - User settings
- `app/insights/` - Behavioral insights
- `app/health/` - Health tracking

### ActivityWatch Integration

The timeline page supports importing ActivityWatch bucket JSON files to provide context for manual activity logging:

**Key Components**:
- `utils/activityWatch.ts` - Processing logic (parsing, filtering, color assignment, display name extraction)
- `utils/timeBlocks.ts` - Chunks events into 15-minute time blocks with dominant activity
- `utils/useActivityWatch.ts` - React hook for AW data management
- `components/Timeline/TimelineEntry.tsx` - Components for rendering AW time blocks
- `components/Modal/ImportActivityWatchModal.tsx` - Import UI

**Visual Design**:
- Side-by-side layout: Manual activities (left) | ActivityWatch blocks (right)
- Time-aligned vertically (2px per minute scale)
- AFK status shown as vertical green/gray presence bar
- 15-minute time blocks showing dominant activity
- Expandable details that don't overlay manual activities column
- Quick action: "+ Create Manual Entry" to convert AW events to manual logs

**Filtering**:
- Last 7 days only (performance)
- Events <60 seconds filtered out by default
- AFK events (`bucketType === 'afkstatus'`) excluded from time blocks, shown only in presence bar

**Bucket Types**:
- `window` - Application usage (displays app name or window title)
- `editor` - Code editor activity (displays editor + file/project)
- `browser`/`web` - Browser activity (displays page title or hostname)
- `afkstatus` - Away from keyboard status (Active vs Away)

**Important**: The bucket type is `'afkstatus'` (one word), not `'afk'`. Always filter on `bucketType === 'afkstatus'` or `bucketType !== 'afkstatus'`.

### Component Organization

- `components/Timeline/` - Timeline-specific components (ActivityForm, TimelineEntry, FilterControls)
- `components/Modal/` - Reusable modal components
- `components/` - Shared UI components (forms, widgets)

### Day View (`/day/[date]`)

ADHD-friendly daily command center showing goals, routines, tasks, activities, mood, and AI-driven insights for a single day.

**Route**: `/app/day/[date]/page.tsx` (server component extracts `date` param) + `DayViewContent.tsx` (client component with all logic).

**Data sources**: Impacts (timed activities + all-day events), Goals, GoalTypes, Routines, RoutineCompletions, StandaloneTasks — all loaded from Solid in parallel on mount.

**Key components**:
- **Live clock + deadline countdown** (today only): Shows nearest goal deadline as live countdown with urgency coloring (<2h red, <5h orange, <24h yellow). Fights time blindness.
- **Step-by-step progress system**: AI insights pushed via `set-day-insights` CustomEvent become interactive steps. User clicks through one at a time. Completion tracked in localStorage (`dayview-steps-{date}`, array of completed step indices). Progress bar shows current/completed/next steps with celebration animation on completion.
- **Urgency detection**: Scans active goals for missing deadlines, overdue/approaching milestones, missing structure. Sorted by severity (critical > warning > info). Timed dismissals: today, 1 week, 1 month, permanent. Undo via collapsible section.
- **Dimension scores** (3 stat panels):
  - **Output** (0-10): Tracked minutes (0-4) + routine completion % (0-3) + tasks completed (0-3)
  - **Mood** (0-10): Average of energy, fulfillment, (10-stress), focus, happiness. Returns -1 if no mood data.
  - **Habits** (0-10): `(routinesDone / totalRoutines) * 10`. Returns -1 if no routines scheduled.
- **Weekly momentum chart**: Bar chart (Mon-Sun) showing routine completions + tracked time per day. Clickable to navigate.
- **Pattern detection** (7-day lookback): Tracked time averages, routine consistency (days/7), goals without deadlines.
- **Auto-generated action suggestions**: Uncompleted routines, approaching deadline goals (≤3 days), pending task counts, untracked time. Replaced by AI actions when WebMCP pushes `set-day-insights`.
- **Two-column responsive layout**: Left (2/3) = activities, weekly momentum, patterns. Right (1/3) = step progress, actions, routines, tasks, goals.

**15 computed statistics** (analytics panels):
1. **Daily streak**: Consecutive days with ≥1 routine completion (0 if incomplete today, starts from yesterday)
2. **Most productive hour**: 30-day lookback, hour with highest total tracked minutes
3. **Weekly comparison**: This week vs last week (tracked minutes, routine completions, tasks completed)
4. **Time by goal**: Breakdown of tracked minutes per goal (today + this week), sorted by week total
5. **Mood trend**: 7-day average mood per day (energy, fulfillment, happiness, inverted stress, focus)
6. **Routine consistency**: 30-day % of routine-day pairs completed vs total possible (routine count × 30)
7. **Average day stats**: 30-day averages (minutes tracked, routines completed, tasks completed per day)
8. **Untracked time** (today only): Minutes between 7am-11pm not in any activity
9. **Personal records**: Max tracked minutes (all-time), max tasks (all-time), longest streak (all-time), current streak, flags for today's records
10. **Goal time investment**: All-time hours spent per active goal, sorted by total
11. **Focus quality**: % of time spent in deep work vs shallow activities (heuristic-based)
12. **Completion velocity**: Days to complete last 5 tasks, trend analysis
13. **Energy distribution**: Peak energy times vs logged energy scores
14. **Goal progress rate**: Milestone completion % and days remaining until deadline per goal
15. **Comeback potential**: Score based on streak history, recent momentum, uncompleted easy wins

**Goal dismissal system**: Stored in localStorage key `dayview-dismissed-goals` as `Array<{ goalId: string; until: number | null }>`. `until: null` = permanent. Expired dismissals auto-cleaned on load.

**CustomEvent integration**:
- `dayview:insights` — Pushes `{ insights, actions, summary }` to create interactive steps and action list
- `dayview:event-dismissed` — Removes all-day event by `eventId`
- `dayview:goal-dismissed` — Dismisses goal from urgency panel by `goalId`

**Keyboard navigation**: Left/Right arrows navigate days, Escape closes dismiss menus.

### WebMCP Integration (`components/WebMCPProvider.tsx`)

WebMCP exposes Solid-backed Leptum data and Day View controls as MCP tools accessible to AI agents running in the browser. The provider initializes a `WebMCPWidget` instance and registers all tools on mount.

**Timeline tools**:
- `get-impacts` — Get all impacts, optionally filtered by `date` (YYYY-MM-DD)
- `log-impact` — Create a new impact entry. Params: `activity` (required), `date`, `stress`, `fulfillment`, `motivation`, `energy`, `focus`, `notes`
- `update-impact` — Update an existing impact by `id` (required). Optional: `activity`, `goalId`, `notes`. Dispatches `impactsUpdated` event.
- `delete-impact` — Permanently delete an impact by `id`. Dispatches `impactsUpdated` event.
- `get-timeline-day` — Detailed timeline for a date with computed durations, gaps (>5min untracked), all-day activities, and available goals. Defaults to today. Returns `totalTrackedMinutes`, `gaps`, `activities` with start/end times, and `availableGoals` for linking.

**Task tools**:
- `get-tasks` — Get all standalone tasks
- `create-task` — Create a task with `name` (required), optional `description` and `effort` (XS/S/M/L/XL)

**Routine tools**:
- `get-routines` — Get all routines with their tasks
- `complete-routine` — Mark a routine completed by `routineId`. Creates a completion record.

**Goal tools**:
- `get-goals` — Get all goals
- `create-goal` — Create a goal with `name` (required), optional `color`, `type`, `description`
- `update-goal` — Update a goal by `id`. Optional: `name`, `description`, `targetDate` (Unix ms), `status` (active/completed/archived), `color`. Dispatches `goalsUpdated` event.

**Day View tools**:
- `set-day-insights` — Push AI insights into the Day View. Params: `insights` (required, array of `{ type: "critical"|"warning"|"good"|"info", text }`), optional `actions` (array of `{ text, why }`), optional `summary`. Dispatches `dayview:insights` CustomEvent.
- `dismiss-day-event` — Dismiss an all-day event by `eventId`. Dispatches `dayview:event-dismissed` CustomEvent.
- `dismiss-goal-urgency` — Dismiss a goal from urgency panel by `goalId`. Stores in sessionStorage. Dispatches `dayview:goal-dismissed` CustomEvent.

**Suggestion tools** (pending review workflow):
- `suggest-time-blocks` — Create a pending suggestion with `blocks` (array of `{ activity, startTime, endTime, notes?, goalId?, stress?, fulfillment?, motivation?, energy?, focus? }`) and `description`. Times can be ISO or HH:MM. Stored in `window.__webmcp_pending_suggestions`. Dispatches `webmcp:suggestion` event. NOT saved until confirmed.
- `get-suggestions` — Get all pending suggestions and their statuses
- `edit-suggestion` — Edit a pending suggestion by `suggestionId` with `updates` array (each: `{ action: "update"|"remove"|"add", blockIndex?, ...fields }`)
- `confirm-suggestion` — Save all blocks from a pending suggestion as real impacts. Dispatches `impactsUpdated` and `webmcp:suggestion-confirmed` events.
- `cancel-suggestion` — Discard a pending suggestion without saving

**ActivityWatch tools**:
- `get-activity-watch-events` — Get AW events for a date with optional `bucketType` filter (window/editor/browser/afkstatus/all) and `minDurationSeconds` (default 60). Returns summary grouped by app/activity and up to 100 events (truncated flag if more).

**Analytics tools**:
- `get-weekly-summary` — Current week's impacts, tasks, and routine completions aggregated
- `get-insights` — Get all stored behavioral insights/patterns
- `create-insight` — Create an insight with `name`, `affectedMetrics` (array of `{ metric, effect: "positive"|"negative" }`), optional `notes` and `category`

**Settings tools**:
- `get-user-settings` — Get user settings (date of birth, etc.)
- `get-entities` — Get all entities (people, projects, contexts)

**Grocery tools**:
- `get-grocery-stores` — Get saved grocery store locations
- `save-grocery-store` — Save a store with `name`, `lat`, `lon` (required), optional `address`, `openingHours`
- `get-grocery-notifications` — Get pending proximity notifications

### AI Agent Usage Guide

Recommended workflow for an AI agent interacting with the Day View via WebMCP:

1. **Assess the day**: Call `get-timeline-day` to see current activities, gaps, tracked time, and available goals. Call `get-goals` and `get-routines` to understand priorities and deadlines.
2. **Check context**: Optionally call `get-activity-watch-events` to see what the user actually did on their computer, and `get-weekly-summary` for momentum context.
3. **Push insights**: Use `set-day-insights` to push a personalized plan. The `insights` array becomes interactive steps the user clicks through. Include a `summary` for the banner and `actions` for prioritized recommendations.
4. **Fill gaps**: Use `suggest-time-blocks` to propose activities for untracked time periods. Link blocks to goals via `goalId` from the `availableGoals` returned by `get-timeline-day`. The user must confirm before blocks are saved.
5. **Clean up**: Use `dismiss-day-event` to remove irrelevant all-day events. Use `dismiss-goal-urgency` to help the user focus by hiding non-critical goals from the urgency panel.
6. **Monitor and iterate**: Check `get-suggestions` for user responses. Push updated insights via `set-day-insights` as the day progresses and new data comes in.

**Key principle**: The Day View is designed for AI-human collaboration. The AI provides structure and awareness, the human clicks through steps and confirms suggestions. Never auto-save time blocks — always use the suggestion workflow so the user stays in control.

### Styling

- **Tailwind CSS v4** via `@tailwindcss/postcss` with custom theme configuration
- **Dark mode support** via `next-themes`
- **UI library**: Headless UI (@headlessui/react) for modals, Radix UI for sliders
- **Icons**: Heroicons

### Third-Party Integrations

**Ollama (AI)**: Local LLM integration for chat interface (`utils/ollama.ts`). Expects Ollama running locally.

## Key Technical Considerations

### SSR vs Client-Side

- Solid auth and pod reads only work client-side (browser context)
- Always check `typeof window !== 'undefined'` before browser-only storage operations
- Use `useEffect` for data loading, not page-level `getServerSideProps`

### Data Persistence

- **No database** - Everything stored in the user's Solid pod
- **RDF resources**: most records are one Turtle resource per item; photos/audio have RDF metadata plus a separate binary resource.
- **Interop**: readers use LDO/ShEx over real RDF datasets so Turtle and JSON-LD resources from other Solid apps can be parsed.

### CRON Scheduling

- Routines use CRON expressions for scheduling (via `cron-parser` and `cronstrue`)
- `useRoutineScheduler()` handles execution timing with worker timers
- Tasks can be one-time or recurring

### Type Safety

- TypeScript strict mode enabled
- ActivityWatch types in `activity-watch.d.ts` (root level)
- ShEx shapes define Solid/RDF data contracts

## Common Pitfalls

1. **AFK bucket filtering**: Always use `bucketType === 'afkstatus'` (not `'afk'`)
2. **Time alignment**: Use 2px per minute scale for vertical positioning in timeline
3. **Solid init**: Must happen in browser, not SSR context
4. **Impact saving**: Save entire impacts array as collection, not individual items
5. **Time blocks**: Exclude afkstatus events from chunking logic to avoid them appearing as dominant activities
