# Goal Templates with Built-in Routines & Visual Tracking

## Concept

Create rich goal templates that include:
1. **Pre-configured routines** with smart CRON schedules
2. **Visual tracking UI** on the goal page
3. **Daily progress tracking** with icons/visual elements

## Example: "Stay Hydrated" Goal

### Template Structure
```typescript
interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  category: string;
  
  // Built-in routine configuration
  routine?: {
    name: string;
    cron: string; // e.g., "0 */2 * * *" (every 2 hours)
    tasks: string[]; // e.g., ["Drink a glass of water"]
  };
  
  // Visual tracking configuration
  tracking?: {
    type: 'counter' | 'checklist' | 'timer' | 'amount';
    unit: string; // e.g., "glasses", "cups", "liters"
    icon: string; // emoji or icon name
    dailyTarget?: number; // e.g., 8 glasses
    maxPerDay?: number; // e.g., 12 glasses
    increments?: number[]; // e.g., [1, 2, 3] for quick add buttons
  };
  
  // Milestones (optional)
  milestones?: Array<{
    name: string;
    order: number;
    daysOffset?: number;
  }>;
}
```

### Visual Tracking UI Ideas

#### 1. **Counter with Icons** (Hydration example)
```
┌─────────────────────────────────────┐
│ 💧 Stay Hydrated                    │
│                                     │
│ Today: 5 / 8 glasses               │
│                                     │
│ [🍶][🍶][🍶][🍶][🍶][ ][ ][ ]  │
│  ↑ Click to add                     │
│                                     │
│ Quick add: [+1] [+2] [+3]          │
│                                     │
│ History: ▁▃▅▇▆▄▂ (last 7 days)    │
└─────────────────────────────────────┘
```

#### 2. **Checklist** (Morning Routine example)
```
┌─────────────────────────────────────┐
│ ☀️ Morning Routine                  │
│                                     │
│ Today's Progress: 3/5              │
│                                     │
│ ☑ Drink water                       │
│ ☑ Exercise                          │
│ ☑ Meditate                          │
│ ☐ Read                              │
│ ☐ Journal                           │
│                                     │
│ [Mark Complete]                     │
└─────────────────────────────────────┘
```

#### 3. **Timer** (Focus Time example)
```
┌─────────────────────────────────────┐
│ 🎯 Deep Work Sessions               │
│                                     │
│ Today: 2h 30m / 4h                 │
│                                     │
│ [▶ Start Session]                   │
│                                     │
│ Recent sessions:                    │
│ • 45m - Writing                     │
│ • 1h 15m - Coding                   │
│ • 30m - Planning                    │
└─────────────────────────────────────┘
```

#### 4. **Amount Tracker** (Exercise example)
```
┌─────────────────────────────────────┐
│ 💪 Daily Exercise                   │
│                                     │
│ Today: 8,500 steps / 10,000        │
│                                     │
│ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]  │
│         85%                          │
│                                     │
│ [Log Activity] [+500] [+1000]      │
└─────────────────────────────────────┘
```

## Template Ideas

### 1. **Stay Hydrated**
- **Routine**: Reminder every 2 hours (8am-10pm)
- **Tracking**: Counter with glass icons
- **Target**: 8 glasses/day
- **Visual**: Clickable glass icons, progress bar

### 2. **Daily Steps**
- **Routine**: Morning reminder to check steps
- **Tracking**: Amount tracker with step counter
- **Target**: 10,000 steps/day
- **Visual**: Progress bar, step icon

### 3. **Morning Routine**
- **Routine**: Daily at 7am
- **Tracking**: Checklist with tasks
- **Tasks**: Water, Exercise, Meditate, Read, Journal
- **Visual**: Checkboxes, completion percentage

### 4. **Evening Reflection**
- **Routine**: Daily at 9pm
- **Tracking**: Checklist/journal
- **Tasks**: Gratitude, Review day, Plan tomorrow
- **Visual**: Text input + checkboxes

### 5. **Reading Goal**
- **Routine**: Daily reading reminder
- **Tracking**: Timer/counter (pages or minutes)
- **Target**: 30 min/day or 20 pages/day
- **Visual**: Book icon, progress bar

### 6. **Meditation**
- **Routine**: Daily at 6am
- **Tracking**: Timer with session log
- **Target**: 10 min/day
- **Visual**: Timer, session history

