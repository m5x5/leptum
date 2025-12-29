import { useState } from "react";
import { StandaloneTask } from "../../utils/useStandaloneTasks";
import { TrashIcon, PencilIcon } from "@heroicons/react/outline";
import { PlayIcon } from "@heroicons/react/solid";

interface Props {
  task: StandaloneTask;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<StandaloneTask>) => void;
  onStart?: (taskName: string) => void;
  isActive?: boolean;
}

export default function StandaloneTaskItem({
  task,
  onComplete,
  onUncomplete,
  onDelete,
  onUpdate,
  onStart,
  isActive = false
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editDescription, setEditDescription] = useState(task.description || '');

  const handleToggleComplete = () => {
    if (task.status === 'completed') {
      onUncomplete(task.id);
    } else {
      onComplete(task.id);
    }
  };

  const handleSaveEdit = () => {
    onUpdate(task.id, {
      name: editName,
      description: editDescription
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(task.name);
    setEditDescription(task.description || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    if (taskDate.getTime() === today.getTime()) {
      return `Today at ${timeStr}`;
    } else if (taskDate.getTime() === yesterday.getTime()) {
      return `Yesterday at ${timeStr}`;
    } else {
      return `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })} at ${timeStr}`;
    }
  };

  return (
    <div className={`
      flex items-center justify-between p-3 rounded-lg
      hover:bg-muted/50 transition-colors
      ${isActive ? 'bg-primary/5 border-l-2 border-primary' : ''}
    `}>
      <div className="flex items-center flex-grow">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={handleToggleComplete}
          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />

        <div className="flex-grow">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Task name"
                autoFocus
              />
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                placeholder="Description (optional)"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className={`
                text-sm font-medium
                ${task.status === 'completed'
                  ? 'line-through text-gray-500 dark:text-gray-400'
                  : 'text-gray-900 dark:text-white'
                }
              `}>
                {task.name}
              </div>
              {task.description && (
                <div className={`
                  text-xs mt-1
                  ${task.status === 'completed'
                    ? 'line-through text-gray-400 dark:text-gray-500'
                    : 'text-gray-600 dark:text-gray-300'
                  }
                `}>
                  {task.description}
                </div>
              )}
              {task.routineId && (
                <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                  Created {formatDateTime(task.createdAt)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 ml-3">
        {onStart && (
          <button
            onClick={() => onStart(task.name)}
            disabled={isActive}
            className={`p-1 ${
              isActive
                ? 'text-primary cursor-not-allowed'
                : 'text-gray-400 hover:text-primary dark:hover:text-primary'
            }`}
            title={isActive ? 'Currently active' : 'Start tracking'}
          >
            <PlayIcon className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          title="Edit task"
        >
          <PencilIcon className="h-4 w-4" />
        </button>

        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this task?')) {
              onDelete(task.id);
            }
          }}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          title="Delete task"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 