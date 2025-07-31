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
};

export type DraftHabit = {
  name: string;
  jobId: string;
  status?: string;
  description?: string;
};

// These functions are now handled by RemoteStorage client
// Keeping the types for compatibility
