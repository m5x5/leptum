import { useState } from "react";
import { useJobContext } from "../Job/Context";
import LogImpactModal from "../Modal/LogImpactModal";
import TasksActions from "./Actions";

export default function TaskList({ children }) {
  const { job, updateJob } = useJobContext();
  const [logging, setLogging] = useState(false);

  const onDone = () => {
    updateJob({
      status: "due",
    });
  };
  const onCreate = () => {
    onDone();
    setLogging(false);
  };

  return (
    <div className="mt-8">
      {children}
      <LogImpactModal
        isOpen={logging}
        onCreate={onCreate}
        name={job.name || job.cron}
      />
      <TasksActions />
    </div>
  );
}
