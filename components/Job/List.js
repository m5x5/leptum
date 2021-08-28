import { useState } from "react";
import { useJobContext } from "./Context";

export default function JobList({ children }) {
  const { addJob } = useJobContext();
  const [job, setJob] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    addJob(job);
  };

  const onChange = (e) => {
    setJob(e.target.value);
  };

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input type="text" placeholder="CRON" onChange={onChange} />
        <button>Add Job</button>
      </form>
      <h1>Jobs</h1>
      {children}
    </div>
  );
}
