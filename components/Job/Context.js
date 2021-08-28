import { useCallback, createContext, useContext, useState } from "react";

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

  return (
    <JobContext.Provider value={{ jobs, setJob: setJobCallback }}>
      {children}
    </JobContext.Provider>
  );
}

export default JobContext;
