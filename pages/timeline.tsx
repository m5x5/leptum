import Head from "next/head";
import { useEffect, useState } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { PlusIcon, TrashIcon } from "@heroicons/react/solid";
import Modal from "../components/Modal";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";

interface Impact {
  activity: string;
  date: number;
  goalId?: string;
  stress?: string | number;
  fulfillment?: string | number;
  motivation?: string | number;
  cleanliness?: string | number;
  energy?: string | number;
  [key: string]: any;
}

interface ActivitySummary {
  activity: string;
  totalDuration: number;
  percentage: number;
  color: string;
  startTime?: number;
}

export default function TimelinePage() {
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImpact, setEditingImpact] = useState<Impact | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [newActivity, setNewActivity] = useState({
    activity: "",
    date: "",
    time: "",
    goalId: "",
  });

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();

  useEffect(() => {
    const loadImpacts = async () => {
      try {
        const data = await remoteStorageClient.getImpacts();
        if (data.length > 0) {
          const sortedData = [...data].sort((a, b) => b.date - a.date);
          setImpacts(sortedData);
        }
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to load impacts:", error);
        setIsDataLoaded(true);
      }
    };

    loadImpacts();
  }, []);

  // Update current time every second for live activity counter
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const saveImpacts = async (newImpacts: Impact[]) => {
    try {
      await remoteStorageClient.saveImpacts(newImpacts);
      const sortedData = [...newImpacts].sort((a, b) => b.date - a.date);
      setImpacts(sortedData);
    } catch (error) {
      console.error("Failed to save impacts:", error);
    }
  };

  const addNewActivity = () => {
    if (!newActivity.activity || !newActivity.date || !newActivity.time) {
      alert("Please fill in all fields");
      return;
    }

    const dateTimeString = `${newActivity.date}T${newActivity.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    const newImpact: Impact = {
      activity: newActivity.activity,
      date: timestamp,
    };

    if (newActivity.goalId) {
      newImpact.goalId = newActivity.goalId;
    }

    const updatedImpacts = [...impacts, newImpact];
    saveImpacts(updatedImpacts);

    setShowAddModal(false);
    setNewActivity({ activity: "", date: "", time: "", goalId: "" });
  };

  const openEditModal = (impact: Impact, index: number) => {
    setEditingImpact(impact);
    setEditingIndex(index);

    const date = new Date(impact.date);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().slice(0, 5);

    setNewActivity({
      activity: impact.activity,
      date: dateStr,
      time: timeStr,
      goalId: impact.goalId || "",
    });

    setShowEditModal(true);
  };

  const saveEditedActivity = () => {
    if (!newActivity.activity || !newActivity.date || !newActivity.time) {
      alert("Please fill in all fields");
      return;
    }

    const dateTimeString = `${newActivity.date}T${newActivity.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    const updatedImpacts = [...impacts];
    updatedImpacts[editingIndex] = {
      ...updatedImpacts[editingIndex],
      activity: newActivity.activity,
      date: timestamp,
      goalId: newActivity.goalId || undefined,
    };

    saveImpacts(updatedImpacts);

    setShowEditModal(false);
    setEditingImpact(null);
    setEditingIndex(-1);
    setNewActivity({ activity: "", date: "", time: "", goalId: "" });
  };

  const deleteActivity = () => {
    if (!confirm("Are you sure you want to delete this activity?")) {
      return;
    }

    const updatedImpacts = impacts.filter((_, index) => index !== editingIndex);
    saveImpacts(updatedImpacts);

    setShowEditModal(false);
    setEditingImpact(null);
    setEditingIndex(-1);
    setNewActivity({ activity: "", date: "", time: "", goalId: "" });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateKey = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDuration = (startTime: number, endTime: number) => {
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDurationInMs = (startTime: number, endTime: number) => {
    return endTime - startTime;
  };

  const groupByDate = (impacts: Impact[]) => {
    const grouped: { [key: string]: Impact[] } = {};

    impacts.forEach((impact) => {
      const dateKey = formatDateKey(impact.date);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(impact);
    });

    // Sort each day's impacts by time (descending - most recent first)
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => b.date - a.date);
    });

    return grouped;
  };

  const isToday = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const calculateDaySummary = (dayImpacts: Impact[], dateKey: string): ActivitySummary[] => {
    const activityDurations: { [key: string]: number } = {};
    let totalDayDuration = 0;

    const isTodayFlag = dayImpacts.length > 0 && isToday(dayImpacts[0].date);

    // dayImpacts are sorted in descending order (most recent first)
    // So we need to reverse our thinking: each activity's duration goes from its timestamp
    // until the next activity's timestamp (or now, for the most recent one)

    for (let i = dayImpacts.length - 1; i >= 0; i--) {
      const current = dayImpacts[i];

      let endTime: number;

      if (i === 0) {
        // This is the most recent activity
        if (isTodayFlag) {
          // For today's most recent activity, duration goes until now
          endTime = currentTime;
        } else {
          // For past days, duration goes until end of day
          const dayEnd = new Date(current.date);
          dayEnd.setHours(24, 0, 0, 0);
          endTime = dayEnd.getTime();
        }
      } else {
        // Duration goes until the next activity (which is at index i-1 since array is descending)
        endTime = dayImpacts[i - 1].date;
      }

      const duration = getDurationInMs(current.date, endTime);

      if (!activityDurations[current.activity]) {
        activityDurations[current.activity] = 0;
      }
      activityDurations[current.activity] += duration;
      totalDayDuration += duration;
    }

    // Always use 24 hours (86400000 ms) for percentage calculation
    const fullDayInMs = 24 * 60 * 60 * 1000;

    // Convert to summary array with percentages
    const summaries: ActivitySummary[] = Object.entries(activityDurations).map(
      ([activity, duration]) => {
        // Find the first impact with this activity name to get its color and start time
        const impact = dayImpacts.find(i => i.activity === activity);
        return {
          activity,
          totalDuration: duration,
          percentage: (duration / fullDayInMs) * 100,
          color: impact ? getActivityColor(impact) : "bg-gray-400",
          startTime: impact?.date || 0,
        };
      }
    );

    // Sort by start time (earliest first)
    summaries.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

    return summaries;
  };

  const groupedImpacts = groupByDate(impacts);
  const dates = Object.keys(groupedImpacts).sort().reverse();

  const getActivityColor = (impact: Impact) => {
    // If the activity is associated with a goal, use the goal's color
    if (impact.goalId && goals) {
      const goal = goals.find(g => g.id === impact.goalId);
      if (goal && goal.color) {
        return goal.color;
      }
    }
    // Default to gray for non-goal activities
    return "bg-gray-400";
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground">Loading timeline...</p>
      </div>
    );
  }

  if (impacts.length === 0) {
    return (
      <>
        <Head>
          <title>Timeline - Leptum</title>
        </Head>
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-lg text-muted-foreground mb-4">No timeline data yet</p>
          <p className="text-sm text-muted-foreground">
            Start logging activities on the Impact page to see your timeline
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Timeline - Leptum</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Timeline</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daily breakdown of your activities
            </p>
          </div>
          <button
            onClick={() => {
              const now = new Date();
              const dateStr = now.toISOString().split('T')[0];
              const timeStr = now.toTimeString().slice(0, 5);
              setNewActivity({
                activity: "",
                date: dateStr,
                time: timeStr,
                goalId: "",
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Activity
          </button>
        </div>

        {/* Add Activity Modal */}
        <Modal isOpen={showAddModal} closeModal={() => setShowAddModal(false)}>
          <Modal.Title>Add Missing Activity</Modal.Title>
          <Modal.Body>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Activity Name
                </label>
                <input
                  type="text"
                  placeholder="What were you doing?"
                  className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
                  value={newActivity.activity}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, activity: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
                  value={newActivity.date}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
                  value={newActivity.time}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, time: e.target.value })
                  }
                />
              </div>

              {/* Goal Selection */}
              {goals && goals.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Related Goal (optional)
                  </label>
                  <select
                    className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
                    value={newActivity.goalId}
                    onChange={(e) =>
                      setNewActivity({ ...newActivity, goalId: e.target.value })
                    }
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

              <p className="text-sm text-muted-foreground">
                The end time will be automatically determined by the next activity you logged.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
              >
                Cancel
              </button>
              <button
                onClick={addNewActivity}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
              >
                Add Activity
              </button>
            </div>
          </Modal.Footer>
        </Modal>

        {/* Edit Activity Modal */}
        <Modal isOpen={showEditModal} closeModal={() => setShowEditModal(false)}>
          <Modal.Title>Edit Activity</Modal.Title>
          <Modal.Body>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Activity Name
                </label>
                <input
                  type="text"
                  placeholder="What were you doing?"
                  className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
                  value={newActivity.activity}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, activity: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
                  value={newActivity.date}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
                  value={newActivity.time}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, time: e.target.value })
                  }
                />
              </div>

              {/* Goal Selection */}
              {goals && goals.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Related Goal (optional)
                  </label>
                  <select
                    className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
                    value={newActivity.goalId}
                    onChange={(e) =>
                      setNewActivity({ ...newActivity, goalId: e.target.value })
                    }
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
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-2 justify-between">
              <button
                onClick={deleteActivity}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 font-semibold flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedActivity}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </Modal.Footer>
        </Modal>

        <div className="space-y-8">
          {dates.map((dateKey) => {
            const dayImpacts = groupedImpacts[dateKey];
            const daySummary = calculateDaySummary(dayImpacts, dateKey);
            const displayDate = formatDate(dayImpacts[0].date);
            const isTodayFlag = dayImpacts.length > 0 && isToday(dayImpacts[0].date);

            // Calculate what percentage of the bar should be filled vs empty (for today)
            const totalPercentageFilled = daySummary.reduce((sum, s) => sum + s.percentage, 0);
            const emptyPercentage = isTodayFlag ? Math.max(0, 100 - totalPercentageFilled) : 0;

            return (
              <div key={dateKey} className="space-y-4">
                <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pb-3 border-b border-border">
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {displayDate}
                    {isTodayFlag && (
                      <span className="ml-2 text-sm font-normal text-primary">
                        (Today)
                      </span>
                    )}
                  </h2>

                  {/* Daily Summary Bar */}
                  <div className="flex h-8 rounded-lg overflow-hidden border border-border">
                    {daySummary.map((summary, idx) => (
                      <div
                        key={`${summary.activity}-${idx}`}
                        className={`${summary.color} flex items-center justify-center text-xs text-white font-medium border-r border-background/30`}
                        style={{
                          width: `${summary.percentage}%`,
                          borderRightWidth: idx === daySummary.length - 1 && emptyPercentage === 0 ? '0' : '2px'
                        }}
                        title={`${summary.activity}: ${summary.percentage.toFixed(1)}%`}
                      >
                        {summary.percentage > 8 && (
                          <span className="px-1">
                            {summary.percentage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                    {emptyPercentage > 0 && (
                      <div
                        className="bg-muted/30 flex items-center justify-center"
                        style={{ width: `${emptyPercentage}%` }}
                        title="Future time"
                      ></div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative pl-8">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border"></div>

                  {dayImpacts.map((impact, index) => {
                    const isFirstItem = index === 0; // Most recent activity
                    const isLive = isTodayFlag && isFirstItem;

                    // Calculate duration: from this activity's start until the next activity (or now if live)
                    let duration = null;
                    let endTime: number;
                    let durationMs: number;

                    if (isFirstItem) {
                      // Most recent activity
                      if (isTodayFlag) {
                        // For today, duration goes until now (live counting)
                        endTime = currentTime;
                        duration = getDuration(impact.date, endTime);
                        durationMs = getDurationInMs(impact.date, endTime);
                      } else {
                        // For past days, duration goes until end of day
                        const dayEnd = new Date(impact.date);
                        dayEnd.setHours(24, 0, 0, 0);
                        endTime = dayEnd.getTime();
                        duration = getDuration(impact.date, endTime);
                        durationMs = getDurationInMs(impact.date, endTime);
                      }
                    } else {
                      // Not the most recent - duration goes until the next activity (index - 1)
                      const nextActivity = dayImpacts[index - 1];
                      endTime = nextActivity.date;
                      duration = getDuration(impact.date, endTime);
                      durationMs = getDurationInMs(impact.date, endTime);
                    }

                    // Calculate height based on duration (2px per minute)
                    const durationMinutes = durationMs / (1000 * 60);
                    const barHeight = Math.max(12, durationMinutes * 2); // Minimum 12px

                    // Adjust padding based on duration - less padding for short activities
                    const isShortActivity = durationMinutes < 15; // Less than 15 minutes

                    // Find the actual index in the full impacts array
                    const actualIndex = impacts.findIndex(
                      (imp) => imp.date === impact.date && imp.activity === impact.activity
                    );

                    return (
                      <div
                        key={`${impact.date}-${index}`}
                        className="relative flex items-start"
                      >
                        {/* Vertical bar representing duration */}
                        <div
                          className={`absolute left-[-1.45rem] w-3 rounded-sm ${getActivityColor(
                            impact
                          )} ${isLive ? 'animate-pulse' : ''}`}
                          style={{ height: `${barHeight}px` }}
                        ></div>

                        <div
                          className={`bg-card border-b hover:shadow-md transition-shadow cursor-pointer flex-1 ${
                            isLive ? 'border-b-primary border-b-2' : 'border-b-border'
                          } ${isShortActivity ? 'pb-2' : 'pb-3'}`}
                          style={{ minHeight: `${barHeight}px` }}
                          onClick={() => openEditModal(impact, actualIndex)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-mono ${isLive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                {formatTime(impact.date)}
                              </span>
                              <h3 className={`text-base font-semibold ${isLive ? 'text-primary' : 'text-foreground'}`}>
                                {impact.activity}
                                {isLive && <span className="ml-2 text-xs">(Live)</span>}
                              </h3>
                            </div>
                            {duration && (
                              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                                isLive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                              }`}>
                                {duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
