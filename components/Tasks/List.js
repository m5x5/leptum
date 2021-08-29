import { CheckIcon, PlusIcon } from "@heroicons/react/solid";
import { useState } from "react";
import { useJobContext } from "../Job/Context";

export default function TaskList({ children }) {
  const [task, setTask] = useState([]);
  const { addTask, updateJob, jobIndex } = useJobContext();

  const onChange = (e) => {
    const { value } = e.target;
    setTask(value);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    addTask(task);
    setTask("");
  };

  const onDone = () => {
    e.preventDefault();
    updateJob({ status: "due" });
  };

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          name="task"
          onChange={onChange}
          value={task}
          placeholder="Task name"
        />
        <button className="bg-gray-400 hover:bg-gray-500 active:bg-gray-600 m-1">
          <PlusIcon className="w-4 h-4 text-gray-100" />
        </button>
        <button
          className="bg-gray-400 hover:bg-gray-500 active:bg-gray-600 m-1"
          onClick={onDone}
        >
          <CheckIcon className="w-4 h-4 text-gray-100" />
        </button>
      </form>
      {children}
    </div>
  );
}
