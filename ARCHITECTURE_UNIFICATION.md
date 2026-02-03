# Routines & Goals Unification Architecture Plan

## Executive Summary

Routines are action patterns done **for** goals - they're not separate entities, but rather the "how" to achieve a goal's "what". This document outlines a plan to restructure routines as nested entities within goals, creating a clearer hierarchy: **Goal → Routines → Tasks**.

## Current State Analysis

### Routines (`/leptum/routines/{id}`)
**Purpose**: Repeated action patterns (habits, workflows)
- **Structure**:
  - `id`, `name`, `index`
  - `cron` (optional) - CRON expression for scheduling
  - `status` - pending/active/completed
  - `lastEndTime` - last completion time
  - `goalId` (optional) - link to a goal
  - `tasks[]` - array of RoutineTask objects
- **Features**:
  - Can be scheduled (CRON) or unscheduled
  - Automatically creates standalone tasks when scheduled
  - Tracks completions via `RoutineCompletions` collection
  - Shows heatmaps and streaks
  - Can be started manually from home page
- **Storage**: Individual files per routine
- **Hooks**: `useRoutineScheduler()`, `useRoutineCompletions()`

### Goals (`/leptum/goals/{id}`)
**Purpose**: Desired outcomes with milestones
- **Structure**:
  - `id`, `name`, `type` (goalTypeId)
  - `color`, `description`
  - `targetDate`, `createdAt`, `completedAt`
  - `status` - active/completed/archived
  - `milestones[]` - array of GoalMilestone objects
- **Features**:
  - Organized by GoalTypes (categories)
  - Tracks progress via milestones
  - Can be linked to impacts (activities), tasks, routines
  - Time tracking via impacts with `goalId`
  - Weekly goals integration
- **Storage**: Individual files per goal
- **Hooks**: `useGoals()`, `useGoalTypes()`, `useWeeklyGoals()`

### Key Differences
1. **Scheduling**: Routines can have CRON schedules, Goals cannot
2. **Tasks**: Routines contain tasks, Goals don't directly contain tasks
3. **Completion**: Routines track completions separately, Goals track via status/milestones
4. **Time Tracking**: Goals track time via impacts, Routines track via completions
5. **Structure**: Routines are action-oriented, Goals are outcome-oriented

### Key Similarities
1. Both have names, descriptions, status
2. Both can be completed/archived
3. Both can be associated (routines → goals via `goalId`)
4. Both appear in similar UI contexts
5. Both represent things users want to accomplish

## Conceptual Relationship

The fundamental insight: **Not all goals are achieved through routines. Different goals need different approaches.**

### Goal Achievement Patterns

1. **Routine-Based Goals** (achieved through repeated actions):
   - "Build Daily Meditation Practice" → needs a meditation routine
   - "Read 24 Books This Year" → could use a daily reading routine
   - "Exercise Regularly" → needs an exercise routine

2. **Milestone-Based Goals** (achieved through completing checkpoints):
   - "Run a 5K" → milestones: run 1 mile, run 2 miles, complete race
   - "Launch a Side Project" → milestones: MVP, beta test, launch
   - "Save $5,000" → milestones: $500, $1,500, $2,500, etc.

3. **Time-Based Goals** (achieved through time investment):
   - "Learn Spanish" → track time spent studying (via impacts)
   - "Master Guitar" → track practice hours

4. **Hybrid Goals** (combination of approaches):
   - "Learn a Language" → could have routines (daily practice) AND milestones (proficiency tests) AND time tracking
   - "Write a Novel" → could have routines (daily writing) AND milestones (word count targets)

### Key Realizations

- **Routines are OPTIONAL for goals** - not all goals need routines
- **Milestones are OPTIONAL for goals** - not all goals need milestones  
- **Time tracking is OPTIONAL** - some goals don't track time
- **Many-to-many relationship**: When routines exist, they can support multiple goals
  - One goal can have MANY routines (multiple "hows")
  - One routine can support MULTIPLE goals (one action helps multiple outcomes)

**Current Problem**: 
- Routines and Goals are separate with optional single `goalId` link
- Assumption that all goals need routines (not true)
- No clear way to see which goals use routines vs milestones vs time tracking

**Better Structure**: 
- Goals can have **routines** (optional, many-to-many)
- Goals can have **milestones** (optional, already exists)
- Goals can have **time tracking** (via impacts with goalId, already exists)
- These are **independent** - a goal can have any combination

## Proposed Flexible Goal Model

### Goal Schema (supports multiple achievement patterns)

