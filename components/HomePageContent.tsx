"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { PlusIcon, PlayIcon, CheckCircleIcon, ArchiveIcon, XIcon, FireIcon } from "@heroicons/react/solid";
import { useStandaloneTasks } from "./StandaloneTasksContext";
import type { StandaloneTask } from "../utils/useStandaloneTasks";
import { useRoutineScheduler } from "../utils/useRoutineScheduler";
import { useRoutineCompletions } from "../utils/useRoutineCompletions";
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
  SheetDescription,
} from "../components/ui/sheet";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";

import OnboardingModal from "../components/Modal/OnboardingModal";
import QuickCapture, { type PendingSharePayload } from "../components/QuickCapture/QuickCapture";
import { useCurrentActivity } from "../components/CurrentActivityContext";
import { getCurrentTime } from "../utils/now";
import { v4 as uuidv4 } from "uuid";
import { useProfile } from "../utils/useProfile";

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
  const [now, setNow] = useState(() => Date.now());

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
  const { getStreaksForRoutine } = useRoutineCompletions();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
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
  const [nowForFilter, setNowForFilter] = useState(0);
  const [quickNoteTrigger, setQuickNoteTrigger] = useState(0);
  const [pendingShare, setPendingShare] = useState<PendingSharePayload | null>(null);
  const [showStreakSheet, setShowStreakSheet] = useState(false);
  const handleProcessedShare = useCallback(() => setPendingShare(null), []);

  // Use refs for form inputs instead of state for better performance
  const taskNameRef = useRef<HTMLInputElement>(null);
  const taskDescriptionRef = useRef<HTMLInputElement>(null);
  const taskEffortRef = useRef<HTMLSelectElement>(null);
  const taskNumericEstimateRef = useRef<HTMLInputElement>(null);
  const selectedGoalRef = useRef<HTMLSelectElement>(null);
  const routinesSectionRef = useRef<HTMLDivElement>(null);
  const statsSectionRef = useRef<HTMLDivElement>(null);

  const currentActivity = useCurrentActivity();
  const searchParams = useSearchParams();

  // Support note_taking.new_note_url: opening /?capture=note opens quick text note capture
  useEffect(() => {
    if (typeof window === "undefined" || !searchParams) return;
    if (searchParams.get("capture") === "note") {
      window.history.replaceState(null, "", window.location.pathname || "/");
      queueMicrotask(() => setQuickNoteTrigger(Date.now()));
    }
  }, [searchParams]);

  // Support Web Share Target: read pending share from localStorage (set by /share route after redirect)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("pendingShare");
      if (raw) {
        const payload = JSON.parse(raw) as PendingSharePayload;
        localStorage.removeItem("pendingShare");
        queueMicrotask(() => setPendingShare(payload));
      }
    } catch {
      localStorage.removeItem("pendingShare");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => setNowForFilter(Date.now()));
    const id = setInterval(() => setNowForFilter(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // N: add task. Shift+N: open new text note (quick capture).
  // Handle both here with preventDefault() so the key is not also typed into focused inputs (unlike keyux/aria-keyshortcuts which don't consume the key).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (inInput) return; // Never steal "n" or "N" when user is typing

      if (e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        setQuickNoteTrigger(Date.now());
        return;
      }
      // Bare "n" (no modifier) → add task (same as header button)
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation(); // so keyux doesn't also activate the header button and double-fire
        window.dispatchEvent(new CustomEvent('openTaskForm'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      const showUpRoutine = showUp as Routine;
      const completedToday = completions.some(
        (c) => c.routineId === showUpRoutine.id && c.completedAt >= todayStart.getTime()
      );
      if (!completedToday) {
        await remoteStorageClient.addRoutineCompletion({
          routineId: showUpRoutine.id,
          routineInstanceId: `${showUpRoutine.id}-${Date.now()}`,
          routineName: showUpRoutine.name,
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

  // Listen for openTaskForm event from header button (bottom sheet on mobile, inline form on desktop)
  useEffect(() => {
    const handleOpenTaskForm = () => {
      setEditingTask(null);
      if (taskNameRef.current) taskNameRef.current.value = "";
      if (taskDescriptionRef.current) taskDescriptionRef.current.value = "";
      if (taskEffortRef.current) taskEffortRef.current.value = "";
      if (taskNumericEstimateRef.current) taskNumericEstimateRef.current.value = "";
      if (selectedGoalRef.current) selectedGoalRef.current.value = "";
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setShowMobileTaskDrawer(true);
      } else {
        setShowTaskForm(true);
      }
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
      queueMicrotask(() => setShowOnboarding(false));
      return;
    }
    if (!tasksLoading && standaloneTasks.length === 0) {
      queueMicrotask(() => setShowOnboarding(true));
    } else {
      queueMicrotask(() => setShowOnboarding(false));
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

  const startTask = async (taskName: string, goalId?: string, timestamp?: number) => {
    // Stop previous task if any
    if (activeTask) {
      await stopTask();
    }

    const now = timestamp ?? getCurrentTime();

    setActiveTask(taskName);

    // Log to impacts
    try {
      const impacts = await remoteStorageClient.getImpacts();
      const newImpact = {
        activity: taskName,
        date: now,
        ...(goalId ? { goalId } : {})
      };
      impacts.push(newImpact);
      await remoteStorageClient.saveImpacts(impacts);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("impactsUpdated"));
      }
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

  // Handle task completion - complete immediately and show toast; stop tracking if this task was active
  const handleTaskComplete = useCallback(async (taskId: string) => {
    const task = standaloneTasks.find(t => t.id === taskId);
    if (task) {
      const wasTracked = currentActivity?.name === task.name || activeTask === task.name;
      if (wasTracked) {
        setActiveTask(null);
        try {
          const impacts = await remoteStorageClient.getImpacts();
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayImpacts = impacts.filter((imp: { date: number }) => imp.date >= todayStart.getTime());
          todayImpacts.sort((a: { date: number }, b: { date: number }) => a.date - b.date);
          if (todayImpacts.length > 0) {
            const last = todayImpacts[todayImpacts.length - 1];
            if (last.activity === task.name && last.endTime == null) {
              let lastIndex = -1;
              for (let i = impacts.length - 1; i >= 0; i--) {
                if (impacts[i].date === last.date && impacts[i].activity === last.activity) {
                  lastIndex = i;
                  break;
                }
              }
              if (lastIndex !== -1) {
                const updated = [...impacts];
                updated[lastIndex] = { ...updated[lastIndex], endTime: Date.now() };
                await remoteStorageClient.saveImpacts(updated);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("impactsUpdated"));
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to end impact on task complete:", err);
        }
      }

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
  }, [standaloneTasks, currentActivity?.name, activeTask, completeStandaloneTask]);

  const handleCompleteWithEmotions = (emotions: Emotion[]) => {
    if (completedTaskForEmotions) {
      updateStandaloneTask(completedTaskForEmotions.id, { emotions });
      setCompletedTaskForEmotions(null);
    }
  };

  const renderStartTaskForm = (onCancel: () => void) => (
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
          className="min-h-[44px] px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold flex items-center gap-2"
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("impactsUpdated"));
      }

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

  const taskFormContent = (
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
        className="min-h-[44px] w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold mt-4"
      >
        {editingTask ? 'Save Task' : 'Add Task'}
      </button>
    </form>
  );

  const twoWeeksAgo = nowForFilter - (14 * 24 * 60 * 60 * 1000);
  const activeTasks = standaloneTasks.filter(task =>
    task.status !== 'completed' && task.createdAt > twoWeeksAgo
  );

  const groupTasksByDay = (tasks: StandaloneTask[]) => {
    const groups: Record<string, StandaloneTask[]> = {};
    
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

  // Past = home tasks that are completed or old, plus latest archived bucket (loaded when archive sheet opens)
  const pastTasks = [...standaloneTasks.filter(task => task.status === 'completed' || task.createdAt <= twoWeeksAgo), ...archivedTasks]
    .sort((a, b) => {
      const dateA = a.completedAt || a.createdAt;
      const dateB = b.completedAt || b.createdAt;
      return dateB - dateA;
    });

  // Today's time + goal progress. Only load when Today's Progress section is in view (desktop; hidden on mobile).
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

  const showUpStreakInfo = getStreaksForRoutine("show-up-routine");
  const profile = useProfile();

  // Open streak sheet from AppShell (desktop header button)
  useEffect(() => {
    const open = () => setShowStreakSheet(true);
    window.addEventListener("openStreakSheet", open);
    return () => window.removeEventListener("openStreakSheet", open);
  }, []);

  return (
    <>
      <div className="max-w-6xl mx-auto pt-4 pb-32 md:pb-8">
        {/* Mobile: avatar/greeting + streak button + archive */}
        <div className="md:hidden mb-6 flex items-center justify-between">
          <Link href="/settings" className="flex items-center gap-2.5 min-w-0">
            {profile?.avatarDataUrl ? (
              <img
                src={profile.avatarDataUrl}
                alt={profile.displayName ?? ""}
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {profile?.displayName?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground leading-tight">
                {(() => {
                  const h = new Date().getHours();
                  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
                })()}
              </span>
              {profile?.displayName && (
                <span className="text-sm font-semibold text-foreground truncate leading-tight">
                  {profile.displayName}
                </span>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowStreakSheet(true)}
              className="min-h-[44px] flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-colors text-foreground"
              title="Show up streak"
            >
              <FireIcon className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="text-sm font-medium tabular-nums">{showUpStreakInfo.currentStreak}</span>
            </button>
            <button
              onClick={() => setShowArchiveSheet(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArchiveIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - Tasks */}
          <div className="flex-1 space-y-6 overflow-visible">
            {/* Active Tasks */}
            <div className="relative overflow-visible">
              {showTaskForm ? (
                <div className="mb-4">
                  {taskFormContent}
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
                onTaskReorder={(orderedIds) => remoteStorageClient.reorderHomeTasks(orderedIds)}
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
                openTextNoteTrigger={quickNoteTrigger}
                pendingShare={pendingShare}
                onProcessedShare={handleProcessedShare}
              />
            </div>

            {/* Past Activity */}
            {pastTasks.length > 0 && (
              <div className="hidden md:block border-t border-border pt-6">
                <button
                  onClick={() => setShowPastActivity(!showPastActivity)}
                  className="flex min-h-[44px] items-center justify-between w-full text-left mb-4 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
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
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
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
                const tenHoursFromNow = nowForFilter + (10 * 60 * 60 * 1000);
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
                            className="mt-3 min-h-[44px] w-full px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 font-semibold text-sm flex items-center justify-center gap-2"
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
            {renderStartTaskForm(() => setShowStartTaskModal(false))}
          </div>
        </Modal.Body>
      </Modal>

      <Drawer open={showMobileStartTaskDrawer} onOpenChange={setShowMobileStartTaskDrawer}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Start Activity</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8">
            {renderStartTaskForm(() => setShowMobileStartTaskDrawer(false))}
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
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded transition-colors"
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
                      className="min-h-[44px] px-4 py-2 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
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

      {/* Show up streak sheet - current & longest streak */}
      <Sheet open={showStreakSheet} onOpenChange={setShowStreakSheet}>
        <SheetContent side="bottom" className="sm:max-w-md sm:mx-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <FireIcon className="w-5 h-5 text-orange-500" />
              Show up streak
            </SheetTitle>
            <SheetDescription>
              Daily app usage — visiting the app counts as showing up.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <span className="text-sm font-medium text-foreground">Current streak</span>
              <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {showUpStreakInfo.currentStreak} day{showUpStreakInfo.currentStreak !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-sm font-medium text-foreground">Longest streak</span>
              <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {showUpStreakInfo.longestStreak} day{showUpStreakInfo.longestStreak !== 1 ? "s" : ""}
              </span>
            </div>
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
              <DrawerClose className="absolute right-4 top-4 min-h-[44px] min-w-[44px] flex items-center justify-center p-1 text-muted-foreground hover:text-foreground transition-colors">
                <XIcon className="w-5 h-5" />
              </DrawerClose>
            </DrawerHeader>
            <div className="px-4 pb-8">
              {taskFormContent}
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
