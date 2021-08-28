import { useState } from "react";
import { useJobContext } from "./Context";
// Import heroicons
import { AddIcon, PlusIcon } from "@heroicons/react/solid";

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
        <button>
          <PlusIcon className="w-4 h-4" />
        </button>
      </form>
      {children}
    </div>
  );
}
