import Head from "next/head";
import { useEffect, useState } from "react";
import { PlusIcon, ClockIcon, PlayIcon, StopIcon, CheckCircleIcon } from "@heroicons/react/solid";
import { useStandaloneTasks } from "../utils/useStandaloneTasks";
import { useRoutineScheduler } from "../utils/useRoutineScheduler";
import { remoteStorageClient } from "../lib/remoteStorage";
import { Routine } from "../components/Job/api";
import StandaloneTaskItem from "../components/Tasks/StandaloneItem";
import { getDescription, getPrettyTimeTillNextOccurrence } from "../utils/cron";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import Modal from "../components/Modal";

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
  console.log("standaloneTasks", standaloneTasks);

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
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showPastActivity, setShowPastActivity] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [goalProgress, setGoalProgress] = useState<Record<string, number>>({});
  const [showStartTaskModal, setShowStartTaskModal] = useState(false);
  const [taskToStart, setTaskToStart] = useState<string>("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  // Update current time every second for active task timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load routines
  useEffect(() => {
    loadRoutines();
  }, []);

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
    setSelectedGoalId("");
    setShowStartTaskModal(true);
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
  };

  const handleStartTask = () => {
    startTask(taskToStart, selectedGoalId || undefined);
  };

  const stopTask = async () => {
    if (!activeTask) return;

    setActiveTask(null);
    setActiveTaskStartTime(null);
  };

  const handleCreateTask = () => {
    if (!taskName.trim()) return;

    addStandaloneTask(taskName.trim(), taskDescription.trim());
    setTaskName("");
    setTaskDescription("");
    setShowTaskForm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateTask();
    } else if (e.key === 'Escape') {
      setShowTaskForm(false);
      setTaskName("");
      setTaskDescription("");
    }
  };

  const formatDuration = (ms: number) => {
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
  };

  const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
  const activeTasks = standaloneTasks.filter(task =>
    task.status !== 'completed' && task.createdAt > twoWeeksAgo
  );
  const pastTasks = standaloneTasks
    .filter(task => task.status === 'completed' || task.createdAt <= twoWeeksAgo)
    .sort((a, b) => {
      // Sort by completion date if completed, otherwise by creation date
      const dateA = a.completedAt || a.createdAt;
      const dateB = b.completedAt || b.createdAt;
      return dateB - dateA; // Most recent first
    });

  // Calculate total time tracked today from impacts
  const [todayTotalTime, setTodayTotalTime] = useState(0);
  const [currentActivity, setCurrentActivity] = useState<{name: string, startTime: number, goalId?: string} | null>(null);

  useEffect(() => {
    const calculateTodayTime = async () => {
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

        // Calculate total time between consecutive activities
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

        // Add current activity time
        if (todayImpacts.length > 0) {
          const lastImpact = todayImpacts[todayImpacts.length - 1];
          const currentActivityTime = Date.now() - lastImpact.date;
          totalMs += currentActivityTime;

          // Add current activity time to goal if it has one
          if (lastImpact.goalId) {
            goalTimeMap[lastImpact.goalId] = (goalTimeMap[lastImpact.goalId] || 0) + currentActivityTime;
          }
        }

        setTodayTotalTime(totalMs);
        setGoalProgress(goalTimeMap);
      } catch (error) {
        console.error("Failed to calculate today's time:", error);
      }
    };

    calculateTodayTime();
    // Update every second for live tracking
    const interval = setInterval(calculateTodayTime, 1000);
    return () => clearInterval(interval);
  }, [currentTime]);

  return (
    <>
      <Head>
        <title>Home - Leptum</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Active Activity Tracker - Shows what's currently being tracked */}
        {currentActivity && (
          <div className="mb-6 bg-primary/10 border-2 border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Currently tracking</p>
                  <h3 className="text-xl font-semibold text-primary">{currentActivity.name}</h3>
                  {currentActivity.goalId && goals && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Goal: {goals.find(g => g.id === currentActivity.goalId)?.name || 'Unknown'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatDuration(currentTime - currentActivity.startTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">elapsed</p>
                </div>

              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Tasks */}
            <div>
              <div className="flex w-full items-center gap-4 mb-4 justify-between">
                <h2 className="text-2xl font-bold text-foreground">Your Tasks</h2>
                {/* Add Task Section */}
                <div>
                  {!showTaskForm ? (
                    <button
                      onClick={() => setShowTaskForm(true)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold flex items-center gap-2"
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
                            setShowTaskForm(false);
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
              </div>
              {activeTasks.length > 0 ? (
                <div className="space-y-2">
                  {activeTasks.map((task) => (
                    <StandaloneTaskItem
                      key={task.id}
                      task={task}
                      onComplete={completeStandaloneTask}
                      onUncomplete={uncompleteStandaloneTask}
                      onDelete={deleteStandaloneTask}
                      onUpdate={updateStandaloneTask}
                      onStart={openStartTaskModal}
                      isActive={currentActivity?.name === task.name}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-card border border-border rounded-lg">
                  <p className="text-muted-foreground">No active tasks. Create one above to get started!</p>
                </div>
              )}
            </div>

            {/* Past Activity */}
            {pastTasks.length > 0 && (
              <div className="border-t border-border pt-6">
                <button
                  onClick={() => setShowPastActivity(!showPastActivity)}
                  className="flex items-center justify-between w-full text-left mb-4 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
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
                  <div className="space-y-2 opacity-75">
                    {pastTasks.map((task) => (
                      <StandaloneTaskItem
                        key={task.id}
                        task={task}
                        onComplete={completeStandaloneTask}
                        onUncomplete={uncompleteStandaloneTask}
                        onDelete={deleteStandaloneTask}
                        onUpdate={updateStandaloneTask}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Upcoming Routines */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-primary" />
                Upcoming Routines
              </h2>
              {routines.length > 0 ? (
                <div className="space-y-3">
                  {routines.slice(0, 5).map((routine) => (
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
                    No scheduled routines yet
                  </p>
                  <a
                    href="/routines"
                    className="text-sm text-primary hover:underline"
                  >
                    Create a routine →
                  </a>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3">Today's Progress</h3>
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
                    {formatDuration(todayTotalTime)}
                  </span>
                </div>
                {currentActivity && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current Activity</span>
                    <span className="text-sm font-semibold text-primary">
                      {formatDuration(currentTime - currentActivity.startTime)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Goal Progress */}
            {goals && goals.length > 0 && Object.keys(goalProgress).length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3">Goal Progress Today</h3>
                <div className="space-y-3">
                  {Object.entries(goalProgress)
                    .sort(([, timeA], [, timeB]) => timeB - timeA)
                    .map(([goalId, time]) => {
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
                              {formatDuration(time)}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{ width: `${Math.min((time / (4 * 60 * 60 * 1000)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
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
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-lg font-medium text-foreground mb-4">
                {taskToStart}
              </p>
            </div>

            {/* Goal Selection */}
            {goals && goals.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Related Goal (optional)
                </label>
                <select
                  className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
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
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowStartTaskModal(false)}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={handleStartTask}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold flex items-center gap-2"
            >
              <PlayIcon className="h-5 w-5" />
              Start
            </button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
}
