import { useJobContext } from "../Job/Context";

// Create add todo form with tailwindcss
export default function CreationBar() {
  const { openCreateTaskModal } = useJobContext();

  const addTask = () => {
    openCreateTaskModal(true);
  };

  return (
    <div className="flex items-center mt-5">
      <button
        className="bg-blue-500 dark:bg-blue-800 hover:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-blue-200 font-bold p-2 rounded-xl focus:outline-none focus:shadow-outline"
        type="button"
        onClick={addTask}
      >
        Add Task
      </button>
    </div>
  );
}
