import { useJobContext } from "./Context";
import { ChevronDoubleUpIcon } from "@heroicons/react/solid";
import cronstrue from "cronstrue";

// Create tailwind list item
export default function JobListItem({ job } = { job: {} }) {
  const { setSelected } = useJobContext();
  if (!job.cron) return null;
  const descriptiveName = cronstrue.toString(job.cron);

  const onClick = () => {
    setSelected(job.cron);
  };

  return (
    <div className="flex justify-between" onClick={onClick}>
      <h3 className="inline">{descriptiveName}</h3>
      {job.status === "pending" ? (
        <ChevronDoubleUpIcon className="inline text-blue-500 h-4 w-4 m-1" />
      ) : (
        ""
      )}
    </div>
  );
}
