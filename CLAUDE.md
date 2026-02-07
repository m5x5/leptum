# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Leptum is a Next.js personal productivity tracker with **local-first, user-owned data storage** using RemoteStorage.js. Users control where their data lives (5apps, Dropbox, Google Drive, or self-hosted), and the app works fully offline with automatic sync.

**No backend required** - all data operations happen client-side through RemoteStorage.

## Build & Development Commands

```bash
# Development server
npm run dev        # Starts Next.js dev server at http://localhost:3000

# Production build
npm run build      # Creates production build
npm start          # Runs production server

# Type checking
npx tsc --noEmit   # Run TypeScript compiler without emitting files
```

## Architecture

### Data Layer: RemoteStorage Client (`lib/remoteStorage.ts`)

The core data persistence layer. All data operations go through this singleton client:

- **Schema-based storage**: Defines JSON schemas for all data types (Jobs, Goals, GoalTypes, Impacts, Stacks, ActivityWatch)
- **Client-side only**: Initializes on browser load, handles sync/offline states
- **Path structure**: Data stored at `/leptum/{type}/{id}` or `/leptum/{type}` for collections
- **Key methods**:
  - `getJobs()`, `saveJob()`, `deleteJob()` - Habit/task management
  - `getGoals()`, `saveGoal()`, `deleteGoal()` - Goal tracking
  - `getImpacts()`, `saveImpacts()` - Timeline activity logs (stored as single collection)
  - `getActivityWatchData()`, `saveActivityWatchData()` - ActivityWatch integration
  - `getStacks()`, `saveStack()`, `deleteStack()` - Workflow management

**Important**: RemoteStorage requires dynamic imports to avoid SSR issues. The client is only initialized in browser context.

### Custom Hooks Pattern (`utils/*.ts`)

Data operations use React hooks that wrap RemoteStorage client:

- `useGoals()` - Goal CRUD operations
- `useGoalTypes()` - Goal type/category management
- `useActivityWatch()` - ActivityWatch data import/filtering
- `useRoutineScheduler()` - CRON-based task scheduling
- `useRoutineCompletions()` - Track habit completion states
- `useStandaloneTasks()` - One-off task management
- `useWeeklyGoals()` - Weekly goal tracking

**Pattern**: Hooks handle loading state, provide CRUD methods, and maintain local React state synced with RemoteStorage.

### Pages Structure

- `index.tsx` - Home dashboard with routines, quick tasks, stacks
- `timeline.tsx` - Activity impact logging with ActivityWatch integration (see below)
- `goals.tsx` - Goal and goal type management
- `routines.tsx` - Habit/routine scheduling with CRON expressions
- `chat.tsx` - AI chat interface (Ollama integration)

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

### Styling

- **Tailwind CSS** with custom theme configuration
- **Dark mode support** via `next-themes`
- **UI library**: Headless UI (@headlessui/react) for modals, Radix UI for sliders
- **Icons**: Heroicons

### Third-Party Integrations

**Todonna Protocol**: Syncs tasks with other RemoteStorage apps using todonna specification (`/todonna/` path). Automatic bidirectional sync on task create/update/delete.

**Ollama (AI)**: Local LLM integration for chat interface (`utils/ollama.ts`). Expects Ollama running locally.

## Key Technical Considerations

### SSR vs Client-Side

- RemoteStorage only works client-side (browser context)
- Always check `typeof window !== 'undefined'` before RemoteStorage operations
- Use `useEffect` for data loading, not page-level `getServerSideProps`

### Data Persistence

- **No database** - Everything stored in user's RemoteStorage
- **Collection vs Individual**:
  - Impacts stored as single collection file (`/leptum/impacts`)
  - Jobs, Goals, Stacks stored as individual files (`/leptum/jobs/{id}`)
- **Sync conflicts**: RemoteStorage handles automatically

### CRON Scheduling

- Routines use CRON expressions for scheduling (via `cron-parser` and `cronstrue`)
- `useRoutineScheduler()` handles execution timing with worker timers
- Tasks can be one-time or recurring

### Type Safety

- TypeScript strict mode enabled
- ActivityWatch types in `activity-watch.d.ts` (root level)
- RemoteStorage schemas define data structure contracts

## Common Pitfalls

1. **AFK bucket filtering**: Always use `bucketType === 'afkstatus'` (not `'afk'`)
2. **Time alignment**: Use 2px per minute scale for vertical positioning in timeline
3. **RemoteStorage init**: Must happen in browser, not SSR context
4. **Impact saving**: Save entire impacts array as collection, not individual items
5. **Time blocks**: Exclude afkstatus events from chunking logic to avoid them appearing as dominant activities