```typescript
interface Goal {
  // Core identity
  id: string;
  name: string;
  type: string; // goalTypeId (category)
  color?: string;
  description?: string;
  
  // Status & lifecycle
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
  completedAt?: number;
  targetDate?: number; // Deadline
  
  // Achievement patterns (all optional, independent):
  
  // 1. Milestones (for project/checkpoint-based goals)
  milestones?: GoalMilestone[]; // Optional - track progress via checkpoints
  
  // 2. Routines (for habit-based goals)
  // Note: Routines are NOT nested here - they're separate entities
  // Use helper functions to get routines for this goal (via goalIds[])
  
  // 3. Time tracking (for time-investment goals)
  // Tracked via impacts with goalId - already exists, no schema change needed
  
  // Metadata
  index: number; // For ordering
}

interface Routine {
  id: string;
  name: string;
  goalIds: string[]; // ARRAY - can support multiple goals
  cron?: string; // Optional CRON expression for scheduling
  lastEndTime?: number; // Last completion time
  status: 'active' | 'paused' | 'completed';
  index: number; // For ordering
  
  // Tasks (steps in this routine)
  tasks: RoutineTask[];
}

interface RoutineTask {
  id: string;
  name: string;
  routineId: string; // Belongs to a routine
  index: number;
  status: 'pending' | 'completed';
  description?: string;
  completedAt?: number;
  
  // Note: Tasks inherit goalIds from their parent routine
  // When creating standalone tasks from routine, use routine.goalIds
}
```

### Key Design Decisions

1. **Separate Entities**: Goals and Routines remain separate (not nested)
2. **Many-to-Many**: Routines have `goalIds[]` array (can support multiple goals)
3. **Optional Routines**: Goals don't require routines - some goals use milestones, time tracking, or neither
4. **Flexible Achievement Patterns**:
   - **Routine-based goals**: Use routines (e.g., "Daily Meditation")
   - **Milestone-based goals**: Use milestones (e.g., "Run 5K", "Launch Project")
   - **Time-based goals**: Track time via impacts (e.g., "Learn Spanish" - study hours)
   - **Hybrid goals**: Combine approaches (e.g., "Learn Language" = routines + milestones + time)
5. **Query Helpers**: Helper functions to:
   - Get routines for a goal (if goal uses routines)
   - Get goals for a routine
   - Identify goal type: routine-based, milestone-based, time-based, hybrid
6. **Scheduling**: Only routines can have CRON schedules (not goals directly)
7. **Tasks**: Tasks belong to routines, inherit goalIds from routine

### Migration Strategy

#### Phase 1: Schema Extension (Non-Breaking)
1. Update `RoutineSchema` to use `goalIds[]` array instead of single `goalId`
2. Keep old `goalId` field temporarily for backward compatibility
3. Update `useRoutines()` hook to handle `goalIds[]` array
4. Create migration utility to convert `goalId` → `goalIds[]`

#### Phase 2: Data Migration
1. Create migration script:
   ```typescript
   async function migrateRoutinesIntoGoals() {
     const routines = await remoteStorageClient.getRoutines();
     const goals = await remoteStorageClient.getGoals();
     
     // Group routines by goalId
     const routinesByGoal = new Map<string, any[]>();
     const orphanedRoutines: any[] = [];
     
     for (const routine of routines) {
       if (routine.goalId) {
         if (!routinesByGoal.has(routine.goalId)) {
           routinesByGoal.set(routine.goalId, []);
         }
         routinesByGoal.get(routine.goalId)!.push(routine);
       } else {
         orphanedRoutines.push(routine);
       }
     }
     
     // Add routines to their goals
     for (const goal of goals) {
       const goalRoutines = routinesByGoal.get(goal.id) || [];
       if (goalRoutines.length > 0) {
         goal.routines = goalRoutines.map(r => ({
           id: r.id,
           name: r.name,
           goalId: goal.id,
           cron: r.cron,
           lastEndTime: r.lastEndTime,
           status: r.status || 'active',
           index: r.index,
           tasks: r.tasks || []
         }));
         await remoteStorageClient.saveGoal(goal);
       }
     }
     
   }
   ```
2. Migrate `RoutineCompletions` → keep as-is, but can aggregate by goalIds
3. Update task creation: When routine triggers, create tasks with `goalIds` from routine

#### Phase 3: UI Restructure
1. **Goals Page** (`/goals`):
   - Show goals with expandable routines section
   - Each goal shows routines where `routine.goalIds.includes(goal.id)`
   - Can add existing routine to goal OR create new routine
   - Routines section shows: name, schedule, task count, completion stats
   
