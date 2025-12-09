import Head from "next/head";
import { useEffect, useState } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { PlusIcon, TrashIcon, UploadIcon } from "@heroicons/react/solid";
import Modal from "../components/Modal";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import { useActivityWatch } from "../utils/useActivityWatch";
import ImportActivityWatchModal from "../components/Modal/ImportActivityWatchModal";
import AWEventDetailModal from "../components/Modal/AWEventDetailModal";
import FilterControls from "../components/Timeline/FilterControls";
import { ActivityWatchEntry, EventGroupEntry } from "../components/Timeline/TimelineEntry";
import { ProcessedAWEvent, EventGroup } from "../activity-watch.d";
import { groupAdjacentEvents, DEFAULT_GROUP_GAP_MINUTES } from "../utils/activityWatch";

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

  // ActivityWatch state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAWDetailModal, setShowAWDetailModal] = useState(false);
  const [selectedAWEvent, setSelectedAWEvent] = useState<ProcessedAWEvent | null>(null);

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
  const {
    awData,
    isLoading: awIsLoading,
    error: awError,
    filterSettings,
    importData,
    clearData: clearAWData,
    toggleBucket,
    updateFilterSettings,
  } = useActivityWatch();

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

  // Get all dates that have either manual impacts or AW events
  const getAllDates = () => {
    const dateSet = new Set<string>(Object.keys(groupedImpacts));

    // Add dates from AW events if they exist
    if (awData && filterSettings.showActivityWatch) {
      awData.events.forEach((event) => {
        const dateKey = formatDateKey(event.timestamp);
        dateSet.add(dateKey);
      });
    }

    return Array.from(dateSet).sort().reverse();
  };

  const dates = getAllDates();

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

  // Handle ActivityWatch event click
  const handleAWEventClick = (event: ProcessedAWEvent) => {
    setSelectedAWEvent(event);
    setShowAWDetailModal(true);
  };

  // Create manual entry from AW event
  const handleCreateManualEntry = (event: ProcessedAWEvent) => {
    const date = new Date(event.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().slice(0, 5);

    setNewActivity({
      activity: event.displayName,
      date: dateStr,
      time: timeStr,
      goalId: "",
    });

    setShowAddModal(true);
  };

  // Get filtered ActivityWatch events for a specific date
  const getFilteredAWEventsForDate = (dateKey: string) => {
    if (!awData || !filterSettings.showActivityWatch) {
      console.log('getFilteredAWEventsForDate early return:', { hasAwData: !!awData, showActivityWatch: filterSettings.showActivityWatch });
      return [];
    }

    const [year, month, day] = dateKey.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    console.log('Filtering AW events for date:', dateKey, {
      totalEvents: awData.events.length,
      visibleBuckets: filterSettings.visibleBuckets,
      minDuration: filterSettings.minDuration,
      dateRange: { start: new Date(dayStart).toISOString(), end: new Date(dayEnd).toISOString() }
    });

    const filtered = awData.events.filter((event) => {
      // Date range filter
      if (event.timestamp < dayStart || event.timestamp > dayEnd) return false;

      // Bucket visibility filter
      const bucketVisible = filterSettings.visibleBuckets.includes(event.bucketId);
      if (!bucketVisible) {
        console.log('Event filtered out - bucket not visible:', event.bucketId, 'visible buckets:', filterSettings.visibleBuckets);
        return false;
      }

      // Duration filter
      if (event.duration < filterSettings.minDuration) return false;

      // Hidden filter
      if (event.isHidden) return false;

      return true;
    });

    console.log('Filtered AW events result:', { dateKey, filteredCount: filtered.length, events: filtered });

    return filtered;
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 font-semibold flex items-center gap-2"
            >
              <UploadIcon className="w-5 h-5" />
              Import ActivityWatch
            </button>
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
        </div>

        {/* Filter Controls */}
        {awData && awData.buckets.length > 0 && (
          <FilterControls
            filterSettings={filterSettings}
            buckets={awData.buckets}
            onUpdateFilters={updateFilterSettings}
            onToggleBucket={toggleBucket}
          />
        )}

        {/* Error Display */}
        {awError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-500">{awError}</p>
          </div>
        )}

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
            const dayImpacts = groupedImpacts[dateKey] || [];
            const daySummary = calculateDaySummary(dayImpacts, dateKey);

            // Get display date from first impact or from dateKey
            let displayDate: string;
            let isTodayFlag: boolean;

            if (dayImpacts.length > 0) {
              displayDate = formatDate(dayImpacts[0].date);
              isTodayFlag = isToday(dayImpacts[0].date);
            } else {
              // No manual impacts, derive from dateKey
              const [year, month, day] = dateKey.split('-').map(Number);
              const dateTimestamp = new Date(year, month - 1, day).getTime();
              displayDate = formatDate(dateTimestamp);
              isTodayFlag = isToday(dateTimestamp);
            }

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

                {/* Timeline - Side by Side Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Manual Activities */}
                  {filterSettings.showManual && dayImpacts.length > 0 && (
                    <div className="relative pl-8">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border"></div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-4">Manual Activities</h3>

                      {dayImpacts.map((impact, index) => {
                        const isFirstItem = index === 0;
                        const isLive = isTodayFlag && isFirstItem;

                        let duration = null;
                        let endTime: number;
                        let durationMs: number;

                        if (isFirstItem) {
                          if (isTodayFlag) {
                            endTime = currentTime;
                            duration = getDuration(impact.date, endTime);
                            durationMs = getDurationInMs(impact.date, endTime);
                          } else {
                            const dayEnd = new Date(impact.date);
                            dayEnd.setHours(24, 0, 0, 0);
                            endTime = dayEnd.getTime();
                            duration = getDuration(impact.date, endTime);
                            durationMs = getDurationInMs(impact.date, endTime);
                          }
                        } else {
                          const nextActivity = dayImpacts[index - 1];
                          endTime = nextActivity.date;
                          duration = getDuration(impact.date, endTime);
                          durationMs = getDurationInMs(impact.date, endTime);
                        }

                        const durationMinutes = durationMs / (1000 * 60);
                        const barHeight = Math.max(12, durationMinutes * 2);
                        const isShortActivity = durationMinutes < 15;

                        const actualIndex = impacts.findIndex(
                          (imp) => imp.date === impact.date && imp.activity === impact.activity
                        );

                        return (
                          <div
                            key={`manual-${impact.date}-${index}`}
                            className="relative flex items-start mb-1"
                          >
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
                  )}

                  {/* Right Column: ActivityWatch Events */}
                  {filterSettings.showActivityWatch && (() => {
                    // Get filtered AW events for this day (excluding AFK)
                    const awEvents = getFilteredAWEventsForDate(dateKey).filter(
                      e => e.bucketType !== 'afk'
                    );

                    if (awEvents.length === 0) return null;

                    // Group AW events
                    const groupedAWEvents = groupAdjacentEvents(awEvents, DEFAULT_GROUP_GAP_MINUTES);

                    return (
                      <div className="relative pl-8">
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border"></div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-muted-foreground">ActivityWatch Events</h3>
                          <span className="text-xs text-muted-foreground">{awEvents.length} events</span>
                        </div>

                        {groupedAWEvents.reverse().map(group => {
                          if (group.occurrences.length > 1) {
                            const totalDurationMs = group.totalDuration * 1000;
                            const durationMinutes = totalDurationMs / (1000 * 60);
                            const barHeight = Math.max(12, durationMinutes * 2);
                            const isShortActivity = durationMinutes < 15;

                            return (
                              <div key={`aw-group-${group.timeRange.start}`} className="mb-1">
                                <EventGroupEntry
                                  group={group}
                                  isToday={isTodayFlag}
                                  currentTime={currentTime}
                                  barHeight={barHeight}
                                  isShortActivity={isShortActivity}
                                  formatTime={formatTime}
                                  formatDuration={formatDuration}
                                  onEventClick={handleAWEventClick}
                                />
                              </div>
                            );
                          } else {
                            const event = group.occurrences[0];
                            const durationMs = event.duration * 1000;
                            const durationMinutes = durationMs / (1000 * 60);
                            const barHeight = Math.max(12, durationMinutes * 2);
                            const isShortActivity = durationMinutes < 15;

                            return (
                              <div key={`aw-${event.id}`} className="mb-1">
                                <ActivityWatchEntry
                                  event={event}
                                  duration={getDuration(event.timestamp, event.timestamp + durationMs)}
                                  barHeight={barHeight}
                                  isShortActivity={isShortActivity}
                                  formatTime={formatTime}
                                  onClick={() => handleAWEventClick(event)}
                                />
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* AFK Status Indicator */}
                {filterSettings.showActivityWatch && (() => {
                  const afkEvents = getFilteredAWEventsForDate(dateKey).filter(
                    e => e.bucketType === 'afk'
                  );

                  if (afkEvents.length === 0) return null;

                  return (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-semibold text-foreground">Presence Status</h4>
                        <span className="text-xs text-muted-foreground">({afkEvents.length} status changes)</span>
                      </div>
                      <div className="relative h-8 bg-background rounded border border-border overflow-hidden">
                        {afkEvents.map((event, idx) => {
                          const [year, month, day] = dateKey.split('-').map(Number);
                          const dayStart = new Date(year, month - 1, day).getTime();
                          const dayDuration = 24 * 60 * 60 * 1000;

                          const eventStart = event.timestamp - dayStart;
                          const eventDuration = event.duration * 1000;

                          const leftPercent = (eventStart / dayDuration) * 100;
                          const widthPercent = (eventDuration / dayDuration) * 100;

                          const isActive = event.displayName === 'Active';
                          const bgColor = isActive ? 'bg-green-500' : 'bg-gray-400';

                          return (
                            <div
                              key={`afk-${event.id}`}
                              className={`absolute top-0 bottom-0 ${bgColor} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              title={`${event.displayName}: ${formatTime(event.timestamp)} (${Math.floor(event.duration / 60)}m)`}
                              onClick={() => handleAWEventClick(event)}
                            />
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span className="text-muted-foreground">Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-400 rounded"></div>
                          <span className="text-muted-foreground">Away</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            );
          })}
        </div>

        {/* Import ActivityWatch Modal */}
        <ImportActivityWatchModal
          isOpen={showImportModal}
          closeModal={() => setShowImportModal(false)}
          onImport={importData}
        />

        {/* ActivityWatch Event Detail Modal */}
        <AWEventDetailModal
          isOpen={showAWDetailModal}
          closeModal={() => setShowAWDetailModal(false)}
          event={selectedAWEvent}
          onCreateManualEntry={handleCreateManualEntry}
        />
      </div>
    </>
  );
}
