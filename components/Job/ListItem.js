import { useJobContext } from "./Context";
import { ChevronDoubleUpIcon } from "@heroicons/react/solid";

// Create tailwind list item
export default function JobListItem({ job } = { job: {} }) {
  const { setSelected } = useJobContext();
  const onClick = () => {
    setSelected(job.cron);
  };

  return (
    <div className="flex justify-between" onClick={onClick}>
      <h3 className="inline">{job.cron}</h3>
      {job.status === "pending" ? (
        <ChevronDoubleUpIcon className="inline text-gray-500 h-4 w-4" />
      ) : (
        ""
      )}
    </div>
  );
}
