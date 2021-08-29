import { TrashIcon, CheckCircleIcon } from "@heroicons/react/outline";
import { useState } from "react";
import { useJobContext } from "../Job/Context";

export default function TaskListItem({ task, index }) {
  const [status, setStatus] = useState(task.status);
  const { updateTask, deleteTask } = useJobContext();

  const onChangeStatus = () => {
    task.status = status === "due" ? "completed" : "due";
    updateTask(task, index);
    setStatus(task.status);
  };

  return (
    <div
      className="select-none cursor-pointer bg-white p-3 rounded-xl grid grid-rows-2 grid-cols-task"
      onDoubleClick={() => deleteTask(index)}
    >
      <h3 className="inline text-2xl font-bold col-span-1 auto-cols-max">
        {task.name}
      </h3>
      <div
        className={
          "flex justify-end bg-gray-200 col-auto auto-cols-min auto p-2 rounded-xl gap-2 " +
          (task.status === "completed" ? "bg-green-200" : "")
        }
      >
        <TrashIcon className="w-6 h-6 hover:text-red-500 transition" />
        <CheckCircleIcon
          className="w-6 h-6 hover:text-green-500 transition"
          onClick={onChangeStatus}
        />
      </div>
      <p>{task.description}</p>
    </div>
  );
}
