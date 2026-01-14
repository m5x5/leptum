import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as workerTimers from "worker-timers";
import { timeTillNextOccurrence } from "../../utils/cron";
import CreateTaskModal from "../Modal/CreateTaskModal";
import { DbJob, DraftHabit, Habit } from "./api";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { v4 as uuidv4 } from 'uuid';

type JobContextType = {
  jobs: DbJob[],
  updateJobs: Function;
  setJob: Function;
  addJob: (cron:string, name:string) => void,
  selected: string | null;
  setSelected: (cron: string | null) => void;
  updateTask: (updates: DraftHabit, i: number) => void;
  handleTask: (name: string, description: string) => void;
  addTask: (name: string, description: string) => void;
  job: DbJob | null;
  jobIndex: number;
  updateJob: (updated: DbJob) => void;
  deleteJob: (cron: string) => void;
  deleteTask: (i: number) => void;
  openCreateTaskModal: () => void;
}

const JobContext = createContext<JobContextType>({
  jobs: [],
  updateJobs() {},
  setJob() {},
  addJob() {},
  selected: null,
  setSelected() {},
  updateTask() {},
  handleTask() {},
  addTask() {},
  job: null,
  jobIndex: 0,
  updateJob() {},
  deleteJob() {},
  deleteTask() {},
  openCreateTaskModal() {},
});

let sound: HTMLAudioElement | null = null;

export function useJobContext() {
  return useContext(JobContext);
}

type Props = {
  children: ReactNode;
};

export function JobContextProvider({ children }: Props) {
  const getJobs = async () => {
    if (typeof window === "undefined") return [];
    const jobs = await remoteStorageClient.getJobs();
    return jobs;
  };

  const [jobs, setJobs] = useState<DbJob[]>([]);

  useEffect(() => {
    getJobs().then((jobs) => setJobs(jobs as DbJob[]));
  }, []);

  const [selected, setSelected] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const job = selected ? jobs.find((job) => job.cron === selected) || null : null;
  const jobIndex = selected ? jobs.findIndex((job) => job.cron === selected) : -1;

  const setJobCallback = (jobs: DbJob[]) => {
    setJobs([...jobs]);
    saveJobs([...jobs]);
  };

  const saveJobs = async (jobs: DbJob[]) => {
    if (typeof window === "undefined") return;
    // Save all jobs to RemoteStorage
    for (const job of jobs) {
      await remoteStorageClient.saveJob(job);
    }
  };

  const updateJob = (updated: DbJob) => {
    if (!job || jobIndex === -1) return;
    jobs[jobIndex] = {...job, ...updated};
    setJobCallback(jobs);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    sound = new Audio("./piece-of-cake-611.mp3");
  }, [typeof window]);

  const deleteJob = (cron: string) => {
    const newJobs = jobs.filter((job) => job.cron !== cron);
    setJobCallback(newJobs);
  };

  // CRON
  const setupCRONJobs = () => {
    let cronJobs: number[] = [];
    jobs.forEach((job) => {
      if (job.status === "pending") return;

      const cb = () => {
        job.status = "pending";
        job.habits.forEach((habit) => {
          habit.status = "due";
        });

        setJobCallback(jobs);

        if (sound) {
          if (sound.readyState > 0) {
            sound.play();
          } else {
            sound.onload = () => sound?.play();
          }
        }
      };
      try {
        let timeLeft = timeTillNextOccurrence(job.cron);
        if (timeLeft <= 0) {
          timeLeft = 0;
        }
        const timer = workerTimers.setTimeout(() => {
          cb();
        }, timeLeft);

        cronJobs.push(timer);
      } catch {}
    });
    return cronJobs;
  };

  const destroyCRONJobs = (cronJobs: number[]) => {
    cronJobs.forEach((cronJob) => {
      workerTimers.clearTimeout(cronJob);
    });
  };

  // Habits
  const updateTask = (updates: DraftHabit, i: number) => {
    if (!job) return;
    job.habits[i] = {
      ...(job.habits[i] || {}),
      ...updates,
    };
    setJobCallback(jobs);
  };

  const handleAddJob = (name: string, description: string) => {
    if (!job?.id) return;
    
    const newHabit: Habit = {
      id: uuidv4(),
      name,
      description: description || '',
      jobId: job.id,
      index: job.habits.length,
      status: 'due'
    };
    
    job.habits.push(newHabit);
    setJobCallback(jobs);
  };

  const deleteTask = (i: number) => {
    if (!job) return;
    job.habits.splice(i, 1);
    setJobCallback(jobs);
  };

  useEffect(() => {
    const cronJobs = setupCRONJobs();
    return () => {
      destroyCRONJobs(cronJobs);
    };
  }, [JSON.stringify(jobs)]);

  const addJobCallback = useCallback(async (cron: string, name: string) => {
    const newJob: DbJob = {
      id: uuidv4(),
      cron,
      name,
      status: "pending",
      index: jobs.length,
      lastEndTime: 0,
      habits: []
    };
    
    await remoteStorageClient.saveJob(newJob);
    setJobs(prev => [...prev, newJob]);
  }, [jobs.length]);

  const openCreateTaskModal = () => setShowCreateTaskModal(true);
  const hideCreateTaskModal = () => setShowCreateTaskModal(false);

  return (
    <JobContext.Provider
      value={{
        jobs,
        updateJobs: setJobs,
        setJob: setJobCallback,
        addJob: addJobCallback,
        selected,
        setSelected,
        updateTask,
        handleTask: handleAddJob,
        addTask: handleAddJob,
        job,
        jobIndex,
        updateJob,
        deleteJob,
        deleteTask,
        openCreateTaskModal,
      }}
    >
      {children}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onHide={hideCreateTaskModal}
        onCreate={handleAddJob}
      />
    </JobContext.Provider>
  );
}

export default JobContext;
