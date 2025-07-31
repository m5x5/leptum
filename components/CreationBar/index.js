import { useState } from "react";
import {useJobContext} from "../Job/Context";
import {Button} from "../ui/button";

// Create add todo form with tailwindcss
export default function CreationBar({ onCreateStandaloneTask }) {
    const {openCreateTaskModal, selected} = useJobContext();
    const [taskName, setTaskName] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [showStandaloneForm, setShowStandaloneForm] = useState(false);

    const addRoutineTask = () => {
        if (!selected) return;
        openCreateTaskModal(true);
    };

    const handleCreateStandaloneTask = () => {
        if (!taskName.trim()) return;
        
        onCreateStandaloneTask(taskName.trim(), taskDescription.trim());
        setTaskName("");
        setTaskDescription("");
        setShowStandaloneForm(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCreateStandaloneTask();
        } else if (e.key === 'Escape') {
            setShowStandaloneForm(false);
            setTaskName("");
            setTaskDescription("");
        }
    };

    return (
        <div className="mt-5 space-y-4">
            {/* Quick Standalone Task Creation */}
            <div className="flex items-center space-x-3">
                {!showStandaloneForm ? (
                    <>
                        <Button 
                            type="button" 
                            onClick={() => setShowStandaloneForm(true)}
                            variant="outline"
                        >
                            + Quick Task
                        </Button>
                        <Button 
                            type="button" 
                            onClick={addRoutineTask}
                            disabled={!selected}
                            className={!selected ? "opacity-50 cursor-not-allowed" : ""}
                        >
                            Add to Routine
                        </Button>
                        {!selected && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Select a routine to add routine tasks
                            </span>
                        )}
                    </>
                ) : (
                    <div className="flex items-center space-x-2 flex-grow">
                        <input
                            type="text"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Task name..."
                            className="flex-grow px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                            autoFocus
                        />
                        <input
                            type="text"
                            value={taskDescription}
                            onChange={(e) => setTaskDescription(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Description (optional)..."
                            className="flex-grow px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        />
                        <Button 
                            type="button" 
                            onClick={handleCreateStandaloneTask}
                            disabled={!taskName.trim()}
                            size="sm"
                        >
                            Add
                        </Button>
                        <Button 
                            type="button" 
                            onClick={() => {
                                setShowStandaloneForm(false);
                                setTaskName("");
                                setTaskDescription("");
                            }}
                            variant="outline"
                            size="sm"
                        >
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
