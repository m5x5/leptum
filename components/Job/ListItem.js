import { useJobContext } from "./Context";
import { ChevronDoubleUpIcon } from "@heroicons/react/solid";
import cronstrue from "cronstrue";
import Sound from "react-sound";

// Create tailwind list item
export default function JobListItem({ job } = { job: {} }) {
  const { setSelected, deleteJob } = useJobContext();
  if (!job.cron) return null;

  let descriptiveName;
  try {
    descriptiveName = cronstrue.toString(job.cron);
    const unwantedString = "At 0 minutes past the hour, ";
    if (descriptiveName.startsWith(unwantedString)) {
      descriptiveName = descriptiveName.replace(unwantedString, "");
      const arr = descriptiveName.split("");
      arr[0] = arr[0].toUpperCase();
      descriptiveName = arr.join("");
    }
  } catch {
    return null;
  }

  const onClick = () => {
    setSelected(job.cron);
  };

  const onDelete = () => {
    deleteJob(job.cron);
  };

  return (
    <div
      className={`
      flex
      justify-between
      select-none
      cursor-pointer
      px-3
      py-2
      hover:bg-gray-200
      dark:hover:bg-gray-700
      mx-2
      rounded-xl
      active:bg-gray-300
      dark:active:bg-gray-600
      `}
      onClick={onClick}
      onDoubleClick={onDelete}
    >
      <h3 className="inline dark:text-white">{descriptiveName}</h3>
      {job.status === "pending" ? (
        <ChevronDoubleUpIcon className="inline text-blue-500 h-4 w-4 m-1" />
      ) : (
        ""
      )}
    </div>
  );
}
