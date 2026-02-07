"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useRef } from "react";
import { PlusIcon, PlayIcon, CheckCircleIcon, ArchiveIcon, XIcon } from "@heroicons/react/solid";
import { useStandaloneTasks } from "./StandaloneTasksContext";
import type { StandaloneTask } from "../utils/useStandaloneTasks";
import { useRoutineScheduler } from "../utils/useRoutineScheduler";
import { remoteStorageClient } from "../lib/remoteStorage";
import { Routine } from "../components/Job/api";
import StandaloneTaskItem from "../components/Tasks/StandaloneItem";
import { getDescription, getPrettyTimeTillNextOccurrence, getNextOccurrence } from "../utils/cron";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import { GoalTrackingWidget } from "../components/Goals/GoalTrackingWidget";
import Modal from "../components/Modal";
import { Input } from "../components/ui/input";
import TaskCompletionModal from "../components/Modal/TaskCompletionModal";
import { Emotion } from "../components/ui/emotion-selector";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import { HighlightedMentions } from "../components/ui/mention-input";
import OnboardingModal from "../components/Modal/OnboardingModal";
import QuickCapture from "../components/QuickCapture/QuickCapture";
import { useCurrentActivity } from "../components/CurrentActivityContext";
import { v4 as uuidv4 } from "uuid";

