import {
  useCallback,
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

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
    const jobs = getJobs();
    setJobs(jobs);
  }, [typeof window]);

  const addJobCallback = useCallback((job) => {
    setJobCallback([...jobs, { cron: job, tasks: [] }]);
  });

  return (
    <JobContext.Provider
      value={{ jobs, setJob: setJobCallback, addJob: addJobCallback }}
    >
      {children}
    </JobContext.Provider>
  );
}

export default JobContext;