2. **Routines Page** (`/routines` - keep separate or merge):
   - Show all routines
   - Each routine shows: name, schedule, supported goals (goalIds), tasks
   - Can edit which goals a routine supports
   - Filter: "Show scheduled routines", "Show routines with goals", etc.
   
3. **Home Page**:
   - "Upcoming Routines" → shows scheduled routines from all goals
   - Can group by goal or show flat list
   - Click routine → navigate to routine detail or goal
   
4. **Routine Scheduler**:
   - Iterate through all routines (not nested in goals)
   - Check routines with CRON schedules
   - Create tasks with `goalIds` from routine (so tasks support multiple goals)

#### Phase 4: Cleanup
1. Remove old `goalId` field from RoutineSchema (keep only `goalIds[]`)
2. Update all code references from `routine.goalId` → `routine.goalIds`
3. Update task creation to use `routine.goalIds` when creating tasks
4. Update UI to show multi-select for goals when creating/editing routines

## Implementation Details

### Updated RemoteStorage Schema

```typescript
const RoutineTaskSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    routineId: { type: 'string' },
    goalId: { type: 'string' },
    index: { type: 'number' },
    status: { type: 'string' },
    description: { type: 'string' },
    completedAt: { type: 'number' }
  },
  required: ['id', 'name', 'routineId', 'goalId', 'index', 'status']
};

const RoutineSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    goalIds: { 
      type: 'array', 
      items: { type: 'string' } 
    }, // ARRAY - can support multiple goals
    cron: { type: ['string', 'null'] },
    lastEndTime: { type: ['number', 'null'] },
    status: { type: 'string' },
    index: { type: 'number' },
    tasks: {
      type: 'array',
      items: RoutineTaskSchema
    }
  },
  required: ['id', 'name', 'goalIds', 'status', 'index', 'tasks']
};

const GoalSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string' }, // goalTypeId
    color: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    status: { type: 'string' },
    createdAt: { type: ['number', 'null'] },
    completedAt: { type: ['number', 'null'] },
    targetDate: { type: ['number', 'null'] },
    
    // Milestones
    milestones: {
      type: ['array', 'null'],
      items: GoalMilestoneSchema
    },
    
    index: { type: 'number' }
  },
  required: ['id', 'name', 'type', 'status', 'index']
};
```

**Storage Strategy**:
- Goals stored as individual files: `/leptum/goals/{id}`
- Routines stored as individual files: `/leptum/routines/{id}`
- Relationship maintained via `goalIds[]` array on routines
- Query helpers: `getRoutinesForGoal(goalId)` filters routines by `goalIds.includes(goalId)`

### Updated Hooks

#### `useGoals()` - Enhanced with Routine Queries
```typescript
export function useGoals() {
  // Existing goal operations
  // ... addGoal, updateGoal, deleteGoal, etc.
  
  // Helper: Get routines that support this goal
  const getRoutinesForGoal = (goalId: string) => {
    // This queries routines, not goals
    // Implementation in useRoutines hook
  };
  
  // Helper: Get all goals that a routine supports
  const getGoalsForRoutine = (routineId: string) => {
    // This queries goals based on routine.goalIds
    // Implementation in useRoutines hook
  };
}
```

#### `useRoutines()` - New/Updated Hook
```typescript
export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const { goals } = useGoals();
  
  // Load routines
  const loadRoutines = async () => {
    const loaded = await remoteStorageClient.getRoutines();
    setRoutines(loaded);
  };
  
  // CRUD operations
  const addRoutine = async (routine: Omit<Routine, 'id'>) => { ... };
  const updateRoutine = async (routineId: string, updates: Partial<Routine>) => { ... };
  const deleteRoutine = async (routineId: string) => { ... };
  
  // Goal relationship operations
  const addGoalToRoutine = async (routineId: string, goalId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (routine && !routine.goalIds.includes(goalId)) {
      routine.goalIds.push(goalId);
      await updateRoutine(routineId, { goalIds: routine.goalIds });
    }
  };
  
  const removeGoalFromRoutine = async (routineId: string, goalId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (routine) {
      routine.goalIds = routine.goalIds.filter(id => id !== goalId);
      await updateRoutine(routineId, { goalIds: routine.goalIds });
    }
  };
  
  // Query helpers
  const getRoutinesForGoal = (goalId: string) => {
    return routines.filter(r => r.goalIds.includes(goalId));
  };
  
  const getGoalsForRoutine = (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return [];
    return goals.filter(g => routine.goalIds.includes(g.id));
  };
  
  const getScheduledRoutines = () => {
    return routines.filter(r => r.cron);
  };
  
  return {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    addGoalToRoutine,
    removeGoalFromRoutine,
    getRoutinesForGoal,
    getGoalsForRoutine,
    getScheduledRoutines
  };
}
```

