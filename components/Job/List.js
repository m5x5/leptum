import { useState } from "react";
import { useJobContext } from "./Context";
import { PlusIcon } from "@heroicons/react/solid";

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
        <button className="bg-muted hover:bg-muted/80 active:bg-muted/60 m-1">
          <PlusIcon className="w-4 h-4 text-muted-foreground" />
        </button>
      </form>
      {children}
    </div>
  );
}