// Format duration in human readable form
function formatDurationStatic(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Self-contained timer component to avoid re-rendering the entire page every second
function LiveDuration({ baseMs = 0, startTime }: { baseMs?: number; startTime?: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!startTime) return; // No interval needed if no live tracking
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const liveOffset = startTime ? now - startTime : 0;
  return <>{formatDurationStatic(baseMs + liveOffset)}</>;
}

export default function Home() {
  const {
    tasks: standaloneTasks,
    loading: tasksLoading,
    addTask: addStandaloneTask,
    updateTask: updateStandaloneTask,
    deleteTask: deleteStandaloneTask,
    completeTask: completeStandaloneTask,
    uncompleteTask: uncompleteStandaloneTask,
    archiveDay,
    reload: reloadTasks
  } = useStandaloneTasks();

  // Enable routine scheduler; pass context tasks so it doesn't refetch when already loaded
  useRoutineScheduler(() => reloadTasks(), {
    currentTasks: standaloneTasks,
    tasksLoading,
  });

  const { goals, reload: loadGoals } = useGoals({ loadOnMount: false });
  const { goalTypes, reload: loadGoalTypes } = useGoalTypes({ loadOnMount: false });

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [activeTaskStartTime, setActiveTaskStartTime] = useState<number | null>(null);
  const [showPastActivity, setShowPastActivity] = useState(false);
  const [showArchiveSheet, setShowArchiveSheet] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMobileTaskDrawer, setShowMobileTaskDrawer] = useState(false);
  const [showStartTaskModal, setShowStartTaskModal] = useState(false);
  const [showMobileStartTaskDrawer, setShowMobileStartTaskDrawer] = useState(false);
  const [taskToStart, setTaskToStart] = useState<string>("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<StandaloneTask[]>([]);
  const [archivedBucketIds, setArchivedBucketIds] = useState<string[]>([]);
  const [loadedArchiveBuckets, setLoadedArchiveBuckets] = useState(0);
  const [editingTask, setEditingTask] = useState<StandaloneTask | null>(null);

  // Use refs for form inputs instead of state for better performance
  const taskNameRef = useRef<HTMLInputElement>(null);
  const taskDescriptionRef = useRef<HTMLInputElement>(null);
  const taskEffortRef = useRef<HTMLSelectElement>(null);
  const taskNumericEstimateRef = useRef<HTMLInputElement>(null);
  const selectedGoalRef = useRef<HTMLSelectElement>(null);
  const routinesSectionRef = useRef<HTMLDivElement>(null);
  const statsSectionRef = useRef<HTMLDivElement>(null);

  const currentActivity = useCurrentActivity();

  const loadRoutines = useCallback(async () => {
    try {
      const loadedRoutines = await remoteStorageClient.getRoutines();
      const list = (loadedRoutines as Routine[]).filter(r => r.cron).sort((a, b) => a.index - b.index);
      setRoutines(list);
    } catch (error) {
      console.error("Failed to load routines:", error);
    }
  }, []);

  // Show Up: tick "showed up" for today. Fetches routine + completions in parallel.
  const initShowUpRoutineOnce = async () => {
    if (typeof window === "undefined") return;
    const today = new Date().toISOString().split("T")[0];
    if (localStorage.getItem("leptum_show_up_date") === today) return;
    try {
      const [showUpRaw, completions] = await Promise.all([
        remoteStorageClient.getRoutine("show-up-routine"),
        remoteStorageClient.getRoutineCompletions(),
      ]);
      let showUp = showUpRaw;
      if (!showUp) {
        showUp = {
          id: "show-up-routine",
          name: "Show Up",
          cron: "0 0 * * *",
          status: "pending",
          index: 999,
          isShowUpRoutine: true,
          tasks: [],
        } as Routine;
        await remoteStorageClient.saveRoutine(showUp);
      }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const completedToday = (completions as { routineId: string; completedAt: number }[]).some(
        (c) => c.routineId === (showUp as any).id && c.completedAt >= todayStart.getTime()
      );
      if (!completedToday) {
        await remoteStorageClient.addRoutineCompletion({
          routineId: (showUp as any).id,
          routineInstanceId: `${(showUp as any).id}-${Date.now()}`,
          routineName: (showUp as any).name,
          completedAt: Date.now(),
          taskCount: 0,
        });
      }
      localStorage.setItem("leptum_show_up_date", today);
    } catch (e) {
      console.error("Show Up init:", e);
    }
  };

  // Show Up: tick once per day on homepage visit. Only fetches getRoutine('show-up-routine') + getRoutineCompletions (no full routines list).
  useEffect(() => {
    initShowUpRoutineOnce();
  }, []);

  // Load routines only when Upcoming Routines section is in view (desktop) or when onboarding needs them
  useEffect(() => {
    const el = routinesSectionRef.current;
    if (!el || typeof window === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && window.innerWidth >= 768) {
          loadRoutines();
          loadGoals();
          loadGoalTypes();
        }
      },
      { rootMargin: "100px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadRoutines, loadGoals, loadGoalTypes]);

  // When stats section (Today's Progress) is in view, load goals so we can show goal names
  useEffect(() => {
    const el = statsSectionRef.current;
    if (!el || typeof window === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadGoals();
          loadGoalTypes();
        }
      },
      { rootMargin: "100px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadGoals, loadGoalTypes]);

  // Reload routines when goals are updated (for tracking widgets)
  useEffect(() => {
    const handleGoalUpdate = () => {
      console.log("Goal updated, reloading routines");
      loadRoutines();
    };
    window.addEventListener('goalUpdated', handleGoalUpdate);
    return () => window.removeEventListener('goalUpdated', handleGoalUpdate);
  }, [loadRoutines]);

  // Listen for openTaskForm event from header button
  useEffect(() => {
    const handleOpenTaskForm = () => {
      setEditingTask(null);
      setShowTaskForm(true);
    };
    window.addEventListener('openTaskForm', handleOpenTaskForm);
    return () => {
      window.removeEventListener('openTaskForm', handleOpenTaskForm);
    };
  }, []);

  // Populate task form when editing: refs are only attached after the form mounts, so set values in an effect.
  useEffect(() => {
    if (!editingTask) return;
    const visible = showTaskForm || showMobileTaskDrawer;
    if (!visible) return;
    const id = requestAnimationFrame(() => {
      if (taskNameRef.current) taskNameRef.current.value = editingTask.name;
      if (taskDescriptionRef.current) taskDescriptionRef.current.value = editingTask.description ?? "";
      if (taskEffortRef.current) taskEffortRef.current.value = editingTask.effort ?? "";
      if (taskNumericEstimateRef.current) {
        taskNumericEstimateRef.current.value =
          editingTask.numericEstimate !== undefined ? String(editingTask.numericEstimate) : "";
      }
    });
    return () => cancelAnimationFrame(id);
  }, [editingTask, showTaskForm, showMobileTaskDrawer]);

  // Vaul drawer can leave body (and sometimes html) styles after close; reset so the page is scrollable and clickable again.
  useEffect(() => {
    if (showMobileTaskDrawer) return;
    const id = setTimeout(() => {
      if (typeof document === "undefined") return;
      const body = document.body;
      const html = document.documentElement;
      body.style.removeProperty("overflow");
      body.style.removeProperty("pointer-events");
      body.style.removeProperty("touch-action");
      body.style.removeProperty("position");
      body.style.removeProperty("top");
      body.style.removeProperty("left");
      body.style.removeProperty("right");
      body.style.removeProperty("height");
      body.style.removeProperty("background");
      html.style.removeProperty("overflow");
      html.style.removeProperty("pointer-events");
      // Remove any leftover Vaul overlay that might be blocking (e.g. pointer-events still active)
      document.querySelectorAll("[data-vaul-overlay]").forEach((el) => {
        (el as HTMLElement).style.pointerEvents = "none";
      });
    }, 350);
    return () => clearTimeout(id);
  }, [showMobileTaskDrawer]);

  // Show onboarding only when tasks have loaded and are empty (no goals/routines fetch for this).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("leptum_onboarding_completed")) {
      setShowOnboarding(false);
      return;
    }
    if (!tasksLoading && standaloneTasks.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [tasksLoading, standaloneTasks.length]);

  // Load archived buckets only when user opens the archive view.
  // Start with the latest bucket; allow loading older ones on demand.
  useEffect(() => {
    if (!showArchiveSheet || typeof window === "undefined") return;
    let cancelled = false;
    const loadInitialArchive = async () => {
      try {
        const { bucketIds } = await remoteStorageClient.getArchivedIndex();
        if (cancelled) return;
        setArchivedBucketIds(bucketIds);
        if (bucketIds.length === 0) {
          setArchivedTasks([]);
          setLoadedArchiveBuckets(0);
          return;
        }
        const latestId = bucketIds[bucketIds.length - 1];
        const bucket = await remoteStorageClient.getArchivedBucket(latestId);
        if (cancelled) return;
        if (bucket) {
          setArchivedTasks(bucket.tasks);
          setLoadedArchiveBuckets(1);
        } else {
          setArchivedTasks([]);
          setLoadedArchiveBuckets(0);
        }
      } catch (error) {
        console.error("Failed to load archived tasks:", error);
        if (!cancelled) {
          setArchivedTasks([]);
          setArchivedBucketIds([]);
          setLoadedArchiveBuckets(0);
        }
      }
    };
    loadInitialArchive();
    return () => { cancelled = true; };
  }, [showArchiveSheet]);

  const handleArchiveDay = async (dateKey: string) => {
    await archiveDay(dateKey);
    try {
      const { bucketIds } = await remoteStorageClient.getArchivedIndex();
      setArchivedBucketIds(bucketIds);
      if (bucketIds.length === 0) {
        setArchivedTasks([]);
        setLoadedArchiveBuckets(0);
        return;
      }
      const latestId = bucketIds[bucketIds.length - 1];
      const bucket = await remoteStorageClient.getArchivedBucket(latestId);
      if (bucket) {
        setArchivedTasks(bucket.tasks);
        setLoadedArchiveBuckets(1);
      } else {
        setArchivedTasks([]);
        setLoadedArchiveBuckets(0);
      }
    } catch (error) {
      console.error("Failed to refresh archived tasks after archiving day:", error);
    }
  };

  const handleLoadMoreArchive = async () => {
    if (archivedBucketIds.length <= loadedArchiveBuckets) return;
    const nextIndex = archivedBucketIds.length - 1 - loadedArchiveBuckets;
    if (nextIndex < 0) return;
    try {
      const nextId = archivedBucketIds[nextIndex];
      const bucket = await remoteStorageClient.getArchivedBucket(nextId);
      if (bucket && bucket.tasks?.length) {
        setArchivedTasks(prev => [...prev, ...bucket.tasks]);
      }
      setLoadedArchiveBuckets(prev => prev + 1);
    } catch (error) {
      console.error("Failed to load older archived tasks:", error);
    }
  };

  const openStartTaskModal = (taskName: string) => {
    setTaskToStart(taskName);
    loadGoals();
    loadGoalTypes();
    // Reset the goal selection when opening the modal
    setTimeout(() => {
      if (selectedGoalRef.current) {
        selectedGoalRef.current.value = "";
      }
    }, 0);
    if (window.innerWidth < 768) {
      setShowMobileStartTaskDrawer(true);
    } else {
      setShowStartTaskModal(true);
    }
  };

  const startTask = async (taskName: string, goalId?: string) => {
    // Stop previous task if any
    if (activeTask) {
      await stopTask();
    }

    setActiveTask(taskName);
    setActiveTaskStartTime(Date.now());

    // Log to impacts
    try {
      const impacts = await remoteStorageClient.getImpacts();
      const newImpact: any = {
        activity: taskName,
        date: Date.now()
      };
      if (goalId) {
        newImpact.goalId = goalId;
      }
      impacts.push(newImpact);
      await remoteStorageClient.saveImpacts(impacts);
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    setShowStartTaskModal(false);
    setShowMobileStartTaskDrawer(false);
  };

  const handleStartTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    const goalId = selectedGoalRef.current?.value;
    startTask(taskToStart, goalId || undefined);
  };

  // State for emotion modal (shown when user clicks toast)
  const [showEmotionModal, setShowEmotionModal] = useState(false);
  const [showMobileEmotionDrawer, setShowMobileEmotionDrawer] = useState(false);
  const [completedTaskForEmotions, setCompletedTaskForEmotions] = useState<{ id: string; name: string } | null>(null);

  // Handle task completion - complete immediately and show toast
  const handleTaskComplete = (taskId: string) => {
    const task = standaloneTasks.find(t => t.id === taskId);
    if (task) {
      // Complete the task immediately without emotions
      completeStandaloneTask(taskId, []);

      // Show toast - clicking it opens the emotion modal
      toast.success(`"${task.name}" completed`, {
        duration: 5000,
        action: {
          label: "Add feeling",
          onClick: () => {
            setCompletedTaskForEmotions({ id: taskId, name: task.name });
            if (window.innerWidth < 768) {
              setShowMobileEmotionDrawer(true);
            } else {
              setShowEmotionModal(true);
            }
          },
        },
      });
    }
  };

  const handleCompleteWithEmotions = (emotions: Emotion[]) => {
    if (completedTaskForEmotions) {
      updateStandaloneTask(completedTaskForEmotions.id, { emotions });
      setCompletedTaskForEmotions(null);
    }
  };

  const StartTaskForm = ({ onCancel }: { onCancel: () => void }) => (
    <form onSubmit={handleStartTask} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Activity
        </label>
        <p className="text-lg font-medium text-foreground px-3 py-2 bg-muted rounded-lg">
          {taskToStart}
        </p>
      </div>

      {/* Goal Selection */}
      {goals && goals.length > 0 && (
        <div>
          <label htmlFor="goal-selection" className="block text-sm font-medium text-foreground mb-2">
            Related Goal <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <select
            ref={selectedGoalRef}
            id="goal-selection"
            className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
            defaultValue=""
          >
            <option value="">No goal</option>
            {goalTypes && goalTypes.map((goalType) => {
              const typeGoals = goals.filter((g) => g.type === goalType.id);
              if (typeGoals.length === 0) return null;
              return (
                <optgroup key={goalType.id} label={goalType.name}>
                  {typeGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      )}

      {goals && goals.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No goals available. <Link href="/goals" className="text-primary hover:underline">Create goals</Link> to track progress.
        </p>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold flex items-center gap-2"
        >
          <PlayIcon className="h-5 w-5" />
          Start
        </button>
      </div>
    </form>
  );

  const stopTask = async () => {
    if (!activeTask) return;

    setActiveTask(null);
    setActiveTaskStartTime(null);
  };

  const handleCreateTask = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const name = taskNameRef.current?.value.trim();
    const description = taskDescriptionRef.current?.value.trim();
    const effort = taskEffortRef.current?.value;
    const numericEstimateStr = taskNumericEstimateRef.current?.value.trim();

    if (!name) return;

    const options: { effort?: 'XS' | 'S' | 'M' | 'L' | 'XL', numericEstimate?: number } = {};

    if (effort) {
      options.effort = effort as 'XS' | 'S' | 'M' | 'L' | 'XL';
    }

    if (numericEstimateStr) {
      const numericValue = parseFloat(numericEstimateStr);
      if (!isNaN(numericValue)) {
        options.numericEstimate = numericValue;
      }
    }

    try {
      if (editingTask) {
        const updates: Partial<StandaloneTask> = {
          name,
          description
        };
        if (options.effort !== undefined) {
          updates.effort = options.effort;
        }
        if (options.numericEstimate !== undefined) {
          updates.numericEstimate = options.numericEstimate;
        }
        await updateStandaloneTask(editingTask.id, updates);
      } else {
        await addStandaloneTask(name, description || "", Object.keys(options).length > 0 ? options : undefined);
      }
    } catch (error) {
      console.error("Failed to save task:", error);
    }

    // Clear the input refs
    if (taskNameRef.current) taskNameRef.current.value = "";
    if (taskDescriptionRef.current) taskDescriptionRef.current.value = "";
    if (taskEffortRef.current) taskEffortRef.current.value = "";
    if (taskNumericEstimateRef.current) taskNumericEstimateRef.current.value = "";
    if (selectedGoalRef.current) selectedGoalRef.current.value = "";

    setEditingTask(null);
    setShowTaskForm(false);
    setShowMobileTaskDrawer(false);
  };

  const handleOnboardingComplete = async (sampleData: {
    goal: { name: string; color: string; description: string };
    task: { name: string; description: string };
    routine: { name: string; cron: string; tasks: string[] };
    impact: { activity: string; date: number };
  }) => {
    try {
      // 1. Create goal type first
      const goalTypeId = uuidv4();
      await remoteStorageClient.saveGoalType({
        id: goalTypeId,
        name: "Personal Growth",
        description: "Goals related to self-improvement and learning"
      });

      // 2. Create sample goal
      const goalId = uuidv4();
      await remoteStorageClient.saveGoal({
        id: goalId,
        name: sampleData.goal.name,
        type: goalTypeId,
        color: sampleData.goal.color,
        description: sampleData.goal.description,
        createdAt: Date.now(),
        status: 'active'
      });

      // 3. Create sample task
      await addStandaloneTask(sampleData.task.name, sampleData.task.description);

      // 4. Create sample routine
      const routineId = `routine-${Date.now()}`;
      await remoteStorageClient.saveRoutine({
        id: routineId,
        name: sampleData.routine.name,
        cron: sampleData.routine.cron,
        status: "pending",
        index: 0,
        tasks: sampleData.routine.tasks.map((taskName, index) => ({
          id: `task-${Date.now()}-${index}`,
          name: taskName,
          routineId,
          index,
          status: "pending"
        }))
      });

      // 5. Create sample timeline entry
      const impacts = await remoteStorageClient.getImpacts();
      impacts.push({
        activity: sampleData.impact.activity,
        date: sampleData.impact.date,
        goalId
      });
      await remoteStorageClient.saveImpacts(impacts);

      // Mark onboarding as completed
      localStorage.setItem('leptum_onboarding_completed', 'true');
      setShowOnboarding(false);

      // Reload data
      await loadRoutines();
      await reloadTasks();
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('leptum_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const TaskForm = () => (
    <form onSubmit={handleCreateTask} className="pt-2 space-y-3">
      <div>
        <label htmlFor="task-name" className="block text-sm font-medium text-foreground mb-2">
          Task Name
        </label>
        <Input
          ref={taskNameRef}
          id="task-name"
          type="text"
          onKeyDown={handleKeyDown}
          placeholder="Enter task name..."
          autoFocus
        />
      </div>
      <div className="pb-2">
        <label htmlFor="task-description" className="block text-sm font-medium text-foreground mb-2">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          ref={taskDescriptionRef}
          id="task-description"
          type="text"
          onKeyDown={handleKeyDown}
          placeholder="Enter description..."
        />
      </div>
      <div className="grid grid-cols-2 gap-2 pb-2">
        <div>
          <label htmlFor="task-effort" className="block text-sm font-medium text-foreground mb-2">
            Effort <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <select
            ref={taskEffortRef}
            id="task-effort"
            className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
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
          <label htmlFor="task-numeric-estimate" className="block text-sm font-medium text-foreground mb-2">
            Numeric Points <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            ref={taskNumericEstimateRef}
            id="task-numeric-estimate"
            type="number"
            onKeyDown={handleKeyDown}
            placeholder="e.g., 2.5"
            min="0"
            step="0.1"
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold mt-4"
      >
        {editingTask ? 'Save Task' : 'Add Task'}
      </button>
    </form>
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingTask(null);
      setShowTaskForm(false);
      setShowMobileTaskDrawer(false);
      // Clear the refs
      if (taskNameRef.current) taskNameRef.current.value = "";
      if (taskDescriptionRef.current) taskDescriptionRef.current.value = "";
      if (taskEffortRef.current) taskEffortRef.current.value = "";
      if (taskNumericEstimateRef.current) taskNumericEstimateRef.current.value = "";
    }
    // Enter key is now handled by form submit
  };

  const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
  const activeTasks = standaloneTasks.filter(task =>
    task.status !== 'completed' && task.createdAt > twoWeeksAgo
  );

  const groupTasksByDay = (tasks: any[]) => {
    const groups: Record<string, any[]> = {};
    
    // Sort tasks by date first (newest first)
    const sortedTasks = [...tasks].sort((a, b) => {
      const dateA = a.completedAt || a.createdAt;
      const dateB = b.completedAt || b.createdAt;
      return dateB - dateA;
    });
    
    sortedTasks.forEach(task => {
      const date = new Date(task.completedAt || task.createdAt);
      // Use YYYY-MM-DD for stable keys
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(task);
    });
    
    return groups;
  };

  const formatDateTitle = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const monthStr = date.toLocaleString('default', { month: 'short' });
    return `${monthStr} ${day}`;
  };

  const now = new Date();

  // Past = home tasks that are completed or old, plus latest archived bucket (loaded when archive sheet opens)
  const pastTasks = [...standaloneTasks.filter(task => task.status === 'completed' || task.createdAt <= twoWeeksAgo), ...archivedTasks]
    .sort((a, b) => {
      const dateA = a.completedAt || a.createdAt;
      const dateB = b.completedAt || b.createdAt;
      return dateB - dateA;
    });

  // Today's time + goal progress. Only load when Today's Progress section is in view (desktop; hidden on mobile).
  const [baseTotalTime, setBaseTotalTime] = useState(0);
  const [baseGoalProgress, setBaseGoalProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const el = statsSectionRef.current;
    if (!el || typeof window === "undefined") return;
    const run = async () => {
      try {
        const impacts = await remoteStorageClient.getImpacts();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayImpacts = impacts.filter((impact: { date: number }) => impact.date >= todayStart.getTime());
        todayImpacts.sort((a: { date: number }, b: { date: number }) => a.date - b.date);
        let totalMs = 0;
        const goalTimeMap: Record<string, number> = {};
        for (let i = 0; i < todayImpacts.length - 1; i++) {
          const timeDiff = (todayImpacts[i + 1] as { date: number }).date - (todayImpacts[i] as { date: number }).date;
          totalMs += timeDiff;
          const goalId = (todayImpacts[i] as { goalId?: string }).goalId;
          if (goalId) goalTimeMap[goalId] = (goalTimeMap[goalId] || 0) + timeDiff;
        }
        setBaseTotalTime(totalMs);
        setBaseGoalProgress(goalTimeMap);
      } catch (error) {
        console.error("Failed to calculate today's time:", error);
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) run();
      },
      { rootMargin: "100px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="max-w-6xl mx-auto pb-32 md:pb-8">
        {/* Mobile Logo - Full Leptum logo on mobile */}
        <div className="md:hidden mb-6 flex items-center justify-between">
          <Link href="/" className="inline-block">
            <span className="text-foreground text-2xl font-bold">
              <svg width="254" height="65" viewBox="0 0 254 65" xmlns="http://www.w3.org/2000/svg" className="h-6 w-auto text-black dark:text-white flex">
                <path d="M11.7188 49.0625C10.3438 49.0625 9.125 48.7292 8.0625 48.0625C7 48.7292 6.01042 49.0625 5.09375 49.0625C4.19792 49.0625 3.45833 48.9792 2.875 48.8125C2.29167 48.6667 1.78125 48.4583 1.34375 48.1875C0.447917 47.6458 0 46.9688 0 46.1562C0 45.7396 0.114583 45.375 0.34375 45.0625C0.802083 45.4167 1.38542 45.5938 2.09375 45.5938C3.94792 45.5938 5.22917 44.8021 5.9375 43.2188V27.9375C5.9375 26.9792 5.73958 26.2708 5.34375 25.8125C4.71875 25.0417 3.64583 24.2812 2.125 23.5312C3.54167 22.8854 4.45833 22.3125 4.875 21.8125C5.58333 21 5.9375 20.0833 5.9375 19.0625V5.875C5.22917 4.27083 3.94792 3.46875 2.09375 3.46875C1.38542 3.46875 0.802083 3.64583 0.34375 4C0.114583 3.6875 0 3.33333 0 2.9375C0 2.52083 0.114583 2.13542 0.34375 1.78125C0.59375 1.42708 0.927083 1.125 1.34375 0.875C2.30208 0.291667 3.39583 0 4.625 0C5.875 0 7.02083 0.34375 8.0625 1.03125C9.14583 0.34375 10.3542 0 11.6875 0C13.0208 0 14.2292 0.34375 15.3125 1.03125C16.4792 0.34375 17.5417 0 18.5 0C19.4583 0 20.2292 0.0833333 20.8125 0.25C21.3958 0.395833 21.9062 0.604167 22.3438 0.875C23.2396 1.41667 23.6875 2.09375 23.6875 2.90625C23.6875 3.32292 23.5729 3.6875 23.3438 4C22.8854 3.64583 22.2708 3.46875 21.5 3.46875C20.7292 3.46875 19.9479 3.67708 19.1562 4.09375C18.3854 4.48958 17.8125 5.09375 17.4375 5.90625V19.0625C17.4375 20.0833 17.6562 20.8438 18.0938 21.3438C18.7812 22.1562 19.8333 22.8854 21.25 23.5312C19.7292 24.2812 18.7604 24.8958 18.3438 25.375C17.7396 26.125 17.4375 26.9792 17.4375 27.9375V41.5938C18.8125 43.7812 20.5312 44.875 22.5938 44.875C27.6979 44.875 30.9792 42.7083 32.4375 38.375C33.0833 36.4583 33.4062 34.7083 33.4062 33.125C33.4062 31.5208 33.1875 30.4479 32.75 29.9062C33.2292 29.5104 33.7188 29.3125 34.2188 29.3125C34.7396 29.3125 35.2188 29.4167 35.6562 29.625C36.0938 29.8333 36.4896 30.1458 36.8438 30.5625C37.5729 31.4167 37.9375 32.4271 37.9375 33.5938C37.9375 34.7604 37.8438 35.6562 37.6562 36.2812C38.6146 37.0729 39.0938 38.1875 39.0938 39.625C39.0938 41.0625 38.6875 42.2292 37.875 43.125C38.5625 44 38.9062 44.7917 38.9062 45.5C38.9062 46.2083 38.8021 46.8229 38.5938 47.3438C38.4062 47.8438 38.1354 48.2917 37.7812 48.6875C36.9896 49.5 36.0417 49.9062 34.9375 49.9062C34.3958 49.9062 33.8958 49.7917 33.4375 49.5625C33.5208 49.1042 33.5625 48.6458 33.5625 48.1875C33.5625 47.2292 33.125 46.75 32.25 46.75C31.6042 46.75 30.7083 47.0104 29.5625 47.5312C27.3542 48.5521 24.8333 49.0625 22 49.0625C19.1875 49.0625 16.9896 48.6979 15.4062 47.9688C14.3229 48.6979 13.0938 49.0625 11.7188 49.0625ZM8.9375 40.1562C9.97917 39.7604 10.5521 38.3958 10.6562 36.0625C10.7812 33.7292 10.8438 30.5 10.8438 26.375C10.8438 22.25 10.8333 19.5104 10.8125 18.1562C10.8125 16.7812 10.8021 15.6771 10.7812 14.8438C10.7188 12.3854 10.4792 10.9062 10.0625 10.4062C9.66667 9.88542 9.29167 9.54167 8.9375 9.375C8.9375 16.625 8.8125 20.75 8.5625 21.75C8.27083 22.5833 7.5625 23.1771 6.4375 23.5312C7.6875 23.9688 8.39583 24.5 8.5625 25.125C8.8125 26.125 8.9375 29.7812 8.9375 36.0938V40.1562ZM69.4225 39C69.8808 38.125 70.7246 37.6875 71.9538 37.6875C72.7871 37.6875 73.4329 38.0312 73.8913 38.7188C74.2663 39.2604 74.4538 39.9271 74.4538 40.7188C74.4538 41.4896 74.2558 42.2708 73.86 43.0625C73.4642 43.8542 72.9225 44.5729 72.235 45.2188C71.5475 45.8646 70.7558 46.4375 69.86 46.9375C68.985 47.4375 68.0475 47.8542 67.0475 48.1875C64.985 48.875 62.8392 49.2188 60.61 49.2188C58.3808 49.2188 56.2871 48.8542 54.3288 48.125C52.3913 47.375 50.7246 46.3333 49.3288 45C46.5996 42.375 44.9329 38.7708 44.3288 34.1875C44.1829 33.1667 43.9433 32.4375 43.61 32C42.985 31.2292 41.9538 30.4896 40.5163 29.7812C42.3288 28.9688 43.485 27.6667 43.985 25.875C44.1308 25.375 44.2454 24.875 44.3288 24.375C44.8496 20.7083 46.7038 17.5833 49.8913 15C52.9746 12.5 56.4225 11.25 60.235 11.25C64.1933 11.25 67.6204 12.6458 70.5163 15.4375C73.5163 18.3125 75.0163 21.8438 75.0163 26.0312C75.0163 26.1771 75.0058 26.3229 74.985 26.4688C74.985 26.6146 74.9954 26.75 75.0163 26.875C75.0579 27.1458 75.2246 27.3021 75.5163 27.3438C75.8913 27.8229 76.0788 28.3333 76.0788 28.875C76.0788 30.125 75.4121 30.8646 74.0788 31.0938C73.7454 31.1562 73.2246 31.2396 72.5163 31.3438L54.8913 34.1562V37.1562C54.8913 39.5729 55.6204 41.4896 57.0788 42.9062C58.4538 44.2604 60.1933 44.9375 62.2975 44.9375C64.5267 44.9375 66.3183 44.4792 67.6725 43.5625C68.9433 42.6875 69.5788 41.5417 69.5788 40.125C69.5788 39.7917 69.5267 39.4167 69.4225 39ZM63.9538 28.9062V20.1562C63.9538 18.7812 63.6829 17.7708 63.1413 17.125C62.1829 16.0208 61.235 15.4688 60.2975 15.4688C59.36 15.4688 58.5788 15.6146 57.9538 15.9062C57.3288 16.1771 56.7871 16.6146 56.3288 17.2188C55.3704 18.4896 54.8913 20.4688 54.8913 23.1562V30.375L63.9538 28.9062ZM68.5788 28.125V27.1562C68.5788 23.2812 68.2558 20.9375 67.61 20.125C67.3183 19.7708 66.9954 19.5104 66.6413 19.3438V28.4375L68.5788 28.125ZM49.7975 40.1562C50.0892 39.9271 50.235 39.6667 50.235 39.375C50.235 38.9167 50.1413 38.3333 49.9538 37.625C49.0996 34.3542 48.6725 32.0833 48.6725 30.8125C48.6725 29.5208 48.7142 28.5208 48.7975 27.8125C48.8808 27.0833 48.9954 26.3542 49.1413 25.625C49.3913 24.2083 49.6621 22.9583 49.9538 21.875C50.1413 21.1667 50.235 20.6875 50.235 20.4375C50.235 19.9375 50.0892 19.5729 49.7975 19.3438C48.9225 20.3854 48.2558 21.7812 47.7975 23.5312C47.3392 25.2812 46.9642 26.8229 46.6725 28.1562C46.5683 28.7188 45.9538 29.2604 44.8288 29.7812C45.9538 30.3021 46.5683 30.8229 46.6725 31.3438C47.4433 34.8646 48.0788 37.1042 48.5788 38.0625C49.0788 39.0208 49.485 39.7188 49.7975 40.1562ZM85.3763 63.3438C84.4388 64.0312 83.3554 64.375 82.1263 64.375C80.8971 64.375 79.9804 64.1042 79.3763 63.5625C78.7929 63.0208 78.5013 62.5 78.5013 62C78.5013 61.3125 78.6471 60.7708 78.9388 60.375C79.3971 60.7292 79.9804 60.9062 80.6888 60.9062C81.8971 60.9062 82.7617 60.2083 83.2825 58.8125V34.1875C83.2825 33.2292 83.0846 32.5208 82.6888 32.0625C82.0638 31.2917 80.9908 30.5312 79.47 29.7812C82.0117 28.6146 83.2825 26.8125 83.2825 24.375V21.0938C83.2825 19.3229 82.6783 18.3646 81.47 18.2188C81.1158 18.1771 80.6679 18.1562 80.1263 18.1562C79.5846 18.1562 79.0846 18.3333 78.6263 18.6875C78.3346 18.2917 78.1888 17.8854 78.1888 17.4688C78.1888 17.0312 78.2929 16.5521 78.5013 16.0312C78.7304 15.4896 79.0638 14.9792 79.5013 14.5C80.6054 13.375 81.8763 12.8125 83.3138 12.8125C84.7721 12.8125 85.9804 13.0417 86.9388 13.5C88.0846 12.2083 89.3138 11.5625 90.6263 11.5625C92.7721 11.5625 93.845 12.6875 93.845 14.9375V15.1562C95.4908 13.5104 97.6367 12.3958 100.283 11.8125C101.095 11.6458 102.137 11.5625 103.408 11.5625C104.699 11.5625 106.053 11.75 107.47 12.125C108.887 12.5 110.116 13.1667 111.158 14.125C113.241 16.0417 114.522 19.4583 115.001 24.375C115.21 26.9167 116.48 28.7188 118.814 29.7812C117.335 30.5104 116.397 31.125 116.001 31.625C115.48 32.3333 115.147 33.1875 115.001 34.1875C114.397 39.2083 113.105 42.9167 111.126 45.3125C108.96 47.9167 105.824 49.2188 101.72 49.2188C98.5533 49.2188 95.9283 48.3854 93.845 46.7188V58.75C94.3658 60.1875 95.2304 60.9062 96.4388 60.9062C97.1471 60.9062 97.7304 60.7292 98.1888 60.375C98.4804 60.7708 98.6263 61.2604 98.6263 61.8438C98.6263 62.4479 98.3242 63.0208 97.72 63.5625C97.1367 64.1042 96.2408 64.375 95.0325 64.375C93.8242 64.375 92.7304 64.0312 91.7513 63.3438C90.9179 64.0312 89.8763 64.375 88.6263 64.375C87.3971 64.375 86.3138 64.0312 85.3763 63.3438ZM93.8138 38.5312C93.8138 40.2188 94.3763 41.6667 95.5013 42.875C96.6054 44.0625 97.845 44.6562 99.22 44.6562C102.699 44.6562 104.439 42.1562 104.439 37.1562V23.4688C104.439 21.1771 104.033 19.3854 103.22 18.0938C102.408 16.7812 101.262 16.125 99.7825 16.125C97.1367 16.125 95.3138 17.5833 94.3138 20.5C93.9804 21.5 93.8138 22.6979 93.8138 24.0938V38.5312ZM107.439 40.1562C108.48 39.7604 109.064 38.3958 109.189 36.0625C109.293 33.7292 109.345 32 109.345 30.875C109.345 29.7292 109.335 28.7812 109.314 28.0312C109.314 27.2604 109.303 26.4688 109.283 25.6562C109.199 22.6146 108.96 20.8438 108.564 20.3438C108.168 19.8438 107.793 19.5104 107.439 19.3438V40.1562ZM86.22 49.25C87.1992 48.5833 87.7513 47.1875 87.8763 45.0625C87.9179 43.8542 87.9492 42.4583 87.97 40.875C88.0117 37.3125 88.0325 35.0521 88.0325 34.0938C88.0533 33.1146 88.0638 32.2812 88.0638 31.5938V29.125C88.0638 28.7917 88.0533 28.3854 88.0325 27.9062C88.0325 27.4062 88.0221 26.875 88.0013 26.3125C88.0013 25.7292 87.9804 25.1667 87.9388 24.625C87.8346 22.5625 87.6054 21.2292 87.2513 20.625C86.9179 20 86.5742 19.5729 86.22 19.3438V21.2188C86.22 24.8438 86.1367 26.9688 85.97 27.5938C85.8242 28.1979 85.5742 28.6562 85.22 28.9688C84.8867 29.2812 84.3867 29.5521 83.72 29.7812C84.97 30.2188 85.6783 30.7396 85.845 31.3438C86.095 32.2604 86.22 34.8229 86.22 39.0312V49.25ZM142.299 43.875C142.695 43.4583 143.007 42.9375 143.236 42.3125C143.465 41.6667 143.58 41 143.58 40.3125C143.58 39.6042 143.538 38.9583 143.455 38.375C143.601 38.0625 143.997 37.8229 144.643 37.6562C145.288 37.4688 145.715 37.375 145.924 37.375C146.715 37.375 147.351 37.6771 147.83 38.2812C148.309 38.8646 148.549 39.6875 148.549 40.75C148.549 41.7917 148.236 42.8229 147.611 43.8438C147.007 44.8646 146.195 45.7708 145.174 46.5625C142.903 48.3333 140.257 49.2188 137.236 49.2188C131.486 49.2188 127.674 47.0417 125.799 42.6875C125.111 41.0833 124.768 39.0729 124.768 36.6562V32.8438C124.768 31.8646 123.695 30.8333 121.549 29.75C123.695 28.5208 124.768 26.8646 124.768 24.7812V21.0938C124.768 18.7188 123.799 17.5312 121.861 17.5312C121.153 17.5312 120.57 17.7083 120.111 18.0625C119.82 17.6667 119.674 17.2604 119.674 16.8438C119.674 16.4062 119.747 15.9375 119.893 15.4375C120.059 14.9167 120.34 14.4479 120.736 14.0312C121.736 12.9479 123.288 12.5729 125.393 12.9062V11.9062C125.393 9.71875 125.945 7.79167 127.049 6.125C128.028 4.625 128.893 3.875 129.643 3.875C130.413 3.875 131.007 4.13542 131.424 4.65625C131.778 3.01042 132.247 1.82292 132.83 1.09375C133.413 0.364583 134.247 0 135.33 0V13.0312H145.486C145.653 13.3646 145.736 13.9271 145.736 14.7188C145.736 15.4896 145.434 16.1146 144.83 16.5938C144.226 17.0521 143.497 17.2812 142.643 17.2812H135.33V38.4375C135.33 42.0625 136.153 44.1875 137.799 44.8125C138.278 44.9792 138.788 45.0625 139.33 45.0625C139.893 45.0625 140.424 44.9688 140.924 44.7812C141.445 44.5729 141.903 44.2708 142.299 43.875ZM127.768 40.1562C128.747 39.5312 129.299 38.2292 129.424 36.25C129.507 34.8333 129.549 33.7292 129.549 32.9375C129.57 32.1458 129.58 31.5104 129.58 31.0312C129.601 30.5312 129.611 30.1458 129.611 29.875V28.625C129.611 28.0208 129.601 27.25 129.58 26.3125C129.58 25.3542 129.57 24.3229 129.549 23.2188C129.549 22.0938 129.528 21.0208 129.486 20C129.424 17.5417 129.33 16.0417 129.205 15.5C128.955 14.2917 128.476 13.4583 127.768 13V22.75C127.768 25.6458 127.715 27.1771 127.611 27.3438C127.528 27.5104 127.455 27.7083 127.393 27.9375C127.205 28.5625 126.497 29.0833 125.268 29.5C126.518 29.9375 127.226 30.4688 127.393 31.0938C127.643 32.0938 127.768 34.4375 127.768 38.125V40.1562ZM178.846 49.0625C175.909 49.0625 174.325 47.0312 174.096 42.9688C173.034 44.8854 171.596 46.4062 169.784 47.5312C167.992 48.6562 166.055 49.2188 163.971 49.2188C161.909 49.2188 160.232 48.9375 158.94 48.375C157.648 47.8125 156.575 47 155.721 45.9375C154.055 43.8542 153.221 40.8958 153.221 37.0625V35.125C153.221 32.7083 151.95 30.9167 149.409 29.75C150.909 29.0208 151.867 28.4062 152.284 27.9062C152.909 27.1354 153.221 26.2708 153.221 25.3125V21.0938C153.221 19.3229 152.617 18.3646 151.409 18.2188C151.055 18.1771 150.607 18.1562 150.065 18.1562C149.523 18.1562 149.023 18.3333 148.565 18.6875C148.273 18.2917 148.128 17.8854 148.128 17.4688C148.128 17.0312 148.232 16.5521 148.44 16.0312C148.669 15.4896 149.013 14.9792 149.471 14.5C150.555 13.375 151.815 12.8125 153.253 12.8125C154.69 12.8125 156.044 13.0521 157.315 13.5312C158.232 12.2188 159.315 11.5625 160.565 11.5625C162.711 11.5625 163.784 12.6875 163.784 14.9375V35.2812C163.784 39.2396 164.7 41.6146 166.534 42.4062C167.117 42.6562 167.763 42.7812 168.471 42.7812C169.2 42.7812 169.857 42.6354 170.44 42.3438C171.023 42.0312 171.534 41.6146 171.971 41.0938C172.784 40.0729 173.305 38.6771 173.534 36.9062V21.0938C173.534 18.7188 172.565 17.5312 170.628 17.5312C169.919 17.5312 169.336 17.7083 168.878 18.0625C168.586 17.6667 168.44 17.2604 168.44 16.8438C168.44 16.4062 168.544 15.9583 168.753 15.5C168.982 15.0208 169.325 14.5833 169.784 14.1875C170.805 13.2708 172.044 12.8125 173.503 12.8125C174.982 12.8125 176.357 13.0521 177.628 13.5312C178.544 12.2188 179.628 11.5625 180.878 11.5625C183.023 11.5625 184.096 12.6875 184.096 14.9375V25.3125C184.096 26.2708 184.284 26.9792 184.659 27.4375C185.325 28.25 186.409 29.0208 187.909 29.75C185.367 30.9167 184.096 32.7083 184.096 35.125V43.1875C184.492 44.7917 185.357 45.5938 186.69 45.5938C187.398 45.5938 187.982 45.4167 188.44 45.0625C188.732 45.4583 188.878 45.9583 188.878 46.5625C188.878 47.1458 188.575 47.7083 187.971 48.25C187.388 48.7917 186.461 49.0625 185.19 49.0625C183.94 49.0625 182.753 48.7292 181.628 48.0625C180.794 48.7292 179.867 49.0625 178.846 49.0625ZM176.503 40.1562C177.711 39.6771 178.346 37.375 178.409 33.25C178.409 32.375 178.409 31.375 178.409 30.25C178.409 29.125 178.398 28.1667 178.378 27.375C178.378 26.5625 178.367 25.7917 178.346 25.0625C178.263 22.4375 178.023 20.875 177.628 20.375C177.232 19.8542 176.857 19.5104 176.503 19.3438V40.1562ZM157.815 29.75L157.909 25.625C157.909 23.7708 157.846 22.5417 157.721 21.9375C157.367 20.3542 156.867 19.4896 156.221 19.3438V21.375C156.221 24.8958 156.138 26.9688 155.971 27.5938C155.825 28.1979 155.575 28.6562 155.221 28.9688C154.888 29.2604 154.388 29.5208 153.721 29.75C154.971 30.1875 155.68 30.7188 155.846 31.3438C156.096 32.3438 156.221 34.6042 156.221 38.125V40.1562C156.846 40.0104 157.357 39.0833 157.753 37.375C157.857 36.8958 157.909 35.7292 157.909 33.875L157.815 29.75ZM198.519 48.0625C197.56 48.7292 196.467 49.0625 195.238 49.0625C194.008 49.0625 193.113 48.7812 192.55 48.2188C192.008 47.6354 191.738 47.0833 191.738 46.5625C191.738 45.875 191.852 45.375 192.081 45.0625C192.54 45.4167 193.123 45.5938 193.831 45.5938C195.165 45.5938 196.029 44.9479 196.425 43.6562V33.9062C196.425 32.9896 196.227 32.3229 195.831 31.9062C195.269 31.2604 194.196 30.5521 192.613 29.7812C194.071 29.1146 194.998 28.5833 195.394 28.1875C196.081 27.5 196.425 26.6562 196.425 25.6562V21.0938C196.425 19.3229 195.821 18.3646 194.613 18.2188C194.258 18.1771 193.81 18.1562 193.269 18.1562C192.727 18.1562 192.227 18.3333 191.769 18.6875C191.477 18.2917 191.331 17.8854 191.331 17.4688C191.331 17.0312 191.435 16.5521 191.644 16.0312C191.873 15.4896 192.206 14.9792 192.644 14.5C193.748 13.375 195.019 12.8125 196.456 12.8125C197.915 12.8125 199.123 13.0417 200.081 13.5C201.227 12.2083 202.456 11.5625 203.769 11.5625C205.915 11.5625 206.988 12.6875 206.988 14.9375L206.956 17.5312C208.706 14.7396 211.144 12.8958 214.269 12C215.29 11.7083 216.342 11.5625 217.425 11.5625C219.883 11.5625 221.925 12.1562 223.55 13.3438C225.175 14.5312 226.342 16.2188 227.05 18.4062C228.613 15.1771 231.144 13.0625 234.644 12.0625C235.79 11.7292 237.081 11.5625 238.519 11.5625C239.977 11.5625 241.342 11.8438 242.613 12.4062C243.904 12.9479 244.998 13.7292 245.894 14.75C247.706 16.875 248.613 19.8125 248.613 23.5625L248.519 25.6562C248.519 26.6562 248.738 27.375 249.175 27.8125C249.821 28.4583 250.873 29.1146 252.331 29.7812C250.748 30.5521 249.769 31.1458 249.394 31.5625C248.81 32.2083 248.519 32.9896 248.519 33.9062V43.6562C248.915 44.9479 249.779 45.5938 251.113 45.5938C251.613 45.5938 252.092 45.4167 252.55 45.0625C252.675 45.2292 252.81 45.3958 252.956 45.5625C253.123 45.7083 253.206 46.0417 253.206 46.5625C253.206 47.0833 252.925 47.6354 252.363 48.2188C251.821 48.7812 250.946 49.0625 249.738 49.0625C248.55 49.0625 247.446 48.7292 246.425 48.0625C245.488 48.7292 244.435 49.0625 243.269 49.0625C242.123 49.0625 241.113 48.75 240.238 48.125C239.425 48.75 238.508 49.0625 237.488 49.0625C236.488 49.0625 235.685 48.8021 235.081 48.2812C234.477 47.7604 234.175 47.0104 234.175 46.0312C234.175 45.5729 234.331 45.2083 234.644 44.9375C235.123 45.3125 235.602 45.5 236.081 45.5C236.998 45.5 237.654 44.9896 238.05 43.9688V25.3438C238.05 20.4479 236.269 18 232.706 18C231.685 18 230.685 18.5938 229.706 19.7812C228.727 20.9479 228.092 22.3646 227.8 24.0312L227.706 43.9688C228.102 44.9896 228.758 45.5 229.675 45.5C230.154 45.5 230.633 45.3125 231.113 44.9375C231.425 45.2083 231.581 45.7083 231.581 46.4375C231.581 47.1458 231.279 47.7604 230.675 48.2812C230.071 48.8021 229.258 49.0625 228.238 49.0625C227.217 49.0625 226.3 48.75 225.488 48.125C224.592 48.75 223.571 49.0625 222.425 49.0625C221.3 49.0625 220.3 48.75 219.425 48.125C218.613 48.75 217.696 49.0625 216.675 49.0625C215.675 49.0625 214.873 48.8021 214.269 48.2812C213.665 47.7604 213.363 47.0104 213.363 46.0312C213.363 45.5729 213.519 45.2083 213.831 44.9375C214.31 45.3125 214.79 45.5 215.269 45.5C216.185 45.5 216.842 44.9896 217.238 43.9688V25.3438C217.238 21.4479 216.29 19.125 214.394 18.375C213.79 18.125 213.123 18 212.394 18C210.998 18 209.79 18.6042 208.769 19.8125C207.81 20.9375 207.206 22.3542 206.956 24.0625L206.894 43.9688C207.29 44.9896 207.946 45.5 208.863 45.5C209.342 45.5 209.821 45.3125 210.3 44.9375C210.675 45.25 210.863 45.7604 210.863 46.4688C210.863 47.1562 210.54 47.7604 209.894 48.2812C209.269 48.8021 208.435 49.0625 207.394 49.0625C206.373 49.0625 205.467 48.7604 204.675 48.1562C203.842 48.7604 202.852 49.0625 201.706 49.0625C200.56 49.0625 199.498 48.7292 198.519 48.0625ZM240.113 19.3438C240.738 20.8646 241.05 23.8333 241.05 28.25V40.1562C242.092 39.7604 242.665 38.3958 242.769 36.0625C242.894 33.7292 242.956 31.6667 242.956 29.875C242.956 28.0625 242.904 26.5521 242.8 25.3438C242.696 24.1354 242.529 23.125 242.3 22.3125C241.883 20.8542 241.154 19.8646 240.113 19.3438ZM219.3 19.3438C219.925 20.8646 220.238 23.8333 220.238 28.25V40.1562C221.279 39.7604 221.852 38.3958 221.956 36.0625C222.081 33.7292 222.144 31.6667 222.144 29.875C222.144 28.0625 222.092 26.5521 221.988 25.3438C221.883 24.1354 221.717 23.125 221.488 22.3125C221.071 20.8542 220.342 19.8646 219.3 19.3438ZM199.425 40.1562C200.404 39.5312 200.956 38.2292 201.081 36.25C201.165 34.75 201.206 33.4062 201.206 32.2188V28.25C201.206 25.1667 201.123 23.1875 200.956 22.3125C200.665 20.8125 200.154 19.8229 199.425 19.3438V21.375C199.425 24.8958 199.342 26.9688 199.175 27.5938C199.029 28.1979 198.779 28.6562 198.425 28.9688C198.092 29.2812 197.592 29.5521 196.925 29.7812C198.175 30.2188 198.883 30.7396 199.05 31.3438C199.3 32.3438 199.425 34.6042 199.425 38.125V40.1562Z" fill="currentColor"/>
              </svg>
            </span>
          </Link>
          <button
            onClick={() => setShowArchiveSheet(true)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArchiveIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Active Activity Tracker - Shows what's currently being tracked (Mobile only) */}
        {currentActivity && (
          <div className="md:hidden mb-4 inline-flex items-center gap-2 bg-primary/10 border border-primary rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-primary">
              <HighlightedMentions
                text={currentActivity.name}
                mentionClassName="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold"
              />
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm font-semibold text-primary">
              <LiveDuration startTime={currentActivity.startTime} />
            </span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - Tasks */}
          <div className="flex-1 space-y-6 overflow-visible">
            {/* Active Tasks */}
            <div className="relative overflow-visible">
              {showTaskForm ? (
                <div className="mb-4">
                  <TaskForm />
                </div>
              ) : (
                <>
                  {/* Mobile Add Task Button */}
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      if (taskNameRef.current) taskNameRef.current.value = "";
                      if (taskDescriptionRef.current) taskDescriptionRef.current.value = "";
                      if (taskEffortRef.current) taskEffortRef.current.value = "";
                      if (taskNumericEstimateRef.current) taskNumericEstimateRef.current.value = "";
                      setShowMobileTaskDrawer(true);
                    }}
                    className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Task</span>
                  </button>
                </>
              )}
            </div>

            {/* Day View - Tasks & Notes */}
            <div>
              <QuickCapture
                tasks={activeTasks}
                tasksLoading={tasksLoading}
                onTaskComplete={handleTaskComplete}
                onTaskUncomplete={uncompleteStandaloneTask}
                onTaskDelete={deleteStandaloneTask}
                onTaskUpdate={updateStandaloneTask}
                onTaskStart={openStartTaskModal}
                onTaskEdit={(t) => {
                  setEditingTask(t);
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setShowMobileTaskDrawer(true);
                  } else {
                    setShowTaskForm(true);
                  }
                }}
                currentActivityName={currentActivity?.name}
              />
            </div>

            {/* Past Activity */}
            {pastTasks.length > 0 && (
              <div className="hidden md:block border-t border-border pt-6">
                <button
                  onClick={() => setShowPastActivity(!showPastActivity)}
                  className="flex items-center justify-between w-full text-left mb-4 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    Past Activity
                    <span className="text-sm bg-muted px-2 py-1 rounded-full">
                      {pastTasks.length}
                    </span>
                  </h2>
                  <svg
                    className={`w-5 h-5 text-muted-foreground transition-transform ${showPastActivity ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showPastActivity && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-80">
                    {(() => {
                      const grouped = groupTasksByDay(pastTasks);
                      const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
                      
                      return sortedDates.map((dateKey) => (
                        <div key={dateKey} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
                          <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-foreground">
                              {formatDateTitle(dateKey)}
                            </h3>
                            <button
                              onClick={() => handleArchiveDay(dateKey)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                              title="Archive this day"
                            >
                              <ArchiveIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-2 space-y-1 flex-1">
                            {grouped[dateKey].map((task) => (
                              <StandaloneTaskItem
                                key={task.id}
                                task={task}
                                onComplete={handleTaskComplete}
                                onUncomplete={uncompleteStandaloneTask}
                                onDelete={deleteStandaloneTask}
                                onUpdate={updateStandaloneTask}
                              />
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Sidebar - Upcoming Routines */}
          <div className="w-full lg:w-80 space-y-4">
            <div className="hidden md:block">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                Upcoming Routines
              </h2>
              {(() => {
                // Filter routines to only show those within the next 10 hours
                // Exclude the Show Up routine since it auto-completes
                const tenHoursFromNow = Date.now() + (10 * 60 * 60 * 1000);
                const upcomingRoutines = routines
                  .filter(routine => {
                    if (routine.isShowUpRoutine) return false;
                    try {
                      const nextOccurrence = getNextOccurrence(routine.cron!);
                      return nextOccurrence.getTime() <= tenHoursFromNow;
                    } catch {
                      return false;
                    }
                  })
                  .sort((a, b) => {
                    try {
                      const aTime = getNextOccurrence(a.cron!).getTime();
                      const bTime = getNextOccurrence(b.cron!).getTime();
                      return aTime - bTime;
                    } catch {
                      return 0;
                    }
                  })
                  .slice(0, 5);

                return upcomingRoutines.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRoutines.map((routine) => (
                    <div key={routine.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{routine.name}</h3>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full whitespace-nowrap">
                          {getPrettyTimeTillNextOccurrence(routine.cron!)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getDescription(routine.cron!)}
                      </p>
                      {/* Show tracking widget if routine has linked goal with template, otherwise show tasks and Start Routine button */}
                      {routine.goalIds && routine.goalIds.length > 0 && (() => {
                        const linkedGoal = goals.find(g => routine.goalIds?.includes(g.id) && g.templateId && g.trackingConfig);
                        return linkedGoal ? (
                          <div className="mt-3 -mb-4">
                            <GoalTrackingWidget
                              goal={linkedGoal}
                              onUpdate={() => {
                                window.dispatchEvent(new CustomEvent('goalUpdated'));
                              }}
                              embedded={true}
                              showHistory={false}
                              showQuickAdd={false}
                            />
                          </div>
                        ) : null;
                      })()}
                      {(!routine.goalIds || routine.goalIds.length === 0 || !goals.find(g => routine.goalIds?.includes(g.id) && g.templateId && g.trackingConfig)) && (
                        <>
                          {routine.tasks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {routine.tasks.slice(0, 3).map((task) => (
                                <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CheckCircleIcon className="h-4 w-4" />
                                  <span>{task.name}</span>
                                </div>
                              ))}
                              {routine.tasks.length > 3 && (
                                <p className="text-xs text-muted-foreground ml-6">
                                  +{routine.tasks.length - 3} more tasks
                                </p>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => openStartTaskModal(routine.name)}
                            className="mt-3 w-full px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 font-semibold text-sm flex items-center justify-center gap-2"
                          >
                            <PlayIcon className="h-4 w-4" />
                            Start Routine
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {routines.length > 0 ? "No routines in the next 10 hours" : "No scheduled routines yet"}
                    </p>
                    <Link
                      href="/routines"
                      className="text-sm text-primary hover:underline"
                    >
                      {routines.length > 0 ? "View all routines →" : "Create a routine →"}
                    </Link>
                  </div>
                );
              })()}
            </div>

            {/* Quick Stats (load today's time when this section is in view) */}
            <div ref={statsSectionRef} className="hidden md:block bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Today&apos;s Progress</h3>
                <Link href="/insights" className="text-xs text-primary hover:underline">
                  View all stats
                </Link>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Tasks</span>
                  <span className="text-sm font-semibold text-foreground">{activeTasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-sm font-semibold text-green-600">
                    {standaloneTasks.filter(t => t.status === 'completed' && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Goal Progress */}
            {goals && goals.length > 0 && (Object.keys(baseGoalProgress).length > 0 || currentActivity?.goalId) && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Goal Progress Today</h3>
                <div className="space-y-3">
                  {(() => {
                    // Get all goal IDs that have progress (including current activity's goal)
                    const goalIds = new Set(Object.keys(baseGoalProgress));
                    if (currentActivity?.goalId) goalIds.add(currentActivity.goalId);

                    return Array.from(goalIds)
                      .map(goalId => ({
                        goalId,
                        baseTime: baseGoalProgress[goalId] || 0,
                        isCurrentGoal: goalId === currentActivity?.goalId
                      }))
                      .sort((a, b) => b.baseTime - a.baseTime)
                      .map(({ goalId, baseTime, isCurrentGoal }) => {
                        const goal = goals.find(g => g.id === goalId);
                        if (!goal) return null;
                        const goalType = goalTypes?.find(gt => gt.id === goal.type);

                        return (
                          <div key={goalId} className="space-y-1">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{goal.name}</p>
                                {goalType && (
                                  <p className="text-xs text-muted-foreground">{goalType.name}</p>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-primary ml-2 whitespace-nowrap">
                                <LiveDuration
                                  baseMs={baseTime}
                                  startTime={isCurrentGoal ? currentActivity?.startTime : undefined}
                                />
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${Math.min((baseTime / (4 * 60 * 60 * 1000)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Start Task Modal */}
      <Modal
        isOpen={showStartTaskModal}
        closeModal={() => setShowStartTaskModal(false)}
      >
        <Modal.Title>Start Activity</Modal.Title>
        <Modal.Body>
          <div className="mt-4">
            <StartTaskForm onCancel={() => setShowStartTaskModal(false)} />
          </div>
        </Modal.Body>
      </Modal>

      <Drawer open={showMobileStartTaskDrawer} onOpenChange={setShowMobileStartTaskDrawer}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Start Activity</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8">
            <StartTaskForm onCancel={() => setShowMobileStartTaskDrawer(false)} />
          </div>
        </DrawerContent>
      </Drawer>

      <Sheet open={showArchiveSheet} onOpenChange={setShowArchiveSheet}>
        <SheetContent side="bottom" className="h-[80vh] sm:h-[90vh]">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>Past Activity</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto pr-2 pb-4 h-full">
            {pastTasks.length > 0 ? (
              <>
                <div className="space-y-6">
                  {(() => {
                    const grouped = groupTasksByDay(pastTasks);
                    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
                    
                    return sortedDates.map((dateKey) => (
                      <div key={dateKey} className="space-y-2">
                        <div className="flex items-center justify-between bg-muted px-3 py-1 rounded-md sticky top-0 z-10">
                          <h3 className="font-semibold text-sm text-foreground">
                            {formatDateTitle(dateKey)}
                          </h3>
                          <button
                            onClick={() => handleArchiveDay(dateKey)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded transition-colors"
                            title="Archive this day"
                          >
                            <ArchiveIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {grouped[dateKey].map((task) => (
                            <StandaloneTaskItem
                              key={task.id}
                              task={task}
                              onComplete={handleTaskComplete}
                              onUncomplete={uncompleteStandaloneTask}
                              onDelete={deleteStandaloneTask}
                              onUpdate={updateStandaloneTask}
                              onStart={openStartTaskModal}
                              isActive={currentActivity?.name === task.name}
                            />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                {archivedBucketIds.length > loadedArchiveBuckets && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={handleLoadMoreArchive}
                      className="px-4 py-2 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Load older archived tasks
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No past activity found.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Emotion Modal (shown when user clicks "Add feeling" on toast) */}
      {completedTaskForEmotions && (
        <>
          <TaskCompletionModal
            isOpen={showEmotionModal}
            onClose={() => {
              setShowEmotionModal(false);
              setCompletedTaskForEmotions(null);
            }}
            taskName={completedTaskForEmotions.name}
            onComplete={handleCompleteWithEmotions}
            isMobile={false}
          />
          <TaskCompletionModal
            isOpen={showMobileEmotionDrawer}
            onClose={() => {
              setShowMobileEmotionDrawer(false);
              setCompletedTaskForEmotions(null);
            }}
            taskName={completedTaskForEmotions.name}
            onComplete={handleCompleteWithEmotions}
            isMobile={true}
          />
        </>
      )}

      {/* Only mount task drawer when open so Vaul fully unmounts on close and doesn't leave overlay/body styles stuck */}
      {showMobileTaskDrawer && (
        <Drawer
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
            setShowMobileTaskDrawer(open);
          }}
        >
          <DrawerContent>
            <DrawerHeader className="text-left relative">
              <DrawerTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DrawerTitle>
              <DrawerClose className="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground transition-colors">
                <XIcon className="w-5 h-5" />
              </DrawerClose>
            </DrawerHeader>
            <div className="px-4 pb-8">
              <TaskForm />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Onboarding Modal for first-time users */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </>
  );
}
