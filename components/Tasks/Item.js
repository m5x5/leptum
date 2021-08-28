import { useState } from "react";
import { useJobContext } from "../Job/Context";

export default function TaskListItem({ task, index }) {
  const [status, setStatus] = useState(task.status);
  const { updateTask } = useJobContext();

  const onChangeStatus = () => {
    task.status = status === "due" ? "completed" : "due";
    updateTask(task, index);
    setStatus(task.status);
  };

  return (
    <div>
      <h3 className="inline">{task.name}</h3>
      <input
        type="checkbox"
        value={task.status === "due"}
        onChange={onChangeStatus}
      />
    </div>
  );
}
