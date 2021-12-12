import { useJobContext } from "./Context";
import { ChevronDoubleUpIcon } from "@heroicons/react/solid";
import {
  getDescription,
  getPrettyTimeTillNextOccurrence,
} from "../../utils/cron";
import { useEffect, useState } from "react";
import EditJobModal from "../Modal/EditJobModal";

const MAX_NAME_LENGTH = 50;

type Props = {
  job: {cron:string; name:string; status:string;}
  isValid?: boolean;
}

export default function JobListItem({ job, isValid }:Props) {
  const { setSelected } = useJobContext();
  const [count, update] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  if (!job.cron) return null;

  let descriptiveName = getDescription(job.cron) || "";

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

  const onEdit = () => {
    setShowEditModal(true);
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
      border
      ${isValid === false ? "border-red-500": "border-transparent"}
      `}
      onClick={onClick}
      onDoubleClick={onEdit}
    >
      <h3 className="inline dark:text-white">{job.name || descriptiveName}</h3>
      {job.status === "pending" ? (
        <ChevronDoubleUpIcon className="inline text-blue-500 h-4 w-4 m-1" />
      ) : (
        <span className="py-0.5 px-1.5 rounded-xl dark:bg-gray-700 dark:text-gray-400">
          {time}
        </span>
      )}
      <EditJobModal
        isOpen={showEditModal}
        onHide={() => setShowEditModal(false)}
        prevName={job.name}
        prevCron={job.cron}
      />
    </div>
  );
}
