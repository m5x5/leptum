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

export function useJobContext() {
  return useContext(JobContext);
}
export function JobContextProvider({ children }) {
  const [jobs, setJobs] = useState(defaultJobs);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const jobs = getJobs()?.[0] ? getJobs() : defaultJobs;
    setJobs(jobs);
  }, [typeof window]);

  const setupCRONJobs = useCallback(() => {
    let cronJobs = [];
    jobs.forEach((job) => {
      console.log("Job");
      if (job.status !== "scheduled") return;
      console.log("You got the job");
      const cb = () => {
        job.status = "pending";
        console.log("Task is pending now");
      };
      const cronJob = new Cronr(job.cron, cb);
      cronJob.start();
      cronJobs.push(cronJob);
    });
    return cronJobs;
  });

  const destroyCRONJobs = (cronJobs) => {
    cronJobs.forEach((cronJob) => {
      cronJob.stop();
    });
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
      value={{ jobs, setJob: setJobCallback, addJob: addJobCallback }}
    >
      {children}
    </JobContext.Provider>
  );
}

export default JobContext;
