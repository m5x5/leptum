import {
  useCallback,
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import Cronr from "cronr";
import CronrCounter from "cronr/CronrCounter";
import Modal from "../Modal";
import { getNextOccurrence, timeTillNextOccurrence } from "../../utils/cron";

const JobContext = createContext(null);
const defaultJobs = [
  {
    cron: "0 0 * * *",
    tasks: [
      {
        name: "task1",
        status: "due",
      },
    ],
    status: "due",
  },
];
let sound;

export function useJobContext() {
  return useContext(JobContext);
}
export function JobContextProvider({ children }) {
  const getJobs = () => {
    if (typeof window === "undefined") return defaultJobs;
    const jobs = localStorage.getItem("leptum");
    if (jobs) {
      return JSON.parse(jobs);
    }
    return defaultJobs;
  };

  const [jobs, setJobs] = useState(() => {
    if (typeof window === "undefined") return defaultJobs;
    const jobs = getJobs()?.[0] ? getJobs() : defaultJobs;
    console.log(jobs);
    return jobs;
  });
  const [selected, setSelected] = useState(null);

  console.log("jobs", jobs);
  const job = jobs.find((job) => job.cron === selected) || jobs[0];
  const jobIndex = jobs.findIndex((job) => job.cron === selected) || 0;

  const setJobCallback = (jobs) => {
    setJobs([...jobs]);
    saveJobs([...jobs]);
  };

  const saveJobs = (jobs) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("leptum", JSON.stringify(jobs));
  };

  const updateJob = (updated) => {
    jobs[jobIndex] = { ...(job || {}), ...updated };
    setJobCallback(jobs);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    sound = new Audio("./piece-of-cake-611.mp3");
  }, [typeof window]);

  const deleteJob = (cron) => {
    const newJobs = jobs.filter((job) => job.cron !== cron);
    setJobCallback(newJobs);
  };

  // CRON
  const setupCRONJobs = () => {
    let cronJobs = [];
    jobs.forEach((job) => {
      if (job.status === "pending") return;
      const cb = () => {
        job.lastEndTime = Date.now();
        job.status = "pending";
        job.tasks.forEach((task) => {
          task.status = "due";
        });
        setJobCallback(jobs);
        if (sound) {
          if (sound.readyState > 0) {
            sound.play();
          } else {
            sound.onload = () => sound.play();
          }
        }
      };
      try {
        const cronJob = new Cronr(job.cron, cb, {
          startTime: new Date(
            Math.floor(
              (job.lastEndTime || Date.now() - 1000 * 60 * 60 * 24 * 31) / 1000
            ) * 1000
          ),
        });
        const counter = new CronrCounter({
          pattern: job.cron,
          ts: job.lastEndTime || Date.now(),
        });
        counter.result.next();
        const dueDate = getNextOccurrence(job.cron);
        const timeLeft = timeTillNextOccurrence(job.cron);
        console.log({ dueDate, timeLeft });

        if (timeLeft <= 0) {
          cb();
        }
        cronJob.start();
        cronJobs.push(cronJob);
      } catch {}
    });
    return cronJobs;
  };

  const destroyCRONJobs = (cronJobs) => {
    cronJobs.forEach((cronJob) => {
      cronJob.stop();
    });
  };

  // Tasks
  const updateTask = (updates, i) => {
    const newTask = {
      ...(job?.tasks?.[i] || {}),
      ...updates,
    };
    job.tasks[i] = newTask;
    setJobCallback(jobs);
  };

  const addTask = (cron) => {
    const newTask = {
      name: cron,
      status: "due",
    };
    job.tasks.push(newTask);
    setJobCallback(jobs);
  };

  const deleteTask = (i) => {
    job.tasks.splice(i, 1);
    setJobCallback(jobs);
  };

  useEffect(() => {
    const cronJobs = setupCRONJobs();
    return () => {
      destroyCRONJobs(cronJobs);
    };
  }, [JSON.stringify(jobs)]);

  const addJobCallback = useCallback((job) => {
    setJobCallback([...jobs, { cron: job, tasks: [], status: "scheduled" }]);
  });

  const getDuration = useCallback((job) => {});

  return (
    <JobContext.Provider
      value={{
        jobs,
        setJob: setJobCallback,
        addJob: addJobCallback,
        selected: selected || jobs[0].cron,
        setSelected,
        updateTask,
        addTask,
        job,
        jobIndex,
        updateJob,
        deleteJob,
        deleteTask,
      }}
    >
      {children}
      <Modal />
    </JobContext.Provider>
  );
}

export default JobContext;
