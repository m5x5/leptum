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

export function addJob({ status, cron, lastEndTime, name }: Job) {
  return fetch("/api/job", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
      cron,
      lastEndTime: lastEndTime || 0,
      name: name || undefined,
    }),
  });
}

export async function getJobsFromDB(): Promise<DbJob[]> {
  const res = await fetch("/api/job");
  if (!res.ok) {
    console.error(res, res.body);
    throw new Error("Request failed with error code " + res.status);
  }
  return res.json();
}

export async function addHabit({ jobId, name }: DraftHabit): Promise<Habit> {
  const res = await fetch("/api/habit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jobId,
      name,
    }),
  });

  return res.json();
}
