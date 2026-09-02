import { useState, useEffect } from "react";
import { hapticTap } from "../../utils/haptics";
import { StandaloneTask } from "../../utils/useStandaloneTasks";
import { TrashIcon, PencilIcon, DotsVerticalIcon, ChevronDownIcon } from "@heroicons/react/outline";
import { PlayIcon } from "@heroicons/react/solid";
import { Checkbox } from "../ui/checkbox";
import { useCurrentActivity } from "../CurrentActivityContext";
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { useIsMobile } from "../../hooks/use-mobile";
import { Button } from "../ui/button";

function LiveDuration({ startTime }: { startTime: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const elapsed = Math.floor((now - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span>{m}:{String(s).padStart(2, "0")}</span>;
}

interface Props {
  task: StandaloneTask;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<StandaloneTask>) => void;
  onStart?: (taskName: string) => void;
  isActive?: boolean;
  onEdit?: (task: StandaloneTask) => void;
  onSaveToRoutine?: (routineId: string, taskName: string, updates: { name: string; effort?: 'XS' | 'S' | 'M' | 'L' | 'XL'; numericEstimate?: number }) => Promise<void>;
  hideDescription?: boolean;
  hideActions?: boolean;
}

export default function StandaloneTaskItem({
  task,
  onComplete,
  onUncomplete,
  onDelete,
  onUpdate,
  onStart,
  isActive = false,
  onEdit,
  onSaveToRoutine,
  hideDescription = false,
  hideActions = false,
}: Props) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editEffort, setEditEffort] = useState(task.effort || '');
  const [editNumericEstimate, setEditNumericEstimate] = useState(task.numericEstimate?.toString() || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isRoutineTask = !!task.routineId && !!onSaveToRoutine;
  const descriptionWasEdited = editDescription !== (task.description || '');

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
    setIsEditModalOpen(false);
  };

  const handleSaveToRoutine = async () => {
    if (!task.routineId || !onSaveToRoutine) return;
    const routineUpdates: { name: string; effort?: 'XS' | 'S' | 'M' | 'L' | 'XL'; numericEstimate?: number } = {
      name: editName,
    };
    if (editEffort) {
      routineUpdates.effort = editEffort as 'XS' | 'S' | 'M' | 'L' | 'XL';
    }
    if (editNumericEstimate) {
      const numericValue = parseFloat(editNumericEstimate);
      if (!isNaN(numericValue)) routineUpdates.numericEstimate = numericValue;
    }
    await onSaveToRoutine(task.routineId, task.name, routineUpdates);
    handleSaveEdit();
  };

  const handleCancelEdit = () => {
    setEditName(task.name);
    setEditDescription(task.description || '');
    setEditEffort(task.effort || '');
    setEditNumericEstimate(task.numericEstimate?.toString() || '');
    setIsEditModalOpen(false);
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

  const currentActivity = useCurrentActivity();
  const showLiveTimer = isActive && currentActivity?.name === task.name && currentActivity.startTime;
  const isMobile = useIsMobile();

  return (
    <div className={`
      flex items-center justify-between p-1.5 rounded-control
      hover:bg-muted/50 transition-colors
      ${isActive ? 'bg-primary/5 border-l-2 border-primary' : ''}
    `}>
      <div className="flex items-center flex-grow">
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={(checked) => {
            if (checked) {
              hapticTap();
              onComplete(task.id);
            } else {
              onUncomplete(task.id);
            }
          }}
          className="mr-3"
        />

        <div className="flex-grow">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`
              text-sm font-medium
              ${task.status === 'completed'
                ? 'line-through text-gray-500 dark:text-gray-400'
                : 'text-gray-900 dark:text-white'
              }
            `}>
              {task.name}
            </div>
            {showLiveTimer && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" aria-hidden />
                <LiveDuration startTime={currentActivity!.startTime} />
              </span>
            )}
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
          {!hideDescription && task.description && (
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
      </div>

      <div className="flex items-center gap-2 ml-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatTime(task.createdAt)}
        </span>
        {!hideActions && (dropdownOpen ? (
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setDropdownOpen((o) => !o)}
                className="text-muted-foreground"
                title="Task actions"
              >
                <DotsVerticalIcon />
              </Button>
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
                    setTimeout(() => setIsEditModalOpen(true), 0);
                  }
                }}
                className="cursor-pointer"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTimeout(() => setShowDeleteConfirm(true), 0)}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDropdownOpen(true)}
            className="text-muted-foreground"
            title="Task actions"
          >
            <DotsVerticalIcon />
          </Button>
        ))}
      </div>

      {isMobile ? (
        <Drawer open={isEditModalOpen} onOpenChange={(open) => { if (!open) handleCancelEdit(); }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Task</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Task name</label>
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-sm"
                  placeholder="Task name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Description</label>
                <Input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-xs"
                  placeholder="Description (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Effort</label>
                  <select
                    value={editEffort}
                    onChange={(e) => setEditEffort(e.target.value)}
                    className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
            </div>
            <DrawerFooter>
              <div className="flex w-full">
                <button
                  onClick={handleSaveEdit}
                  className={`min-h-[44px] flex-1 px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 ${isRoutineTask ? 'rounded-l-lg' : 'rounded-control'}`}
                >
                  Save
                </button>
                {isRoutineTask && (
                  <DropdownMenu open={saveDropdownOpen} onOpenChange={setSaveDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => setSaveDropdownOpen((o) => !o)}
                        className="min-h-[44px] px-3 bg-primary text-primary-foreground rounded-r-lg hover:opacity-90 border-l border-primary-foreground/20"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={handleSaveToRoutine}
                        disabled={descriptionWasEdited}
                        className="cursor-pointer"
                      >
                        Save to all future tasks
                        {descriptionWasEdited && (
                          <span className="text-xs text-muted-foreground ml-2">(description edited)</span>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <DrawerClose asChild>
                <Button variant="secondary" onClick={handleCancelEdit} className="w-full">
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Modal
          isOpen={isEditModalOpen}
          closeModal={handleCancelEdit}
          className="p-0 gap-0"
        >
          <div className="px-6 pt-6 pb-3">
            <Modal.Title>Edit Task</Modal.Title>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 px-6 space-y-3 pb-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Task name</label>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm"
                placeholder="Task name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <Input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-xs"
                placeholder="Description (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Effort</label>
                <select
                  value={editEffort}
                  onChange={(e) => setEditEffort(e.target.value)}
                  className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
          </div>
          <div className="px-6 pb-6 pt-3 flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <div className="flex">
              <button
                onClick={handleSaveEdit}
                className={`min-h-[44px] px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 ${isRoutineTask ? 'rounded-l-lg' : 'rounded-control'}`}
              >
                Save
              </button>
              {isRoutineTask && (
                <DropdownMenu open={saveDropdownOpen} onOpenChange={setSaveDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => setSaveDropdownOpen((o) => !o)}
                      className="min-h-[44px] px-2 bg-primary text-primary-foreground rounded-r-lg hover:opacity-90 border-l border-primary-foreground/20"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleSaveToRoutine}
                      disabled={descriptionWasEdited}
                      className="cursor-pointer"
                    >
                      Save to all future tasks
                      {descriptionWasEdited && (
                        <span className="text-xs text-muted-foreground ml-2">(description edited)</span>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showDeleteConfirm}
        closeModal={() => setShowDeleteConfirm(false)}
      >
        <Modal.Title>Delete Task</Modal.Title>
        <Modal.Body>
          Are you sure you want to delete &quot;{task.name}&quot;?
        </Modal.Body>
        <Modal.Footer>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(task.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>

          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
} 