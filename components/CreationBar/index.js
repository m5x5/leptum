import { PencilIcon, PlusIcon, ClockIcon } from "@heroicons/react/outline";
import { useState } from "react";

// Create add todo form with tailwindcss
export default function CreationBar() {
  const [mode, setMode] = useState("task");

  const onSwitchMode = (e) => {
    e.preventDefault();
    setMode(mode === "task" ? "cron" : "task");
  };

  return (
    <form>
      <div className="flex items-center mt-5">
        <button className="bg-white p-3 rounded-l-xl" onClick={onSwitchMode}>
          {mode === "task" ? (
            <PencilIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ClockIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>
        <input
          className="bg-white focus:border-blue-500 p-3 rounded-r-xl appearance-none border-2 border-gray-200 w-full text-gray-700 leading-tight focus:outline-none"
          id="todo"
          type="text"
          placeholder="Add a new todo"
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold p-2 rounded-xl focus:outline-none focus:shadow-outline"
          type="button"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>
    </form>
  );
}
