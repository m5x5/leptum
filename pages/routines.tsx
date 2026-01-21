import Head from "next/head";
import { PlusIcon, TrashIcon, ClockIcon, CheckCircleIcon, PencilIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { Routine } from "../components/Job/api";
import Modal from "../components/Modal";
import { getDescription, getPrettyTimeTillNextOccurrence } from "../utils/cron";
import { useRoutineCompletions } from "../utils/useRoutineCompletions";
import EChartsHeatmap from "../components/RoutineHeatmap/EChartsHeatmap";
import { useGoals } from "../utils/useGoals";
import { Input } from "../components/ui/input";
import { StreakBadge } from "../components/StreakBadge";

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<(Routine| any)[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cron: "",
    goalId: "",
    tasks: [] as string[],
    newTask: ""
  });

  const { completions, getStreaksForRoutine } = useRoutineCompletions();
  const { goals } = useGoals();

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      // Load routines from the new unified storage
      const loadedRoutines = await remoteStorageClient.getRoutines();

      // If no routines exist, migrate from old jobs and stacks
      if (loadedRoutines.length === 0) {
        await migrateFromOldData();
      } else {
        setRoutines((loadedRoutines as Routine[]).sort((a, b) => a.index - b.index));
      }
    } catch (error) {
      console.error("Failed to load routines:", error);
    }
  };

  const migrateFromOldData = async () => {
    try {
      // Migrate from Jobs (scheduled routines with tasks)
      const oldJobs = await remoteStorageClient.getJobs();
      const oldStacks = await remoteStorageClient.getStacks();

      const migratedRoutines: Routine[] = [];
      let index = 0;

      // Convert jobs to routines
      for (const job of oldJobs as any[]) {
        const routine: Routine = {
          id: job.id || `routine-${Date.now()}-${index}`,
          name: job.name || getDescription(job.cron) || "Untitled Routine",
          cron: job.cron,
          status: job.status || "pending",
          lastEndTime: job.lastEndTime,
          index: index++,
          tasks: (job.habits || []).map((habit: any, taskIndex: number) => ({
            id: habit.id || `task-${Date.now()}-${taskIndex}`,
            name: habit.name,
            routineId: job.id,
            index: taskIndex,
            status: habit.status || "pending",
            description: habit.description,
            completedAt: habit.completedAt
          }))
        };
        migratedRoutines.push(routine);
        await remoteStorageClient.saveRoutine(routine);
      }

      // Convert stacks to routines (without CRON)
      for (const stack of oldStacks as any[]) {
        const routine: Routine = {
          id: `routine-${Date.now()}-${index}`,
          name: stack.name,
          index: index++,
          tasks: (stack.habits || []).map((habit: any, taskIndex: number) => ({
            id: habit.id || `task-${Date.now()}-${taskIndex}`,
            name: habit.name,
            routineId: `routine-${Date.now()}-${index}`,
            index: taskIndex,
            status: "pending"
          }))
        };
        migratedRoutines.push(routine);
        await remoteStorageClient.saveRoutine(routine);
      }

      setRoutines(migratedRoutines);
    } catch (error) {
      console.error("Failed to migrate old data:", error);
    }
  };

  const createRoutine = async () => {
    if (!formData.name) {
      alert("Please enter a routine name");
      return;
    }

    const newRoutine: Routine = {
      id: `routine-${Date.now()}`,
      name: formData.name,
      cron: formData.cron || undefined,
      status: formData.cron ? "pending" : undefined,
      index: routines.length,
      goalId: formData.goalId || undefined,
      tasks: formData.tasks.map((taskName, index) => ({
        id: `task-${Date.now()}-${index}`,
        name: taskName,
        routineId: `routine-${Date.now()}`,
        index,
        status: "pending"
      }))
    };

    await remoteStorageClient.saveRoutine(newRoutine);
    setRoutines([...routines, newRoutine]);
    setShowCreateModal(false);
    setFormData({ name: "", cron: "", goalId: "", tasks: [], newTask: "" });
  };

  const updateRoutine = async () => {
    if (!selectedRoutine) return;

    const updatedRoutine: Routine = {
      ...selectedRoutine,
      name: formData.name,
      cron: formData.cron || undefined,
      goalId: formData.goalId || undefined,
      tasks: formData.tasks.map((taskName, index) => {
        const existingTask = selectedRoutine.tasks.find(t => t.name === taskName);
        return existingTask || {
          id: `task-${Date.now()}-${index}`,
          name: taskName,
          routineId: selectedRoutine.id,
          index,
          status: "pending"
        };
      })
    };

    await remoteStorageClient.saveRoutine(updatedRoutine);
    setRoutines(routines.map(r => r.id === updatedRoutine.id ? updatedRoutine : r));
    setShowEditModal(false);
    setSelectedRoutine(null);
    setFormData({ name: "", cron: "", goalId: "", tasks: [], newTask: "" });
  };

  const deleteRoutine = async () => {
    if (!selectedRoutine) return;

    await remoteStorageClient.deleteRoutine(selectedRoutine.id);
    setRoutines(routines.filter(r => r.id !== selectedRoutine.id));
    setShowDeleteModal(false);
    setShowEditModal(false);
    setSelectedRoutine(null);
  };

  const openCreateModal = () => {
    setFormData({ name: "", cron: "", goalId: "", tasks: [], newTask: "" });
    setShowCreateModal(true);
  };

  const openEditModal = (routine: Routine) => {
    setSelectedRoutine(routine);
    setFormData({
      name: routine.name,
      cron: routine.cron || "",
      goalId: routine.goalId || "",
      tasks: routine.tasks.map(t => t.name),
      newTask: ""
    });
    setShowEditModal(true);
  };

  const addTaskToForm = () => {
    if (!formData.newTask.trim()) return;
    setFormData({
      ...formData,
      tasks: [...formData.tasks, formData.newTask.trim()],
      newTask: ""
    });
  };

  const removeTaskFromForm = (index: number) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index)
    });
  };

  const scheduledRoutines = routines.filter(r => r.cron);
  const unscheduledRoutines = routines.filter(r => !r.cron);

  return (
    <>
      <Head>
        <title>Routines - Leptum</title>
      </Head>

      <div className="max-w-4xl mx-auto pb-32 md:pb-8">
        <div className="flex flex-row w-full justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Routines</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your routines and tasks - add schedules optionally
            </p>
          </div>
          {/* Desktop New Routine Button */}
          <button
            onClick={openCreateModal}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Routine</span>
          </button>
        </div>

        {/* Mobile New Routine Button */}
        <button
          onClick={openCreateModal}
          className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Routine</span>
        </button>



        {/* Scheduled Routines */}
        {scheduledRoutines.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Scheduled Routines
            </h2>
            <div className="space-y-3">
              {scheduledRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="bg-card border border-border rounded-lg p-4 relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{routine.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full">
                        {getPrettyTimeTillNextOccurrence(routine.cron!)}
                      </span>
                      <button
                        onClick={() => openEditModal(routine)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        aria-label="Edit routine"
                      >
                        <PencilIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {getDescription(routine.cron!)}
                  </p>

                  {completions.some(c => c.routineId === routine.id) && (
                    <div className="mb-4">
                      <EChartsHeatmap
                        completions={completions}
                        routineId={routine.id}
                        months={12}
                      />
                    </div>
                  )}
                  <StreakBadge streakInfo={getStreaksForRoutine(routine.id)} className="mb-4" />

                  {routine.tasks.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircleIcon className="h-4 w-4" />
                      {routine.tasks.length} task{routine.tasks.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unscheduled Routines */}
        {unscheduledRoutines.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Unscheduled Routines
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unscheduledRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="bg-card border border-border rounded-lg p-4 relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{routine.name}</h3>
                    <button
                      onClick={() => openEditModal(routine)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      aria-label="Edit routine"
                    >
                      <PencilIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>

                  {completions.some(c => c.routineId === routine.id) && (
                    <div className="mb-4">
                      <EChartsHeatmap
                        completions={completions}
                        routineId={routine.id}
                        months={12}
                      />
                    </div>
                  )}
                  <StreakBadge streakInfo={getStreaksForRoutine(routine.id)} className="mb-4" />

                  {routine.tasks.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircleIcon className="h-4 w-4" />
                      {routine.tasks.length} task{routine.tasks.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
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
              onClick={openCreateModal}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
            >
              Create Your First Routine
            </button>
          </div>
        )}

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
                  Goal (optional)
                </label>
                <select
                  value={formData.goalId}
                  onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                  className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
                >
                  <option value="">No goal</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tasks
                </label>
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
                      onKeyPress={(e) => e.key === 'Enter' && addTaskToForm()}
                      placeholder="Add a task..."
                      className="flex-grow"
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
                  onClick={() => setShowDeleteModal(true)}
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
        <Modal
          isOpen={showDeleteModal}
          closeModal={() => setShowDeleteModal(false)}
        >
          <Modal.Title>Delete Routine</Modal.Title>
          <Modal.Body>
            <p className="text-foreground">
              Are you sure you want to delete "{selectedRoutine?.name}"? All tasks in this routine will be deleted.
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
      </div>
    </>
  );
}
