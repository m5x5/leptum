# Goal Templates Implementation Plan

## Requirements

1. **Backward Compatibility**: Existing hydration tracking (via impacts) must continue working
2. **Template Selection**: Users can select hydration template for existing goals
3. **Data Migration**: Convert existing impact data to new tracking format
4. **Dual Support**: Support both old (impacts) and new (trackingData) formats

## Current State

- Hydration tracked via **impacts** (activities) on timeline
- Each impact has: `activity: string`, `date: number`, `goalId?: string`
- Example: Multiple impacts like "Drink water" or "Glass of water" linked to a hydration goal

## Solution: Hybrid Approach

### 1. Goal Schema Extension

```typescript
interface Goal {
  // ... existing fields
  templateId?: string; // Reference to template (e.g., "stay-hydrated")
  trackingConfig?: {
    type: 'counter' | 'checklist' | 'timer' | 'amount';
    unit: string; // "glasses", "cups", "liters"
    icon: string; // "💧"
    dailyTarget?: number; // 8
    maxPerDay?: number; // 12
    increments?: number[]; // [1, 2, 3]
  };
  trackingData?: {
    entries: DailyTrackingEntry[];
  };
  // Keep impacts working - they're still the source of truth for timeline
}
```

### 2. Migration Strategy

**Option A: Auto-detect hydration goals**
- Check goal name for keywords: "water", "hydration", "hydrate", "drink"
- Check if goal has impacts with water-related activities
- Prompt user: "This looks like a hydration goal. Use hydration template?"

**Option B: Manual selection**
- Add "Use Template" button on goal edit page
- Show template selector
- When selected, migrate impacts → trackingData

**Option C: Hybrid (Recommended)**
- Auto-detect and suggest template
- Allow manual selection anytime
- Migrate impacts on template selection

### 3. Data Migration Function

```typescript
async function migrateImpactsToTracking(goalId: string, templateId: string) {
  // 1. Get all impacts for this goal
  const impacts = await remoteStorageClient.getImpacts();
  const goalImpacts = impacts.filter(i => i.goalId === goalId);
  
  // 2. Group by date
  const dailyEntries: Record<string, number> = {};
  goalImpacts.forEach(impact => {
    const date = new Date(impact.date).toISOString().split('T')[0]; // YYYY-MM-DD
    dailyEntries[date] = (dailyEntries[date] || 0) + 1; // Count impacts per day
  });
  
  // 3. Convert to tracking entries
  const trackingEntries: DailyTrackingEntry[] = Object.entries(dailyEntries).map(([date, count]) => ({
    date,
    value: count,
    timestamp: new Date(date).getTime()
  }));
  
  // 4. Update goal with template and tracking data
  const goal = await remoteStorageClient.getGoal(goalId);
  goal.templateId = templateId;
  goal.trackingConfig = getTemplateConfig(templateId);
  goal.trackingData = { entries: trackingEntries };
  await remoteStorageClient.saveGoal(goal);
  
  // 5. Keep impacts - they're still used for timeline view
  // Optionally mark them as "migrated" but don't delete
}
```

### 4. Tracking Component Logic

```typescript
function GoalTrackingWidget({ goal }: { goal: Goal }) {
  // Check if goal uses template tracking
  if (goal.templateId && goal.trackingConfig) {
    // Use new tracking system
    return <TrackingCounter 
      config={goal.trackingConfig}
      entries={goal.trackingData?.entries || []}
      onAdd={(value) => addTrackingEntry(goal.id, value)}
    />;
  }
  
  // Fallback: Show impacts-based tracking
  const impacts = useImpactsForGoal(goal.id);
  const todayImpacts = impacts.filter(i => isToday(i.date));
  return <LegacyTrackingView impacts={todayImpacts} />;
}
```

### 5. Dual-Write Strategy (Optional)

When user logs via new tracking widget:
- Write to `trackingData` (for template tracking)
- Optionally create impact (for timeline view)
- Or sync on save

## Implementation Steps

### Phase 1: Template System
1. Extend Goal schema with `templateId` and `trackingConfig`
2. Create template definitions (starting with "stay-hydrated")
3. Add template selector to goal creation/edit

### Phase 2: Migration
1. Create migration function (impacts → trackingData)
2. Add "Use Template" button on goal edit page
3. Auto-detect hydration goals and suggest template

### Phase 3: Tracking Component
1. Create `GoalTrackingWidget` component
2. Support both template tracking and legacy impacts
3. Show on goal detail page

### Phase 4: Visual Tracking
1. Create `TrackingCounter` component (glass icons)
2. Quick add buttons (+1, +2, +3)
3. Progress bar and history chart

## Template Definition

```typescript
const HYDRATION_TEMPLATE = {
  id: 'stay-hydrated',
  name: 'Stay Hydrated',
  description: 'Track your daily water intake',
  color: 'bg-blue-500',
  icon: '💧',
  category: 'Health',
  
  routineConfig: {
    name: 'Hydration Reminders',
    cron: '0 8-22/2 * * *', // Every 2 hours, 8am-10pm
    tasks: ['Drink a glass of water']
  },
  
  trackingConfig: {
    type: 'counter',
    unit: 'glasses',
    icon: '💧',
    dailyTarget: 8,
    maxPerDay: 12,
    increments: [1, 2, 3]
  },
  
  milestones: [
    { name: 'Drink 8 glasses for 7 days', order: 1, daysOffset: 7 },
    { name: 'Maintain hydration for 30 days', order: 2, daysOffset: 30 }
  ]
};
```

## UI Flow

### Existing Goal → Template Selection

1. User opens goal edit page
2. Sees "Use Template" button (or auto-suggested)
3. Clicks → Template selector modal
4. Selects "Stay Hydrated"
5. System:
   - Migrates existing impacts → trackingData
   - Creates routine (if not exists)
   - Updates goal with template config
6. Goal page now shows tracking widget

### Tracking on Goal Page

1. Goal page shows tracking widget at top
2. Shows today's count: "5 / 8 glasses"
3. Visual: 8 glass icons (5 filled, 3 empty)
4. Click glass → +1
5. Quick buttons: [+1] [+2] [+3]
6. History chart below

## Backward Compatibility

- **Old goals without template**: Continue using impacts, show legacy view
- **Goals with template**: Use trackingData, but impacts still work
- **Migration is optional**: Users can keep using impacts if they prefer
- **Dual support**: System reads from both sources