#### `useRoutineScheduler()` - Updated (works with many-to-many)
```typescript
export function useRoutineScheduler(onTasksCreated?: () => void) {
  const { routines } = useRoutines();
  
  // Get scheduled routines
  const scheduledRoutines = routines.filter(r => r.cron);
  
  // When creating tasks from routine, use routine.goalIds
  // Create tasks with goalIds from the routine
}
```

### Updated Pages

#### `/goals` - Enhanced Goals Page
- **Goal Cards**:
  - Show goal name, type, color, description
  - Expandable to show:
    - **Routines section**: List of routines that support this goal
      - Shows routines where `routine.goalIds.includes(goal.id)`
      - Each routine shows: name, schedule (if CRON), task count, completion stats
      - Can add existing routine to this goal, or create new routine
      - Can remove routine from goal (doesn't delete routine, just removes relationship)
    - **Milestones section**: (existing)
  
- **Routine Detail** (can be viewed from goal or routines page):
  - Routine name and schedule
  - **Supported Goals**: Shows all goals this routine supports (goalIds)
  - Tasks list (editable)
  - Completion history/streaks
  - Heatmap
  
- **Filters**:
  - By GoalType
  - Goals with routines vs without
  - Goals with scheduled routines
  - Status (active/completed/archived)

- **Create/Edit Goal Modal**:
  - Basic goal info (name, type, color, description)
  - **Achievement Pattern Selection**:
    - "How will you achieve this goal?"
    - Options: Routines, Milestones, Time Tracking, or combination
  - Based on selection, show relevant sections:
    - If Routines: Link to routines (many-to-many)
    - If Milestones: Add milestones (existing)
    - If Time Tracking: Explain impacts will track time
  - Optional: Set target date

- **Create/Edit Routine Modal** (separate page or modal):
  - Routine name
  - **Goal Selection**: Multi-select to choose which goals this routine supports
  - Optional: CRON schedule
  - Tasks list (add/remove tasks)

#### `/index` (Home) - Updated
- **"Upcoming Routines"** sidebar:
  - Shows scheduled routines from ALL goals
  - Groups by goal or shows flat list
  - Click routine → navigate to goal detail page, scroll to routine
- **Goal Progress**:
  - Shows time tracked per goal (from impacts with goalId)
  - Can start activities for goals directly

## Benefits of Flexible Goal Model

1. **Realistic Goal Types**: Supports different achievement patterns:
   - Routine-based (habits)
   - Milestone-based (projects)
   - Time-based (learning)
   - Hybrid (combinations)

2. **Many-to-Many Routines**: When routines exist:
   - One routine can support multiple goals
   - One goal can have multiple routines
   - Routines are reusable across goals

3. **No Forced Patterns**: Goals don't require routines - use what fits:
   - "Run 5K" → milestones only (no routine needed)
   - "Daily Meditation" → routine only (no milestones needed)
   - "Learn Spanish" → routines + milestones + time tracking

4. **Better Goal Creation**: Users can choose achievement pattern:
   - "Is this a habit?" → add routines
   - "Is this a project?" → add milestones
   - "Do I track time?" → link to impacts
   - "All of the above?" → use everything

5. **Clearer Progress Tracking**: 
   - Routine-based goals → track routine completions
   - Milestone-based goals → track milestone completion
   - Time-based goals → track time via impacts
   - Hybrid goals → track all of the above

6. **Better Queries**: 
   - "Show me routine-based goals"
   - "Show me milestone-based goals"
   - "Show me goals with routines"
   - "Show me goals without routines"

## Migration Risks & Mitigation

### Risk 1: Data Loss
- **Mitigation**: Create comprehensive backup before migration
- **Mitigation**: Run migration in test environment first
- **Mitigation**: Keep old routines data for rollback period

### Risk 2: Breaking Changes
- **Mitigation**: Phase approach - extend schema first, migrate later
- **Mitigation**: Support both old and new formats during transition
- **Mitigation**: Update all references gradually

### Risk 3: User Confusion
- **Mitigation**: Clear UI labels ("Scheduled Goal" vs "Goal with Tasks")
- **Mitigation**: Migration preserves all existing functionality
- **Mitigation**: Add onboarding/tooltips explaining new unified model

## Implementation Timeline

### Week 1: Schema & Hooks
- [ ] Extend GoalSchema with optional routine fields
- [ ] Update `useGoals()` hook to handle new fields
- [ ] Create `useGoalScheduler()` hook
- [ ] Update RemoteStorage client methods

### Week 2: Migration Scripts
- [ ] Create migration utility to convert routines → goals
- [ ] Create migration for RoutineCompletions
- [ ] Test migration on sample data
- [ ] Create rollback mechanism

### Week 3: UI Updates
- [ ] Update `/goals` page to show unified goals
- [ ] Add filters and views
- [ ] Update create/edit modals
- [ ] Update home page

### Week 4: Cleanup & Testing
- [ ] Remove old routine code
- [ ] Update all references
- [ ] Comprehensive testing
- [ ] User documentation

## Open Questions

1. **Routines without Goals**: What to do with routines that have empty `goalIds[]`?
   - **Recommendation**: Allow them! These are "general" routines that don't support specific goals (e.g., "Morning Routine" that's just habit, not goal-oriented)

