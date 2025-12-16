type Job = {
  status: string;
  cron: string;
  lastEndTime?: number;
  name?: string;
};

export type DbJob = {
  id: string;
  cron: string;
  status: string;
  index: number;
  name: string;
  lastEndTime: number;
  habits: Habit[];
};

export type Habit = {
  id: string;
  name: string;
  jobId: string;
  job?: DbJob;
  index: number;
  status: string;
  description?: string;
  completedAt?: number;
};

export type DraftHabit = {
  name: string;
  jobId: string;
  status?: string;
  description?: string;
  completedAt?: number;
};

// Unified Routine type (combines Jobs and Stacks)
export type Routine = {
  id: string;
  name: string;
  cron?: string; // Optional - if provided, routine is scheduled
  status?: string;
  lastEndTime?: number;
  index: number;
  goalId?: string; // Optional - associated goal for this routine
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
};

export type DraftRoutineTask = {
  name: string;
  routineId: string;
  status?: string;
  description?: string;
  completedAt?: number;
};

// These functions are now handled by RemoteStorage client
// Keeping the types for compatibility
