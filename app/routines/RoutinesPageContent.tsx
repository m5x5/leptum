"use client";

import { PlusIcon, TrashIcon, CheckCircleIcon, PencilIcon, PlayIcon, DotsVerticalIcon } from "@heroicons/react/solid";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { Routine } from "../../components/Job/api";
import Modal from "../../components/Modal";
import { getDescription } from "../../utils/cron";
import { RoutineCompletion, useRoutineCompletions } from "../../utils/useRoutineCompletions";
import RoutineHeatmap from "../../components/RoutineHeatmap";
import { Goal, useGoals } from "../../utils/useGoals";
import { Input } from "../../components/ui/input";
import { GoalTrackingWidget } from "../../components/Goals/GoalTrackingWidget";
import { RichTextEditor } from "../../components/ui/rich-text-editor";
import { StreakInfo } from "../../utils/streakUtils";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { StandaloneTask } from "../../lib/remoteStorage";

// Module-level cache — persists across navigations within the same session.
// On remount the component renders immediately with stale data, then the async
// fetch updates it in the background (stale-while-revalidate).
let cachedRoutines: Routine[] | null = null;

// ---- RoutineCard (memoized — modal state changes in parent don't re-render cards) ----

interface RoutineCardProps {
  routine: Routine;
  routineCompletions: RoutineCompletion[];
  goals: Goal[];
  getStreaksForRoutine: (id: string) => StreakInfo;
  onDelete: (routine: Routine) => void;
  onEdit: (routine: Routine) => void;
  onPlay?: (routine: Routine) => void;
}