### 7. **Fruit & Veggies**
- **Routine**: Meal reminders
- **Tracking**: Counter with fruit/veggie icons
- **Target**: 5 servings/day
- **Visual**: Clickable icons (🍎🍌🥕🥦)

### 8. **Water Plants**
- **Routine**: Weekly on specific days
- **Tracking**: Checklist per plant
- **Visual**: Plant icons, last watered dates

### 9. **Gratitude Practice**
- **Routine**: Daily at 8pm
- **Tracking**: Text entries (3 things)
- **Visual**: Text inputs, entry history

### 10. **Screen Time Break**
- **Routine**: Every 2 hours during work
- **Tracking**: Counter (breaks taken)
- **Target**: 5 breaks/day
- **Visual**: Eye icon, break timer

## Implementation Architecture

### Data Structure

```typescript
// Goal with tracking data
interface Goal {
  // ... existing fields
  templateId?: string; // Reference to template
  trackingData?: GoalTrackingData;
}

// Daily tracking data
interface GoalTrackingData {
  dailyEntries: DailyTrackingEntry[];
}

interface DailyTrackingEntry {
  date: string; // YYYY-MM-DD
  value: number; // For counters/amounts
  completed?: boolean; // For checklists
  notes?: string; // Optional notes
  timestamp?: number; // When logged
}

// Template definition
interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  category: string;
  
  // Routine config
  routineConfig?: {
    name: string;
    cron: string;
    tasks: string[];
  };
  
  // Tracking config
  trackingConfig: {
    type: 'counter' | 'checklist' | 'timer' | 'amount';
    unit: string;
    icon: string;
    dailyTarget?: number;
    maxPerDay?: number;
    increments?: number[];
    options?: string[]; // For checklist items
  };
  
  milestones?: Array<{
    name: string;
    order: number;
    daysOffset?: number;
  }>;
}
```

### Components Needed

1. **GoalTemplateSelector** - Choose template when creating goal
2. **GoalTrackingWidget** - Visual tracking UI on goal page
3. **TrackingCounter** - Counter with icons (hydration example)
4. **TrackingChecklist** - Checklist tracker
5. **TrackingTimer** - Timer/session tracker
6. **TrackingAmount** - Amount/progress tracker
7. **TrackingHistory** - Show progress over time (charts)

### Storage Strategy

```typescript
// Store tracking data with goal
interface Goal {
  // ... existing
  trackingData?: {
    entries: DailyTrackingEntry[];
    // Or store separately:
    // trackingDataId: string;
  };
}

// Or store separately for better performance:
// /leptum/goal-tracking/{goalId}
interface GoalTrackingData {
  goalId: string;
  entries: DailyTrackingEntry[];
}
```

## UI Flow

### Creating Goal from Template
1. User clicks "Create Goal"
2. Shows template gallery (with new templates)
3. User selects "Stay Hydrated"
4. Template creates:
   - Goal with name/description
   - Routine with CRON schedule (every 2 hours)
   - Tracking config (counter, 8 glasses target)
5. Goal page shows tracking widget

### Tracking on Goal Page
1. Goal page shows tracking widget at top
2. User clicks glass icon to log +1
3. Or uses quick add buttons (+1, +2, +3)
4. Progress bar updates
5. History chart shows last 7 days

## Smart CRON Suggestions

- **Hydration**: `0 */2 * * *` (every 2 hours, 8am-10pm)
- **Morning Routine**: `0 7 * * *` (daily at 7am)
- **Evening Reflection**: `0 21 * * *` (daily at 9pm)
- **Reading**: `0 20 * * *` (daily at 8pm)
- **Meditation**: `0 6 * * *` (daily at 6am)
- **Screen Breaks**: `0 9-17/2 * * 1-5` (every 2 hours, 9am-5pm, weekdays)

## Visual Design Ideas

### Icons/Emojis
- 💧 Water/Hydration
- 🍎🍌🥕🥦 Fruits/Veggies
- 📚 Books/Reading
- 🧘 Meditation
- 💪 Exercise
- 🌱 Plants
- ☀️ Morning
- 🌙 Evening

### Progress Visualization
- Progress bars
- Icon grids (filled/empty)
- Mini charts (last 7 days)
- Streak counters
- Completion percentages

## Next Steps

1. **Phase 1**: Create template system with routine config
2. **Phase 2**: Build tracking data storage
3. **Phase 3**: Create visual tracking components
4. **Phase 4**: Add template gallery
5. **Phase 5**: Add history/charts
