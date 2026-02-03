import { GoalTrackingConfig } from './useGoals';
import { Routine } from '../components/Job/api';

export interface GoalTemplateWithTracking {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  category: string;
  
  // Built-in routine configuration (single routine)
  routineConfig?: {
    name: string;
    cron: string; // CRON expression
    tasks: string[];
  };
  
  // Multiple routine configurations (for templates that need multiple routines)
  routineConfigs?: Array<{
    name: string;
    cron: string; // CRON expression
    tasks: string[];
    mealType?: string; // For nutrition: 'Breakfast', 'Lunch', 'Dinner', 'Snack'
  }>;
  
  // Visual tracking configuration
  trackingConfig: GoalTrackingConfig;
  
  // Milestones (optional)
  milestones?: Array<{
    name: string;
    order: number;
    daysOffset?: number;
  }>;
}

export const GOAL_TEMPLATES_WITH_TRACKING: GoalTemplateWithTracking[] = [
  {
    id: 'stay-hydrated',
    name: 'Stay Hydrated',
    description: 'Track your daily water intake with reminders',
    color: 'bg-blue-500',
    icon: '💧',
    category: 'Health',
    
    routineConfig: {
      name: 'Hydration Reminders',
      cron: '0 8-22/2 * * *', // Every 2 hours from 8am to 10pm
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
  },
  {
    id: 'track-nutrition',
    name: 'Track Nutrition',
    description: 'Track your daily meals: breakfast, lunch, dinner, and snack',
    color: 'bg-green-500',
    icon: '🍽️',
    category: 'Health',
    
    // Create separate routines for each meal type
    routineConfigs: [
      {
        name: 'Breakfast Reminder',
        cron: '0 8 * * *', // 8am
        tasks: ['Log breakfast'],
        mealType: 'Breakfast'
      },
      {
        name: 'Lunch Reminder',
        cron: '0 12 * * *', // 12pm
        tasks: ['Log lunch'],
        mealType: 'Lunch'
      },
      {
        name: 'Snack Reminder',
        cron: '0 15 * * *', // 3pm
        tasks: ['Log snack'],
        mealType: 'Snack'
      },
      {
        name: 'Dinner Reminder',
        cron: '0 18 * * *', // 6pm
        tasks: ['Log dinner'],
        mealType: 'Dinner'
      }
    ],
    
    trackingConfig: {
      type: 'checklist',
      unit: 'meals',
      icon: '🍽️',
      dailyTarget: 4, // 3 meals + 1 snack
      options: ['Breakfast', 'Lunch', 'Dinner', 'Snack']
    },
    
    milestones: [
      { name: 'Track meals for 7 days', order: 1, daysOffset: 7 },
      { name: 'Maintain nutrition tracking for 30 days', order: 2, daysOffset: 30 }
    ]
  }
];

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): GoalTemplateWithTracking | undefined {
  return GOAL_TEMPLATES_WITH_TRACKING.find(t => t.id === templateId);
}

/**
 * Check if a goal name suggests it's a hydration goal
 */
export function isHydrationGoal(goalName: string): boolean {
  const hydrationKeywords = ['water', 'hydration', 'hydrate', 'drink', 'h2o', 'liquid'];
  const lowerName = goalName.toLowerCase();
  return hydrationKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Check if a goal name suggests it's a nutrition goal
 */
export function isNutritionGoal(goalName: string): boolean {
  const nutritionKeywords = ['nutrition', 'meal', 'food', 'eating', 'diet', 'breakfast', 'lunch', 'dinner', 'snack'];
  const lowerName = goalName.toLowerCase();
  return nutritionKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Create a routine from template routine config
 */
export function createRoutineFromTemplate(
  template: GoalTemplateWithTracking,
  goalId: string,
  index: number = 0
): Routine | null {
  if (!template.routineConfig) return null;
  
  return {
    id: `routine-${Date.now()}-${index}`,
    name: template.routineConfig.name,
    cron: template.routineConfig.cron,
    status: 'pending',
    index,
    goalIds: [goalId],
    tasks: template.routineConfig.tasks.map((taskName, taskIndex) => ({
      id: `task-${Date.now()}-${taskIndex}`,
      name: taskName,
      routineId: `routine-${Date.now()}-${index}`,
      index: taskIndex,
      status: 'pending'
    }))
  };
}

/**
 * Create multiple routines from template routine configs (for nutrition)
 */
export function createRoutinesFromTemplate(
  template: GoalTemplateWithTracking,
  goalId: string,
  startIndex: number = 0
): Routine[] {
  if (!template.routineConfigs || template.routineConfigs.length === 0) {
    // Fallback to single routine config if routineConfigs not available
    const singleRoutine = createRoutineFromTemplate(template, goalId, startIndex);
    return singleRoutine ? [singleRoutine] : [];
  }
  
  return template.routineConfigs.map((config, idx) => ({
    id: `routine-${Date.now()}-${startIndex + idx}`,
    name: config.name,
    cron: config.cron,
    status: 'pending' as const,
    index: startIndex + idx,
    goalIds: [goalId],
    tasks: config.tasks.map((taskName, taskIndex) => ({
      id: `task-${Date.now()}-${idx}-${taskIndex}`,
      name: taskName,
      routineId: `routine-${Date.now()}-${startIndex + idx}`,
      index: taskIndex,
      status: 'pending' as const
    }))
  }));
}
