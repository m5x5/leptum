import { PlusIcon, ClockIcon } from "@heroicons/react/outline";
import { useState } from "react";
import { useJobContext } from "../Job/Context";

// Create add todo form with tailwindcss
export default function CreationBar() {
  const { addJob, openCreateTaskModal } = useJobContext();
  const [text, setText] = useState("");

  const onChangeText = (e) => {
    setText(e.target.value);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!text) return;
    addJob(text);
    setText("");
  };

  const addTask = () => {
    openCreateTaskModal(true);
  };

  return (
    <div className="flex items-center mt-5">
      <form onSubmit={onSubmit} className="flex flex-row w-full">
        <input
          id="todo"
          type="text"
          placeholder="Add a CRON job"
          value={text}
          onChange={onChangeText}
        />
        <button
          className="bg-blue-500 dark:bg-blue-800 hover:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-blue-200 font-bold p-2 rounded-r-xl focus:outline-none focus:shadow-outline h-11 w-11"
          type="button"
          onClick={onSubmit}
        >
          <PlusIcon className="w-6 h-6" />
        </button>
        <button onClick={addTask}>Add Task</button>
      </form>
    </div>
  );
}
