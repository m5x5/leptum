import { TrashIcon, CheckCircleIcon } from "@heroicons/react/outline";
import { useState } from "react";
import { useJobContext } from "../Job/Context";
import ConfirmDeleteModal from "../Modal/Confirm/ConfirmDeleteModal";

export default function TaskListItem({ task, index }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { updateTask, deleteTask } = useJobContext();

  const onChangeStatus = () => {
    const newStatus = task.status === "due" ? "completed" : "due";
    const updates = {
      ...task,
      status: newStatus,
      completedAt: newStatus === "completed" ? Date.now() : undefined
    };
    if (newStatus !== "completed") {
      delete updates.completedAt;
    }
    updateTask(updates, index);
  };

  const openConfirm = () => {
    setShowConfirm(true);
  };

  return (
    <div className="select-none cursor-pointer bg-card border border-border p-3 rounded-xl grid grid-rows-2 grid-cols-task mb-3">
      <h3 className="inline text-xl font-bold col-span-1 auto-cols-max text-foreground">
        {task.name}
      </h3>
      <div
        className={
          "flex justify-end bg-muted col-auto auto-cols-min auto p-1 rounded-xl gap-1 " +
          (task.status === "completed" ? "bg-green-200 dark:bg-green-900" : "")
        }
      >
        <TrashIcon
          className="w-5 h-5 hover:text-red-500 transition text-muted-foreground"
          onClick={openConfirm}
        />
        <CheckCircleIcon
          className="w-5 h-5 hover:text-green-500 transition text-muted-foreground"
          onClick={onChangeStatus}
        />
      </div>
      <p className="text-muted-foreground">{task.description}</p>
      <ConfirmDeleteModal
        title={`Delete "${task.name}"?`}
        description="Are you sure you want to delete this task?"
        onConfirm={() => deleteTask(index)}
        isOpen={showConfirm}
        onHide={() => setShowConfirm(false)}
      />
    </div>
  );
}