const RoutineCard = memo(function RoutineCard({
  routine,
  routineCompletions,
  goals,
  getStreaksForRoutine,
  onDelete,
  onEdit,
  onPlay,
}: RoutineCardProps) {
  const linkedGoal =
    routine.goalIds && routine.goalIds.length > 0
      ? goals.find((g) => routine.goalIds?.includes(g.id) && g.templateId && g.trackingConfig)
      : undefined;
  const streakInfo = getStreaksForRoutine(routine.id);

  return (
    <div className="bg-card border border-border rounded-lg p-4 relative flex-1 min-w-72">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">{routine.name}</h3>
          {streakInfo.currentStreak > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md text-xs font-medium border border-orange-500/20">
              🔥 {streakInfo.currentStreak}d
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onPlay && !routine.cron && (
            <button
              onClick={() => onPlay(routine)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Trigger routine"
            >
              <PlayIcon className="h-5 w-5 text-muted-foreground hover:text-green-500" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="More options">
                <DotsVerticalIcon className="h-5 w-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(routine)}>
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(routine)} className="text-destructive focus:text-destructive">
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
              {streakInfo.longestStreak > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    🏆 Best streak: {streakInfo.longestStreak} day{streakInfo.longestStreak !== 1 ? "s" : ""}
                  </DropdownMenuLabel>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {routine.cron && (
        <p className="text-sm text-muted-foreground mb-2">{getDescription(routine.cron)}</p>
      )}
      {linkedGoal && (
        <div className="mb-4">
          <GoalTrackingWidget
            goal={linkedGoal}
            onUpdate={() => window.dispatchEvent(new CustomEvent("goalUpdated"))}
            embedded={true}
            routineName={routine.name}
            showHistory={false}
            showQuickAdd={false}
          />
        </div>
      )}
      {routineCompletions.length > 0 && (
        <div className="mb-4">
          <RoutineHeatmap completions={routineCompletions} compact />
        </div>
      )}
      {(routine.tasks?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircleIcon className="h-4 w-4" />
          {routine.tasks.length} task{routine.tasks.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
});

// ---- RoutineModals (owns all modal state — changes here don't re-render the card list) ----

export interface RoutineModalsHandle {
  openCreate: () => void;
  openEdit: (routine: Routine) => void;
  openDelete: (routine: Routine) => void;
}

interface RoutineModalsProps {
  goals: Goal[];
  routineCount: number;
  onCreated: (routine: Routine) => void;
  onUpdated: (routine: Routine) => void;
  onDeleted: (routineId: string) => void;
}

const emptyForm = {
  name: "",
  cron: "",
  description: "",
  goalIds: [] as string[],
  tasks: [] as string[],
  newTask: "",
};

const RoutineModals = forwardRef<RoutineModalsHandle, RoutineModalsProps>(
  function RoutineModals({ goals, routineCount, onCreated, onUpdated, onDeleted }, ref) {
    const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState(emptyForm);

    useImperativeHandle(ref, () => ({
      openCreate: () => {
        setFormData(emptyForm);
        setShowCreateModal(true);
      },
      openEdit: (routine: Routine) => {
        setSelectedRoutine(routine);
        const goalIds = routine.goalIds || (routine.goalId ? [routine.goalId] : []);
        setFormData({
          name: routine.name,
          cron: routine.cron || "",
          description: routine.description || "",
          goalIds,
          tasks: (routine.tasks ?? []).map((t) => t.name),
          newTask: "",
        });
        setShowEditModal(true);
      },
      openDelete: (routine: Routine) => {
        setSelectedRoutine(routine);
        setShowDeleteModal(true);
      },
    }), []);

    const createRoutine = async () => {
      if (!formData.name) {
        alert("Please enter a routine name");
        return;
      }
      const id = `routine-${Date.now()}`;
      const newRoutine: Routine = {
        id,
        name: formData.name,
        cron: formData.cron || undefined,
        status: formData.cron ? "pending" : undefined,
        index: routineCount,
        description: formData.description.trim() || undefined,
        goalIds: formData.goalIds.length > 0 ? formData.goalIds : undefined,
        tasks: formData.tasks.map((taskName, index) => ({
          id: `task-${Date.now()}-${index}`,
          name: taskName,
          routineId: id,
          index,
          status: "pending",
        })),
      };
      await remoteStorageClient.saveRoutine(newRoutine);
      onCreated(newRoutine);
      setShowCreateModal(false);
      setFormData(emptyForm);
    };

    const updateRoutine = async () => {
      if (!selectedRoutine) return;
      const updatedRoutine: Routine = {
        ...selectedRoutine,
        name: formData.name,
        cron: formData.cron || undefined,
        description: formData.description.trim() || undefined,
        goalIds: formData.goalIds.length > 0 ? formData.goalIds : undefined,
        tasks: formData.tasks.map((taskName, index) => {
          const existingTask = selectedRoutine.tasks.find((t) => t.name === taskName);
          return existingTask || {
            id: `task-${Date.now()}-${index}`,
            name: taskName,
            routineId: selectedRoutine.id,
            index,
            status: "pending",
          };
        }),
      };
      await remoteStorageClient.saveRoutine(updatedRoutine);
      onUpdated(updatedRoutine);
      setShowEditModal(false);
      setSelectedRoutine(null);
      setFormData(emptyForm);
    };

    const deleteRoutine = async () => {
      if (!selectedRoutine) {
        setShowDeleteModal(false);
        return;
      }
      try {
        await remoteStorageClient.deleteRoutine(selectedRoutine.id);
        try {
          const completions = await remoteStorageClient.getRoutineCompletions();
          const filtered = completions.filter((c) => c.routineId !== selectedRoutine.id);
          await remoteStorageClient.saveRoutineCompletions(filtered);
        } catch (err) {
          console.error("Failed to delete routine completions:", err);
        }
        onDeleted(selectedRoutine.id);
        setShowDeleteModal(false);
        setShowEditModal(false);
        setSelectedRoutine(null);
        window.dispatchEvent(new CustomEvent("tasksUpdated"));
        window.dispatchEvent(new CustomEvent("goalUpdated"));
      } catch (error) {
        console.error("Failed to delete routine:", error);
        alert(`Failed to delete routine: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };

    const addTaskToForm = () => {
      if (!formData.newTask.trim()) return;
      setFormData({ ...formData, tasks: [...formData.tasks, formData.newTask.trim()], newTask: "" });
    };

    const removeTaskFromForm = (index: number) => {
      setFormData({ ...formData, tasks: formData.tasks.filter((_, i) => i !== index) });
    };

    return (
      <>
        {/* Create/Edit Modal */}
        <Modal
          isOpen={showCreateModal || showEditModal}
          closeModal={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedRoutine(null);
          }}
        >
          <Modal.Title>{showEditModal ? "Edit Routine" : "Create Routine"}</Modal.Title>
          <Modal.Body>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Routine Name
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Routine, Workout..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Describe your routine and what it helps you achieve..."
                  minHeight="120px"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Schedule (optional)
                </label>
                <Input
                  type="text"
                  value={formData.cron}
                  onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                  placeholder="0 8 * * * (CRON expression) - leave empty for no schedule"
                />
                {formData.cron && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {getDescription(formData.cron) || "Invalid CRON expression"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Goals (optional) - Select multiple
                </label>
                <select
                  multiple
                  value={formData.goalIds}
                  onChange={(e) => {
                    const selectedIds = Array.from(e.target.selectedOptions, (option) => option.value);
                    setFormData({ ...formData, goalIds: selectedIds });
                  }}
                  className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none min-h-[100px]"
                  size={Math.min(goals.length + 1, 6)}
                >
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
                {formData.goalIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.goalIds.map((goalId) => {
                      const goal = goals.find((g) => g.id === goalId);
                      return goal ? (
                        <span
                          key={goalId}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1"
                        >
                          {goal.name}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                goalIds: formData.goalIds.filter((id) => id !== goalId),
                              })
                            }
                            className="hover:text-primary/70"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Hold Ctrl/Cmd to select multiple goals
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tasks</label>
                <div className="space-y-2">
                  {formData.tasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-grow px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                        {task}
                      </span>
                      <button
                        onClick={() => removeTaskFromForm(index)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={formData.newTask}
                      onChange={(e) => setFormData({ ...formData, newTask: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addTaskToForm()}
                      placeholder="Add a task..."
                      className="grow"
                    />
                    <button
                      onClick={addTaskToForm}
                      className="p-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-2 justify-between">
              {showEditModal && (
                <button
                  onClick={() => { setShowEditModal(false); setShowDeleteModal(true); }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 font-semibold"
                >
                  Delete
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedRoutine(null);
                  }}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  onClick={showEditModal ? updateRoutine : createRoutine}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
                >
                  {showEditModal ? "Save Changes" : "Create Routine"}
                </button>
              </div>
            </div>
          </Modal.Footer>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} closeModal={() => setShowDeleteModal(false)}>
          <Modal.Title>Delete Routine</Modal.Title>
          <Modal.Body>
            <p className="text-foreground">
              Are you sure you want to delete &quot;{selectedRoutine?.name || "this routine"}&quot;?
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Note: Tasks created from this routine will be kept, but routine completions will be removed.
              </span>
            </p>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
              >
                Cancel
              </button>
              <button
                onClick={deleteRoutine}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 font-semibold"
              >
                Delete
              </button>
            </div>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
);

// ---- Page ----

export default function RoutinesPageContent() {
  const [routines, setRoutines] = useState<Routine[]>(() => cachedRoutines ?? []);
  const modalsRef = useRef<RoutineModalsHandle>(null);
  const { completions, getStreaksForRoutine, reload: reloadCompletions } = useRoutineCompletions();
  const { goals, reload: reloadGoals } = useGoals();

  useEffect(() => {
    const handleGoalUpdate = () => reloadGoals();
    window.addEventListener("goalUpdated", handleGoalUpdate);
    return () => window.removeEventListener("goalUpdated", handleGoalUpdate);
  }, [reloadGoals]);

  useEffect(() => {
    loadRoutines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleOpenCreateRoutine = () => modalsRef.current?.openCreate();
    window.addEventListener("openCreateRoutine", handleOpenCreateRoutine);
    return () => window.removeEventListener("openCreateRoutine", handleOpenCreateRoutine);
  }, []);

  const loadRoutines = async () => {
    try {
      const loaded = await remoteStorageClient.getRoutines();
      const valid = (loaded as Routine[]).filter((r) => r?.id && r?.name);
      const sorted = valid.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      cachedRoutines = sorted;
      setRoutines(sorted);
    } catch (error) {
      console.error("Failed to load routines:", error);
    }
  };

  const handleDelete = useCallback((routine: Routine) => {
    modalsRef.current?.openDelete(routine);
  }, []);

  const handleEdit = useCallback((routine: Routine) => {
    modalsRef.current?.openEdit(routine);
  }, []);

  const handlePlay = useCallback(async (routine: Routine) => {
    const routineInstanceId = `${routine.id}-manual-${Date.now()}`;
    const tasks = routine.tasks ?? [];

    for (const task of tasks) {
      const standaloneTask: StandaloneTask = {
        id: uuidv4(),
        name: task.name,
        status: "due",
        createdAt: Date.now(),
        routineId: routine.id,
        routineInstanceId,
      };
      await remoteStorageClient.addStandaloneTask(standaloneTask);
    }

    window.dispatchEvent(new CustomEvent("tasksUpdated"));
    toast.success(`Added ${tasks.length} task${tasks.length !== 1 ? "s" : ""} from "${routine.name}"`);
  }, []);

  const completionsByRoutine = useMemo(() => {
    const map = new Map<string, RoutineCompletion[]>();
    for (const c of completions) {
      const arr = map.get(c.routineId);
      if (arr) arr.push(c);
      else map.set(c.routineId, [c]);
    }
    return map;
  }, [completions]);

  const scheduledRoutines = routines.filter((r) => r.cron);
  const unscheduledRoutines = routines.filter((r) => !r.cron);

  return (
    <>
      {/* Mobile New Routine Button */}
      <button
        onClick={() => modalsRef.current?.openCreate()}
        className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
      >
        <PlusIcon className="w-5 h-5" />
        <span>New Routine</span>
      </button>

      {/* Scheduled Routines */}
      {scheduledRoutines.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Scheduled Routines</h2>
          <div className="flex flex-wrap gap-4">
            {scheduledRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                routineCompletions={completionsByRoutine.get(routine.id) ?? []}
                goals={goals}
                getStreaksForRoutine={getStreaksForRoutine}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unscheduled Routines */}
      {unscheduledRoutines.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Unscheduled Routines</h2>
          <div className="flex flex-wrap gap-4">
            {unscheduledRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                routineCompletions={completionsByRoutine.get(routine.id) ?? []}
                goals={goals}
                getStreaksForRoutine={getStreaksForRoutine}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onPlay={handlePlay}
              />
            ))}
          </div>
        </div>
      )}

      {routines.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground mb-4">No routines yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first routine to get started
          </p>
          <button
            onClick={() => modalsRef.current?.openCreate()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
          >
            Create Your First Routine
          </button>
        </div>
      )}

      <RoutineModals
        ref={modalsRef}
        goals={goals}
        routineCount={routines.length}
        onCreated={(r) => setRoutines((prev) => [...prev, r])}
        onUpdated={(r) => setRoutines((prev) => prev.map((x) => (x.id === r.id ? r : x)))}
        onDeleted={(id) => setRoutines((prev) => prev.filter((r) => r.id !== id))}
      />
    </>
  );
}
