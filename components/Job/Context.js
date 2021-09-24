import {
  useCallback,
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { timeTillNextOccurrence } from "../../utils/cron";
import * as workerTimers from "worker-timers";
import CreateTaskModal from "../Modal/CreateTaskModal";

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
    return jobs;
  });
  const [selected, setSelected] = useState(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

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

  const destroyCRONJobs = (cronJobs) => {
    cronJobs.forEach((cronJob) => {
      workerTimers.clearTimeout(cronJob);
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

  const addTask = (name, description) => {
    const newTask = {
      name,
      status: "due",
      description,
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

  const openCreateTaskModal = () => setShowCreateTaskModal(true);
  const hideCreateTaskModal = () => setShowCreateTaskModal(false);

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
        openCreateTaskModal,
      }}
    >
      {children}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onHide={hideCreateTaskModal}
        onCreate={addTask}
      />
    </JobContext.Provider>
  );
}

export default JobContext;
