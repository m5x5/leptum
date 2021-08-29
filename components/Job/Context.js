import {
  useCallback,
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import Cronr from "cronr";

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
    status: "scheduled",
  },
];
let sound;

export function useJobContext() {
  return useContext(JobContext);
}
export function JobContextProvider({ children }) {
  const [jobs, setJobs] = useState(defaultJobs);
  const [selected, setSelected] = useState(null);

  const job = jobs.find((job) => job.cron === selected) || jobs[0];
  const jobIndex = jobs.findIndex((job) => job.cron === selected) || 0;

  const setJobCallback = useCallback(
    (jobs) => {
      setJobs(jobs);
      saveJobs(jobs);
    },
    [setJobs]
  );

  const saveJobs = useCallback(
    (jobs) => {
      if (typeof window === "undefined") return;
      localStorage.setItem("leptum", JSON.stringify(jobs));
    },
    [typeof window]
  );

  const getJobs = useCallback(() => {
    if (typeof window === "undefined") return defaultJobs;
    const jobs = localStorage.getItem("leptum");
    if (jobs) {
      return JSON.parse(jobs);
    }
    return defaultJobs;
  }, [typeof window]);

  const updateJob = (updated) => {
    jobs[jobIndex] = { ...(job || {}), ...updated };
    console.log(jobs);
    setJobCallback(jobs);
  };
  useEffect(() => {
    if (typeof window === "undefined") return;
    const jobs = getJobs()?.[0] ? getJobs() : defaultJobs;
    setJobs(jobs);

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
      if (job.status !== "scheduled") return;
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
        const cronJob = new Cronr(job.cron, cb);
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
    </JobContext.Provider>
  );
}

export default JobContext;
