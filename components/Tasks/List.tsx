import { ReactNode, useState } from "react";
import { useJobContext } from "../Job/Context";
import LogImpactModal from "../Modal/LogImpactModal";

type Props = {
  children: ReactNode;
};

export default function TaskList({ children }: Props) {
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

  const onLog = () => {
    setLogging(true);
  };

  return (
    <div className="mt-8">
      {children}
      <div className="flex flex-row w-full gap-2 mt-8">
        <button
          className="flex-grow btn-success"
          onClick={onDone}
          type="button"
        >
          Done
        </button>
        <button
          className="flex-grow btn-secondary"
          onClick={onLog}
          type="button"
        >
          Log
        </button>
      </div>
      <LogImpactModal
        isOpen={logging}
        onCreate={onCreate}
        name={job?.name || job?.cron}
      />
    </div>
  );
}
