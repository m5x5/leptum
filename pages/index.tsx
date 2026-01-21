import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { PlusIcon, PlayIcon, CheckCircleIcon, ArchiveIcon, XIcon } from "@heroicons/react/solid";
import { useStandaloneTasks } from "../utils/useStandaloneTasks";
import { useRoutineScheduler } from "../utils/useRoutineScheduler";
import { remoteStorageClient } from "../lib/remoteStorage";
import { Routine } from "../components/Job/api";
import StandaloneTaskItem from "../components/Tasks/StandaloneItem";
import { getDescription, getPrettyTimeTillNextOccurrence, getNextOccurrence } from "../utils/cron";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import Modal from "../components/Modal";
import { Input } from "../components/ui/input";
import InsightsWidget from "../components/InsightsWidget";
import VelocityTracker from "../components/VelocityTracker";
import TaskCompletionModal from "../components/Modal/TaskCompletionModal";
import { Emotion } from "../components/ui/emotion-selector";
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
    addTask: addStandaloneTask,
    updateTask: updateStandaloneTask,
    deleteTask: deleteStandaloneTask,
    completeTask: completeStandaloneTask,
    uncompleteTask: uncompleteStandaloneTask,
    reload: reloadTasks
  } = useStandaloneTasks();

  // Enable routine scheduler to automatically create tasks from scheduled routines
  useRoutineScheduler(() => {
    // Reload tasks when new ones are created from routines
    reloadTasks();
  });

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();

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
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showMobileCompletionDrawer, setShowMobileCompletionDrawer] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<{ id: string; name: string } | null>(null);

  // Use refs for form inputs instead of state for better performance
  const taskNameRef = useRef<HTMLInputElement>(null);
  const taskDescriptionRef = useRef<HTMLInputElement>(null);
  const taskTshirtSizeRef = useRef<HTMLSelectElement>(null);
  const taskNumericEstimateRef = useRef<HTMLInputElement>(null);
  const selectedGoalRef = useRef<HTMLSelectElement>(null);

  // Load routines
  useEffect(() => {
    loadRoutines();
  }, []);

  // Check if first-time user and show onboarding
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      // Skip if already completed onboarding
      if (typeof window !== 'undefined') {
        const hasCompletedOnboarding = localStorage.getItem('leptum_onboarding_completed');
        if (hasCompletedOnboarding) return;

        // Check if user has any data
        const hasNoTasks = standaloneTasks.length === 0;
        const hasNoGoals = !goals || goals.length === 0;
        const hasNoRoutines = routines.length === 0;

        // Show onboarding if no data exists
        if (hasNoTasks && hasNoGoals && hasNoRoutines) {
          setShowOnboarding(true);
        }
      }
    };

    // Only check after data has loaded
    if (standaloneTasks !== undefined && goals !== undefined && routines.length >= 0) {
      checkFirstTimeUser();
    }
  }, [standaloneTasks, goals, routines]);

  const loadRoutines = async () => {
    try {
      const loadedRoutines = await remoteStorageClient.getRoutines();
      setRoutines((loadedRoutines as Routine[]).filter(r => r.cron).sort((a, b) => a.index - b.index));
    } catch (error) {
      console.error("Failed to load routines:", error);
    }
  };

  const openStartTaskModal = (taskName: string) => {
    setTaskToStart(taskName);
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

  // Handle task completion with emotion selection
  const handleTaskComplete = (taskId: string) => {
    const task = standaloneTasks.find(t => t.id === taskId);
    if (task) {
      setTaskToComplete({ id: taskId, name: task.name });
      if (window.innerWidth < 768) {
        setShowMobileCompletionDrawer(true);
      } else {
        setShowCompletionModal(true);
      }
    }
  };

  const handleCompleteWithEmotions = (emotions: Emotion[]) => {
    if (taskToComplete) {
      completeStandaloneTask(taskToComplete.id, emotions);
      setTaskToComplete(null);
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
          No goals available. <a href="/goals" className="text-primary hover:underline">Create goals</a> to track progress.
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

  const handleCreateTask = (e?: React.FormEvent) => {
    e?.preventDefault();

    const name = taskNameRef.current?.value.trim();
    const description = taskDescriptionRef.current?.value.trim();
    const tshirtSize = taskTshirtSizeRef.current?.value;
    const numericEstimateStr = taskNumericEstimateRef.current?.value.trim();

    if (!name) return;

    const options: { tshirtSize?: 'XS' | 'S' | 'M' | 'L' | 'XL', numericEstimate?: number } = {};

    if (tshirtSize) {
      options.tshirtSize = tshirtSize as 'XS' | 'S' | 'M' | 'L' | 'XL';
    }

    if (numericEstimateStr) {
      const numericValue = parseFloat(numericEstimateStr);
      if (!isNaN(numericValue)) {
        options.numericEstimate = numericValue;
      }
    }

    addStandaloneTask(name, description || "", Object.keys(options).length > 0 ? options : undefined);

    // Clear the input refs
    if (taskNameRef.current) taskNameRef.current.value = "";
    if (taskDescriptionRef.current) taskDescriptionRef.current.value = "";
    if (taskTshirtSizeRef.current) taskTshirtSizeRef.current.value = "";
    if (taskNumericEstimateRef.current) taskNumericEstimateRef.current.value = "";
    if (selectedGoalRef.current) selectedGoalRef.current.value = "";

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
          <label htmlFor="task-tshirt-size" className="block text-sm font-medium text-foreground mb-2">
            T-shirt Size <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <select
            ref={taskTshirtSizeRef}
            id="task-tshirt-size"
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
        Add Task
      </button>
    </form>
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowTaskForm(false);
      setShowMobileTaskDrawer(false);
      // Clear the refs
      if (taskNameRef.current) taskNameRef.current.value = "";
      if (taskDescriptionRef.current) taskDescriptionRef.current.value = "";
      if (taskTshirtSizeRef.current) taskTshirtSizeRef.current.value = "";
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

  const pastTasks = standaloneTasks
    .filter(task => task.status === 'completed' || task.createdAt <= twoWeeksAgo)
    .sort((a, b) => {
      // Sort by completion date if completed, otherwise by creation date
      const dateA = a.completedAt || a.createdAt;
      const dateB = b.completedAt || b.createdAt;
      return dateB - dateA; // Most recent first
    });

  // Calculate base time tracked today from impacts (completed activities only)
  // Live time for current activity is handled by LiveDuration components
  const [baseTotalTime, setBaseTotalTime] = useState(0);
  const [baseGoalProgress, setBaseGoalProgress] = useState<Record<string, number>>({});
  const [currentActivity, setCurrentActivity] = useState<{name: string, startTime: number, goalId?: string} | null>(null);

  useEffect(() => {
    const calculateBaseTimes = async () => {
      try {
        const impacts = await remoteStorageClient.getImpacts();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayImpacts = impacts.filter((impact: any) => impact.date >= todayStart.getTime());

        // Sort by date to ensure correct order
        todayImpacts.sort((a: any, b: any) => a.date - b.date);

        // Set current activity from the most recent impact
        if (todayImpacts.length > 0) {
          const lastImpact = todayImpacts[todayImpacts.length - 1];
          setCurrentActivity({
            name: lastImpact.activity,
            startTime: lastImpact.date,
            goalId: lastImpact.goalId
          });
        } else {
          setCurrentActivity(null);
        }

        // Calculate base time between consecutive activities (completed only)
        let totalMs = 0;
        const goalTimeMap: Record<string, number> = {};

        for (let i = 0; i < todayImpacts.length - 1; i++) {
          const timeDiff = todayImpacts[i + 1].date - todayImpacts[i].date;
          totalMs += timeDiff;

          // Track time per goal
          if (todayImpacts[i].goalId) {
            goalTimeMap[todayImpacts[i].goalId] = (goalTimeMap[todayImpacts[i].goalId] || 0) + timeDiff;
          }
        }

        setBaseTotalTime(totalMs);
        setBaseGoalProgress(goalTimeMap);
      } catch (error) {
        console.error("Failed to calculate today's time:", error);
      }
    };

    calculateBaseTimes();
  }, []);

  return (
    <>
      <Head>
        <title>Home - Leptum</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="max-w-6xl mx-auto pb-32 md:pb-8">
        {/* Mobile Logo - Full Leptum logo on mobile */}
        <div className="md:hidden mb-6 flex items-center justify-between">
          <Link href="/" className="inline-block">
            <span
              className="text-foreground text-2xl font-bold"
              style={{ fontFamily: "Rye", fontWeight: "normal" }}
            >
              Leptum
            </span>
          </Link>
          <button
            onClick={() => setShowArchiveSheet(true)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArchiveIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Active Activity Tracker - Shows what's currently being tracked */}
        {currentActivity && (
          <div className="mb-4 inline-flex items-center gap-2 bg-primary/10 border border-primary rounded-full px-4 py-2">
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
              <div className="flex w-full items-center gap-4 mb-4 justify-between">
                {/* Add Task Section */}
                <div>
                  {!showTaskForm ? (
                    <>
                      {/* Desktop Add Task Button */}
                      <button
                        onClick={() => setShowTaskForm(true)}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span>Add Task</span>
                      </button>
                      {/* Mobile Add Task Button */}
                      <button
                        onClick={() => setShowMobileTaskDrawer(true)}
                        className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span>Add Task</span>
                      </button>
                    </>
                  ) : (
                    <TaskForm />
                  )}
                </div>
              </div>
              {(() => {
                const grouped = groupTasksByDay(activeTasks);
                const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
                
                return sortedDates.length > 0 ? (
                  <div className="space-y-4">
                    {sortedDates.map((dateKey) => (
                      <div key={dateKey} className="bg-card border border-border rounded-lg">
                        <div className="bg-muted/80 px-4 py-2 border-b border-border sticky top-0 z-10 rounded-t-lg">
                          <h3 className="font-semibold text-sm text-foreground">
                            {formatDateTitle(dateKey)}
                          </h3>
                        </div>
                        <div className="p-2 space-y-1">
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 bg-card border border-border rounded-lg text-sm">
                    <p className="text-muted-foreground">No active tasks. Create one above to get started!</p>
                  </div>
                );
              })()}
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
                          <div className="bg-muted/50 px-4 py-2 border-b border-border">
                            <h3 className="font-semibold text-sm text-foreground">
                              {formatDateTitle(dateKey)}
                            </h3>
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
                const tenHoursFromNow = Date.now() + (10 * 60 * 60 * 1000);
                const upcomingRoutines = routines
                  .filter(routine => {
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
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {routines.length > 0 ? "No routines in the next 10 hours" : "No scheduled routines yet"}
                    </p>
                    <a
                      href="/routines"
                      className="text-sm text-primary hover:underline"
                    >
                      {routines.length > 0 ? "View all routines →" : "Create a routine →"}
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Quick Stats */}
            <div className="hidden md:block bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Today's Progress</h3>
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
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Time Tracked</span>
                  <span className="text-sm font-semibold text-primary">
                    <LiveDuration baseMs={baseTotalTime} startTime={currentActivity?.startTime} />
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

            {/* Insights Widget */}
            <div className="hidden md:block pt-6">
              <InsightsWidget />
            </div>

            {/* Velocity Tracker */}
            <div className="hidden md:block pt-6">
              <VelocityTracker />
            </div>
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
          <div className="overflow-y-auto pr-2 pb-8 h-full">
            {pastTasks.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  const grouped = groupTasksByDay(pastTasks);
                  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
                  
                  return sortedDates.map((dateKey) => (
                    <div key={dateKey} className="space-y-2">
                      <h3 className="font-semibold text-sm text-foreground bg-muted px-3 py-1 rounded-md sticky top-0 z-10">
                        {formatDateTitle(dateKey)}
                      </h3>
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
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No past activity found.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Task Completion Modal */}
      {taskToComplete && (
        <>
          <TaskCompletionModal
            isOpen={showCompletionModal}
            onClose={() => {
              setShowCompletionModal(false);
              setTaskToComplete(null);
            }}
            taskName={taskToComplete.name}
            onComplete={handleCompleteWithEmotions}
            isMobile={false}
          />
          <TaskCompletionModal
            isOpen={showMobileCompletionDrawer}
            onClose={() => {
              setShowMobileCompletionDrawer(false);
              setTaskToComplete(null);
            }}
            taskName={taskToComplete.name}
            onComplete={handleCompleteWithEmotions}
            isMobile={true}
          />
        </>
      )}

      <Drawer open={showMobileTaskDrawer} onOpenChange={setShowMobileTaskDrawer}>
        <DrawerContent>
          <DrawerHeader className="text-left relative">
            <DrawerTitle>Add New Task</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground transition-colors">
              <XIcon className="w-5 h-5" />
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-8">
            <TaskForm />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Onboarding Modal for first-time users */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </>
  );
}
