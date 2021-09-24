import { useJobContext } from "./Context";
import { ChevronDoubleUpIcon } from "@heroicons/react/solid";
import {
  getDescription,
  getPrettyTimeTillNextOccurrence,
} from "../../utils/cron";
import { useEffect, useState } from "react";

const MAX_NAME_LENGTH = 50;

export default function JobListItem({ job } = { job: {} }) {
  const { setSelected, deleteJob } = useJobContext();
  const [count, update] = useState(0);
  if (!job.cron) return null;

  let descriptiveName = getDescription(job.cron);
  if (!descriptiveName) return null;

  if (descriptiveName.length > MAX_NAME_LENGTH) {
    descriptiveName = descriptiveName.substring(0, MAX_NAME_LENGTH) + "...";
  }

  const time = getPrettyTimeTillNextOccurrence(job.cron);

  useEffect(() => {
    const timeout = setTimeout(() => {
      update(count + 1);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [count]);

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
        <span className="py-0.5 px-1.5 rounded-xl dark:bg-gray-700 dark:text-gray-400">
          {time}
        </span>
      )}
    </div>
  );
}
