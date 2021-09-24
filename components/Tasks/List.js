import { useState } from "react";
import { useJobContext } from "../Job/Context";
import LogImpactModal from "../Modal/LogImpactModal";

export default function TaskList({ children }) {
  const { updateJob, job } = useJobContext();
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
      <button
        className="w-full mt-8 btn-success"
        onClick={() => setLogging(true)}
      >
        Done
      </button>
      <LogImpactModal isOpen={logging} onCreate={onCreate} name={job.cron} />
    </div>
  );
}