2. **Routine Storage**: Should routines be stored separately or nested?
   - **Recommendation**: Separate files (`/leptum/routines/{id}`) because:
     - Routines can support multiple goals (can't nest in one goal)
     - Routines are reusable across goals
     - Queries are simple: filter routines by `goalIds.includes(goalId)`

3. **Completion Tracking**: How to track routine completions when routines are nested?
   - **Recommendation**: Keep `RoutineCompletions` collection, but reference `goalId` + `routineId`. Or track completions as part of goal data.

4. **Routine Scheduler**: How to efficiently check all routines across all goals?
   - **Recommendation**: `getAllRoutines()` helper that flattens routines from all goals. Cache this for performance.

5. **UI Navigation**: How to navigate to a specific routine?
   - **Recommendation**: `/goals/{goalId}#routine-{routineId}` or `/goals/{goalId}?routine={routineId}`

6. **Standalone Routines**: Can routines exist without a goal (for general habits)?
   - **Recommendation**: Yes! Routines with empty `goalIds[]` are "general" routines. They can be scheduled and create tasks, but don't contribute to specific goal progress. Users can optionally add goals later.

7. **Goal Achievement Patterns**: How to help users choose the right pattern?
   - **Recommendation**: 
     - Show examples in goal creation modal
     - "Is this a habit?" → suggest routines
     - "Is this a project?" → suggest milestones
     - "Do you want to track time?" → suggest time tracking
     - Allow multiple patterns (hybrid goals)

8. **Goal Completion**: How to determine if a goal is complete?
   - **Recommendation**: Depends on achievement pattern:
     - Routine-based: User marks complete manually OR track routine completion rate
     - Milestone-based: All milestones completed
     - Time-based: Target time reached OR user marks complete
     - Hybrid: Combination of above (e.g., all milestones + consistent routines)

7. **Weekly Goals**: How do weekly goals relate to nested routines?
   - **Recommendation**: Weekly goals still reference goals via `goalId`. Routines within those goals can contribute to weekly progress.

## Summary: Goal Achievement Patterns

**Key Insight**: Not all goals are achieved the same way. The architecture should support multiple achievement patterns:

| Pattern | Example Goals | How Achieved |
|---------|--------------|--------------|
| **Routine-based** | "Daily Meditation", "Exercise Regularly", "Read Daily" | Repeated actions (routines) |
| **Milestone-based** | "Run 5K", "Launch Project", "Save $5k" | Completing checkpoints (milestones) |
| **Time-based** | "Learn Spanish", "Master Guitar" | Time investment (tracked via impacts) |
| **Hybrid** | "Learn Language", "Write Novel" | Combination of above |

**Architecture Implications**:
- Routines are **optional** for goals (not all goals need them)
- Milestones are **optional** for goals (not all goals need them)
- Time tracking is **optional** (via impacts with goalId)
- When routines exist, they have **many-to-many** relationship with goals
- Goals can use **any combination** of patterns

**Migration Strategy**:
- Convert `routine.goalId` → `routine.goalIds[]` (many-to-many)
- Keep routines and goals as separate entities
- Add helpers to identify goal achievement patterns
- Update UI to show which pattern(s) each goal uses

## Conclusion

This flexible architecture recognizes that goals are achieved differently. Some need routines (habits), some need milestones (projects), some need time tracking (learning), and some need combinations. By making routines optional and supporting many-to-many relationships when they exist, we create a more realistic and flexible system that matches how people actually work toward goals.
