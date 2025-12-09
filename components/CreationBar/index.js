import { useState } from "react";
import { PlusIcon } from "@heroicons/react/solid";

export default function CreationBar({ onCreateStandaloneTask }) {
    const [taskName, setTaskName] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [showForm, setShowForm] = useState(false);

    const handleCreateTask = () => {
        if (!taskName.trim()) return;

        onCreateStandaloneTask(taskName.trim(), taskDescription.trim());
        setTaskName("");
        setTaskDescription("");
        setShowForm(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCreateTask();
        } else if (e.key === 'Escape') {
            setShowForm(false);
            setTaskName("");
            setTaskDescription("");
        }
    };

    return (
        <div className="mb-6">
            {!showForm ? (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full px-4 py-3 text-left text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center gap-2"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>Add Task</span>
                </button>
            ) : (
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                    <input
                        type="text"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Task name..."
                        className="w-full px-3 py-2 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
                        autoFocus
                    />
                    <input
                        type="text"
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Description (optional)..."
                        className="w-full px-3 py-2 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => {
                                setShowForm(false);
                                setTaskName("");
                                setTaskDescription("");
                            }}
                            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateTask}
                            disabled={!taskName.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add Task
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
