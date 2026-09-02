// This file used to also hold the legacy Job feature's types (DbJob, Habit,
// DraftHabit) — removed along with that feature. Kept at this path (rather
// than moved) since Routine/RoutineTask/LocationTrigger are imported from
// here by ~13 other files across the app.
export type LocationTrigger = {
  lat: number;
  lon: number;
  radius: number; // meters
  cooldownHours: number; // minimum hours between triggers
  label?: string; // human-readable name like "Office", "Gym"
};

// Unified Routine type (combines Jobs and Stacks)
export type Routine = {
  id: string;
  name: string;
  rrule?: string; // Optional RFC 5545 RRULE - if provided, routine is scheduled
  cron?: string; // Derived from rrule for scheduler compatibility; legacy routines may only have cron
  status?: string;
  lastEndTime?: number;
  index: number;
  description?: string; // Optional rich text description
  goalIds?: string[]; // Optional - array of goal IDs this routine supports (many-to-many)
  goalId?: string; // DEPRECATED: Use goalIds instead. Kept for backward compatibility during migration
  isShowUpRoutine?: boolean; // Special flag for "Show Up" routine
  locationTrigger?: LocationTrigger; // Optional - trigger when near a location
  tasks: RoutineTask[];
};

export type RoutineTask = {
  id: string;
  name: string;
  routineId: string;
  index: number;
  status: string;
  description?: string;
  completedAt?: number;
  effort?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  numericEstimate?: number;
};

