import { PencilIcon, PlusIcon, ClockIcon } from "@heroicons/react/outline";
import { useState } from "react";
import { useJobContext } from "../Job/Context";

// Create add todo form with tailwindcss
export default function CreationBar() {
  const { addTask, addJob } = useJobContext();
  const [mode, setMode] = useState("task");
  const [text, setText] = useState("");

  const onSwitchMode = (e) => {
    e.preventDefault();
    setMode(mode === "task" ? "cron" : "task");
  };

  const onChangeText = (e) => {
    setText(e.target.value);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!text) return;
    if (mode === "task") {
      addTask(text);
    } else {
      addJob(text);
    }
    setText("");
  };

  return (
    <div className="flex items-center mt-5">
      <button
        className="bg-white dark:bg-gray-700 p-3 mr-1 rounded-l-xl ripple"
        onClick={onSwitchMode}
        onSubmit={false}
      >
        {mode === "task" ? (
          <PencilIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ClockIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>
      <form onSubmit={onSubmit} className="flex flex-row w-full gap-1">
        <input
          className="bg-white dark:bg-gray-700 focus:border-blue-500 p-3 appearance-none border-gray-200 w-full text-gray-700 dark:text-gray-300 leading-tight focus:outline-none flex-grow"
          id="todo"
          type="text"
          placeholder={mode === "task" ? "Add a task" : "Add a CRON job"}
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
      </form>
    </div>
  );
}
