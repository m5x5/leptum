import { useState } from "react";
import { StandaloneTask } from "../../utils/useStandaloneTasks";
import { TrashIcon, PencilIcon, DotsVerticalIcon } from "@heroicons/react/outline";
import { PlayIcon } from "@heroicons/react/solid";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import Modal from "../Modal";
import { EMOTIONS } from "../ui/emotion-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface Props {
  task: StandaloneTask;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<StandaloneTask>) => void;
  onStart?: (taskName: string) => void;
  isActive?: boolean;
  onEdit?: (task: StandaloneTask) => void;
}

export default function StandaloneTaskItem({
  task,
  onComplete,
  onUncomplete,
  onDelete,
  onUpdate,
  onStart,
  isActive = false,
  onEdit
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editEffort, setEditEffort] = useState(task.effort || '');
  const [editNumericEstimate, setEditNumericEstimate] = useState(task.numericEstimate?.toString() || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleComplete = () => {
    if (task.status === 'completed') {
      onUncomplete(task.id);
    } else {
      onComplete(task.id);
    }
  };

  const handleSaveEdit = () => {
    const updates: Partial<StandaloneTask> = {
      name: editName,
      description: editDescription
    };

    if (editEffort) {
      updates.effort = editEffort as 'XS' | 'S' | 'M' | 'L' | 'XL';
    } else if (task.effort) {
      updates.effort = undefined;
    }

    if (editNumericEstimate) {
      const numericValue = parseFloat(editNumericEstimate);
      if (!isNaN(numericValue)) {
        updates.numericEstimate = numericValue;
      }
    } else if (task.numericEstimate !== undefined) {
      updates.numericEstimate = undefined;
    }

    onUpdate(task.id, updates);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(task.name);
    setEditDescription(task.description || '');
    setEditEffort(task.effort || '');
    setEditNumericEstimate(task.numericEstimate?.toString() || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className={`
      flex items-center justify-between p-3 rounded-lg
      hover:bg-muted/50 transition-colors
      ${isActive ? 'bg-primary/5 border-l-2 border-primary' : ''}
    `}>
      <div className="flex items-center flex-grow">
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={(checked) => {
            if (checked) {
              onComplete(task.id);
            } else {
              onUncomplete(task.id);
            }
          }}
          className="mr-3"
        />

        <div className="flex-grow">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm"
                placeholder="Task name"
                autoFocus
              />
              <Input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-xs"
                placeholder="Description (optional)"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Effort</label>
                  <select
                    value={editEffort}
                    onChange={(e) => setEditEffort(e.target.value)}
                    className="w-full p-2 bg-muted border border-border text-foreground rounded text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">None</option>
                    <option value="XS">XS (Extra Small)</option>
                    <option value="S">S (Small)</option>
                    <option value="M">M (Medium)</option>
                    <option value="L">L (Large)</option>
                    <option value="XL">XL (Extra Large)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Numeric Points</label>
                  <Input
                    type="number"
                    value={editNumericEstimate}
                    onChange={(e) => setEditNumericEstimate(e.target.value)}
                    className="text-xs"
                    placeholder="e.g., 2.5"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
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
              <div className="flex items-center gap-2">
                <div className={`
                  text-sm font-medium
                  ${task.status === 'completed'
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : 'text-gray-900 dark:text-white'
                  }
                `}>
                  {task.name}
                </div>
                {(task.effort || task.numericEstimate) && (
                  <div className="flex gap-1">
                    {task.effort && (
                      <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium">
                        {task.effort}
                      </span>
                    )}
                    {task.numericEstimate && (
                      <span className="px-1.5 py-0.5 text-xs bg-secondary/10 text-secondary-foreground rounded-full font-medium">
                        {task.numericEstimate}
                      </span>
                    )}
                  </div>
                )}
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
              {task.status === 'completed' && task.emotions && task.emotions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.emotions.map((emotion) => {
                    const emotionOption = EMOTIONS.find(e => e.id === emotion);
                    if (!emotionOption) return null;
                    return (
                      <span
                        key={emotion}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1"
                        title={emotionOption.label}
                      >
                        <span>{emotionOption.emoji}</span>
                        <span>{emotionOption.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatTime(task.createdAt)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-muted/50"
              title="Task actions"
            >
              <DotsVerticalIcon className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onStart && (
              <>
                <DropdownMenuItem
                  onClick={() => onStart(task.name)}
                  disabled={isActive}
                  className="cursor-pointer"
                >
                  <PlayIcon className="h-4 w-4 mr-2 text-primary" />
                  {isActive ? 'Currently active' : 'Start tracking'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => {
                if (onEdit) {
                  onEdit(task);
                } else {
                  setIsEditing(true);
                }
              }}
              className="cursor-pointer"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Modal
        isOpen={showDeleteConfirm}
        closeModal={() => setShowDeleteConfirm(false)}
      >
        <Modal.Title>Delete Task</Modal.Title>
        <Modal.Body>
          Are you sure you want to delete "{task.name}"?
        </Modal.Body>
        <Modal.Footer>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDelete(task.id);
                setShowDeleteConfirm(false);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
} 