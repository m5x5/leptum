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
      import { ActivityWatchEntry, EventGroupEntry, TimeBlockEntry, GapBlock } from "../components/Timeline/TimelineEntry";

import { ProcessedAWEvent, EventGroup } from "../activity-watch.d";
import { groupAdjacentEvents, DEFAULT_GROUP_GAP_MINUTES } from "../utils/activityWatch";
      import { chunkEventsIntoTimeBlocks, mergeConsecutiveBlocks, isLoginWindowOnlyBlock, DEFAULT_BLOCK_SIZE_MINUTES } from "../utils/timeBlocks";

import ActivityForm from "../components/Timeline/ActivityForm";
import DraftTimelineEntry from "../components/Timeline/DraftTimelineEntry";
import { LiveActivityDuration } from "../components/Timeline/LiveActivityDuration";
import { LiveSummaryBar } from "../components/Timeline/LiveSummaryBar";

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
  const [editFormData, setEditFormData] = useState<{
    activity: string;
    date: string;
    time: string;
    goalId: string;
  } | null>(null);
  const [addFormInitialData, setAddFormInitialData] = useState<{
    activity: string;
    date: string;
    time: string;
    goalId: string;
  } | null>(null);

  // ActivityWatch state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAWDetailModal, setShowAWDetailModal] = useState(false);
  const [selectedAWEvent, setSelectedAWEvent] = useState<ProcessedAWEvent | null>(null);
  
  // State for collapsible detailed activities in timeline
  const [expandedBlockStart, setExpandedBlockStart] = useState<number | null>(null);
  
  // State for inline adding in gaps
  const [editingGapStart, setEditingGapStart] = useState<number | null>(null);

  // Effect to close detail views when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setExpandedBlockStart(null);
    };
    
    // Add listener
    document.addEventListener('click', handleDocumentClick);
    
    // Cleanup
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  // Pagination state
  const [daysToShow, setDaysToShow] = useState(2);

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

  const saveImpacts = async (newImpacts: Impact[]) => {
    try {
      await remoteStorageClient.saveImpacts(newImpacts);
      const sortedData = [...newImpacts].sort((a, b) => b.date - a.date);
      setImpacts(sortedData);
    } catch (error) {
      console.error("Failed to save impacts:", error);
    }
  };

  const addNewActivity = (formData: { activity: string; date: string; time: string; goalId: string }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    const newImpact: Impact = {
      activity: formData.activity,
      date: timestamp,
    };

    if (formData.goalId) {
      newImpact.goalId = formData.goalId;
    }

    const updatedImpacts = [...impacts, newImpact];
    saveImpacts(updatedImpacts);

    setShowAddModal(false);
    setAddFormInitialData(null);
  };

  const handleInlineSubmit = (data: { activity: string; goalId: string }) => {
    if (!editingGapStart) return;
    
    const date = new Date(editingGapStart);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().slice(0, 5);
    
    addNewActivity({
      activity: data.activity,
      date: dateStr,
      time: timeStr,
      goalId: data.goalId
    });
    
    setEditingGapStart(null);
  };

  const openEditModal = (impact: Impact, index: number) => {
    setEditingImpact(impact);
    setEditingIndex(index);

    const date = new Date(impact.date);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().slice(0, 5);

    setEditFormData({
      activity: impact.activity,
      date: dateStr,
      time: timeStr,
      goalId: impact.goalId || "",
    });

    setShowEditModal(true);
  };

  const saveEditedActivity = (formData: { activity: string; date: string; time: string; goalId: string }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    const updatedImpacts = [...impacts];
    updatedImpacts[editingIndex] = {
      ...updatedImpacts[editingIndex],
      activity: formData.activity,
      date: timestamp,
      goalId: formData.goalId || undefined,
    };

    saveImpacts(updatedImpacts);

    setShowEditModal(false);
    setEditingImpact(null);
    setEditingIndex(-1);
    setEditFormData(null);
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
    setEditFormData(null);
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

  // Static calculation for past days only (not today)
  const calculateDaySummary = (dayImpacts: Impact[]): ActivitySummary[] => {
    const activityDurations: { [key: string]: number } = {};

    // dayImpacts are sorted in descending order (most recent first)
    for (let i = dayImpacts.length - 1; i >= 0; i--) {
      const current = dayImpacts[i];
      let endTime: number;

      if (i === 0) {
        // For past days, duration goes until end of day
        const dayEnd = new Date(current.date);
        dayEnd.setHours(24, 0, 0, 0);
        endTime = dayEnd.getTime();
      } else {
        // Duration goes until the next activity
        endTime = dayImpacts[i - 1].date;
      }

      const duration = getDurationInMs(current.date, endTime);

      if (!activityDurations[current.activity]) {
        activityDurations[current.activity] = 0;
      }
      activityDurations[current.activity] += duration;
    }

    // Always use 24 hours for percentage calculation
    const fullDayInMs = 24 * 60 * 60 * 1000;

    // Convert to summary array with percentages
    const summaries: ActivitySummary[] = Object.entries(activityDurations).map(
      ([activity, duration]) => {
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

  const allDates = getAllDates();
  const dates = allDates.slice(0, daysToShow);
  const hasMoreDays = allDates.length > daysToShow;

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

  // Round timestamp to nearest 15-minute boundary
  const roundToNearest15Minutes = (timestamp: number): number => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;

    date.setMinutes(roundedMinutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date.getTime();
  };

  // Handle ActivityWatch event click
  const handleAWEventClick = (event: ProcessedAWEvent) => {
    setSelectedAWEvent(event);
    setShowAWDetailModal(true);
  };

  // Create manual entry from AW event
  const handleCreateManualEntry = (event: ProcessedAWEvent) => {
    // Round the timestamp to nearest 15 minutes
    const roundedTimestamp = roundToNearest15Minutes(event.timestamp);
    const date = new Date(roundedTimestamp);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().slice(0, 5);

    setAddFormInitialData({
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
      return [];
    }

    const [year, month, day] = dateKey.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    return awData.events.filter((event) => {
      // Date range filter
      if (event.timestamp < dayStart || event.timestamp > dayEnd) return false;

      // Bucket visibility filter
      if (!filterSettings.visibleBuckets.includes(event.bucketId)) return false;

      // Duration filter
      if (event.duration < filterSettings.minDuration) return false;

      // Hidden filter
      if (event.isHidden) return false;

      return true;
    });
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
                // Round current time to nearest 15 minutes
                const roundedTimestamp = roundToNearest15Minutes(Date.now());
                const now = new Date(roundedTimestamp);
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().slice(0, 5);
                setAddFormInitialData({
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
        <Modal isOpen={showAddModal} closeModal={() => {
          setShowAddModal(false);
          setAddFormInitialData(null);
        }}>
          <Modal.Title>Add Missing Activity</Modal.Title>
          <Modal.Body>
            {addFormInitialData && (
              <ActivityForm
                initialData={addFormInitialData}
                onSubmit={addNewActivity}
                onCancel={() => {
                  setShowAddModal(false);
                  setAddFormInitialData(null);
                }}
                submitLabel="Add Activity"
              />
            )}
          </Modal.Body>
        </Modal>

        {/* Edit Activity Modal */}
        <Modal isOpen={showEditModal} closeModal={() => {
          setShowEditModal(false);
          setEditFormData(null);
        }}>
          <Modal.Title>Edit Activity</Modal.Title>
          <Modal.Body>
            {editFormData && (
              <ActivityForm
                initialData={editFormData}
                onSubmit={saveEditedActivity}
                onCancel={() => {
                  setShowEditModal(false);
                  setEditFormData(null);
                }}
                submitLabel="Save Changes"
                showDelete={true}
                onDelete={deleteActivity}
              />
            )}
          </Modal.Body>
        </Modal>

        <div className="space-y-8">
          {dates.map((dateKey) => {
            const dayImpacts = groupedImpacts[dateKey] || [];

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

            return (
              <div key={dateKey} className="space-y-4">
                <div className="sticky top-0 bg-background/95 backdrop-blur z-20 pb-3 border-b border-border">
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {displayDate}
                    {isTodayFlag && (
                      <span className="ml-2 text-sm font-normal text-primary">
                        (Today)
                      </span>
                    )}
                  </h2>

                  {/* Daily Summary Bar */}
                  {isTodayFlag && dayImpacts.length > 0 ? (
                    <LiveSummaryBar
                      dayImpacts={dayImpacts}
                      isTodayFlag={isTodayFlag}
                      getDurationInMs={getDurationInMs}
                      getActivityColor={getActivityColor}
                    />
                  ) : dayImpacts.length > 0 ? (
                    // Static summary for past days
                    (() => {
                      const daySummary = calculateDaySummary(dayImpacts);
                      const totalPercentageFilled = daySummary.reduce((sum, s) => sum + s.percentage, 0);

                      return (
                        <div className="flex h-8 rounded-lg overflow-hidden border border-border">
                          {daySummary.map((summary, idx) => (
                            <div
                              key={`${summary.activity}-${idx}`}
                              className={`${summary.color} flex items-center justify-center text-xs text-white font-medium border-r border-background/30`}
                              style={{
                                width: `${summary.percentage}%`,
                                borderRightWidth: idx === daySummary.length - 1 ? '0' : '2px'
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
                        </div>
                      );
                    })()
                  ) : null}

                </div>

                {/* Timeline - Side by Side Layout with Time Alignment */}
                <div className="relative">
                  {/* Get day start time for positioning */}
                  {(() => {
                    const [year, month, day] = dateKey.split('-').map(Number);
                    const dayStart = new Date(year, month - 1, day).getTime();
                    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

                    // Get AW events for this day
                    const allAWEvents = getFilteredAWEventsForDate(dateKey);
                    const awEvents = allAWEvents.filter(e => e.bucketType !== 'afkstatus');
                    const afkEvents = allAWEvents.filter(e => e.bucketType === 'afkstatus');

                    // Pre-calculate AFK status for 15-min blocks
                    const afkMap = new Map<number, boolean>();
                    const blockSize = 15 * 60 * 1000;
                    
                    if (afkEvents.length > 0) {
                      afkEvents.forEach(event => {
                        const isActive = event.displayName === 'Active' || event.eventData.status === 'not-afk';
                        const eventStart = event.timestamp;
                        const eventEnd = eventStart + (event.duration * 1000);
                        
                        const firstBlockStart = Math.floor(eventStart / blockSize) * blockSize;
                        const lastBlockStart = Math.floor(eventEnd / blockSize) * blockSize;
                        
                        for (let blockStart = firstBlockStart; blockStart <= lastBlockStart; blockStart += blockSize) {
                           const blockEnd = blockStart + blockSize;
                           const overlapStart = Math.max(eventStart, blockStart);
                           const overlapEnd = Math.min(eventEnd, blockEnd);
                           if (overlapEnd > overlapStart) {
                             const currentStatus = afkMap.get(blockStart);
                             if (currentStatus === true || (currentStatus === undefined && isActive)) {
                               afkMap.set(blockStart, isActive);
                             }
                           }
                        }
                      });
                    }

                    const checkPresence = (time: number) => {
                       // Align to block start
                       const blockStart = Math.floor(time / blockSize) * blockSize;
                       return afkMap.get(blockStart) === true;
                    };

                    // Create 15-minute time blocks, then merge consecutive blocks with same activity
                    let timeBlocks: any[] = [];
                    if (awEvents.length > 0) {
                      // First chunk into 15-minute blocks (loginwindow is handled in dominant activity selection)
                      // We include ALL events here, including loginwindow
                      const chunks = chunkEventsIntoTimeBlocks(awEvents, DEFAULT_BLOCK_SIZE_MINUTES);
                      // Then merge consecutive blocks with same dominant activity
                      // This will also merge consecutive loginwindow-only blocks
                      timeBlocks = mergeConsecutiveBlocks(chunks);
                    }

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Manual Activities */}
                        {filterSettings.showManual && (
                          <div className="relative pl-8" style={{ minHeight: '200px' }}>
                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border"></div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Manual Activities</h3>

                            {dayImpacts.map((impact, index) => {
                              const isFirstItem = index === 0;
                              const isLive = isTodayFlag && isFirstItem;

                              let duration = null;
                              let endTime: number;
                              let durationMs: number;

                              if (isFirstItem && !isTodayFlag) {
                                // For past days, calculate static duration
                                const dayEnd = new Date(impact.date);
                                dayEnd.setHours(24, 0, 0, 0);
                                endTime = dayEnd.getTime();
                                duration = getDuration(impact.date, endTime);
                                durationMs = getDurationInMs(impact.date, endTime);
                              } else if (!isFirstItem) {
                                const nextActivity = dayImpacts[index - 1];
                                endTime = nextActivity.date;
                                duration = getDuration(impact.date, endTime);
                                durationMs = getDurationInMs(impact.date, endTime);
                              } else {
                                // For live activities, we'll use LiveActivityDuration component
                                // Calculate a temporary duration for bar height
                                durationMs = Date.now() - impact.date;
                                // For live activities, end time is effectively now
                                endTime = Date.now();
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
                                   className="relative flex items-start group/manual-entry"
                                 >
                                  <div
                                    className={`absolute left-[-1.45rem] w-1 ${getActivityColor(
                                      impact
                                    )} ${isLive ? 'animate-pulse' : ''}`}
                                    style={{ height: `${barHeight}px` }}
                                  ></div>

                                  {/* Sub-slots Overlay (Visible on Hover) */}
                                  <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none group-hover/manual-entry:pointer-events-auto z-10">
                                      {(() => {
                                        // Generate 15-minute slots for the duration of this activity
                                        // Iterate BACKWARDS from End Time to Start Time (Future -> Past)
                                        // This places Newest Slots at the TOP of the visual block, matching the global timeline flow.
                                        const slots: JSX.Element[] = [];
                                        const slotSize = 15 * 60 * 1000;
                                        
                                        // For live activity, endTime is now-ish
                                        const effectiveEndTime = isLive ? Date.now() : endTime;
                                        const durationMs = effectiveEndTime - impact.date;

                                        // We only want to show slots if duration is sufficient (e.g. > 20 mins)
                                        if (durationMs < 20 * 60 * 1000) return null;

                                        // Start one slot-step back from the end
                                        let currentSlotTime = effectiveEndTime - (10 * 60 * 1000); // Small offset from pure end
                                        // actually let's stick to 15m steps from start, but render reverse? 
                                        // No, simpler to just loop backwards.
                                        
                                        // Aligning? The previous code didn't align, it just did start + 15m.
                                        // Let's do end - 15m, end - 30m... to keep relative consistency.
                                        currentSlotTime = effectiveEndTime - slotSize;

                                        while (currentSlotTime > impact.date + (5 * 60 * 1000)) { // Don't show slot too close to start
                                            // Calculate position: 0px = effectiveEndTime (Top). Height px = impact.date (Bottom).
                                            // But wait, the previous logic had slotTop = (current - start) scale. (Start=0).
                                            // The container renders DOWN.
                                            // If we want Future at Top (Newest Top), and Start is Oldest.
                                            // Then Start Time (14:00) should be at Bottom (Height).
                                            // End Time (15:00) should be at Top (0).
                                            // So 0px corresponds to effectiveEndTime.
                                            
                                            const timeFromEnd = effectiveEndTime - currentSlotTime;
                                            const slotTop = (timeFromEnd / (1000 * 60)) * 2;
                                            
                                            const thisSlotTime = currentSlotTime;

                                            slots.push(
                                                <div 
                                                    key={`slot-${thisSlotTime}`}
                                                    className="absolute left-[-3.5rem] w-12 h-5 flex items-center justify-end opacity-0 hover:opacity-100 transition-opacity cursor-pointer transform hover:scale-105 group/slot"
                                                    style={{ top: `${slotTop - 10}px` }} // Center vertically
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const date = new Date(thisSlotTime);
                                                        const dateStr = date.toISOString().split('T')[0];
                                                        const timeStr = date.toTimeString().slice(0, 5);
                                                        
                                                        setAddFormInitialData({
                                                            activity: "",
                                                            date: dateStr,
                                                            time: timeStr,
                                                            goalId: "",
                                                        });
                                                        setShowAddModal(true);
                                                    }}
                                                    title={`Insert activity at ${formatTime(thisSlotTime)}`}
                                                >
                                                    {/* Time Label */}
                                                    <span className="text-[10px] font-mono text-muted-foreground mr-1 opacity-0 group-hover/slot:opacity-100 transition-opacity bg-background px-1 rounded shadow-sm">
                                                      {formatTime(thisSlotTime)}
                                                    </span>
                                                    
                                                    <div className="w-5 h-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground shrink-0 z-10">
                                                        <span className="text-[10px] font-bold">+</span>
                                                    </div>
                                                    {/* Line indicator */}
                                                    <div className="absolute right-[-2rem] w-[2rem] h-px bg-primary/30 pointer-events-none" />
                                                </div>
                                            );
                                            
                                            currentSlotTime -= slotSize;
                                        }
                                        return slots;
                                      })()}
                                  </div>

                                  <div
                                    className={`bg-card border-b hover:shadow-md transition-shadow cursor-pointer flex-1 min-w-0 ${
                                      isLive ? 'border-b-primary border-b-2' : 'border-b-border'
                                    } ${isShortActivity ? 'pb-2' : 'pb-3'}`}
                                    style={{ minHeight: `${barHeight}px` }}
                                    onClick={() => openEditModal(impact, actualIndex)}
                                  >
                                    <div className="flex items-center justify-between sticky top-[5.4rem] z-10 bg-card/80 backdrop-blur-sm pr-2 rounded py-1 -my-1">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className={`text-sm font-mono whitespace-nowrap shrink-0 ${isLive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                          {formatTime(impact.date)}
                                        </span>
                                        <h3 className={`text-base font-semibold truncate ${isLive ? 'text-primary' : 'text-foreground'}`}>
                                          {impact.activity}
                                        </h3>
                                        {isLive && <span className="text-xs text-primary whitespace-nowrap shrink-0">(Live)</span>}
                                      </div>
                                      {isLive ? (
                                        <LiveActivityDuration
                                          startTime={impact.date}
                                          formatDuration={getDuration}
                                        />
                                      ) : duration && (
                                        <span className="text-sm px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                                          {duration}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Render GapBlocks for the morning (empty space before first activity) */}
                            {(() => {
                              // Identify the start time of the earliest activity (or now/end of day if no activities)
                              // dayImpacts is sorted Newest First, so the LAST item is the EARLIEST.
                              let current: number;
                              
                              if (dayImpacts.length > 0) {
                                current = dayImpacts[dayImpacts.length - 1].date;
                              } else {
                                // If no activities, start from Now (if today) or End of Day (if past)
                                // But if it's today, we might want to round Now to nearest 15?
                                // Let's use current time uncapped? or rounded?
                                // GapBlock handles arbitrary times?
                                // GapBlock uses (endTime - startTime) for height.
                                // Let's use strict 15-min alignment if possible for neatness, but here we are filling precise gap.
                                current = isTodayFlag ? Date.now() : dayEnd;
                              }
                              
                              const gapCeiling = current;
                              
                              const gaps: JSX.Element[] = [];
                              
                              // We fill DOWN to dayStart
                              while (current > dayStart) {
                                // Create 15-min chunks, but clamp to dayStart
                                // Since we go backwards:
                                // End = current
                                // Start = Max(dayStart, current - 15min)
                                
                                const chunkStart = Math.max(dayStart, current - (15 * 60 * 1000));
                                const chunkEnd = current;
                                
                                if (chunkEnd > chunkStart) {
                                  // Logic to handle "Expanding Draft"
                                  // If we are editing a gap that is part of this sequence, we want the Draft entry
                                  // to visually fill the space from its start UP TO the gapCeiling (the next activity or now).
                                  // This means we should SKIP rendering any gaps that are "above" the edited one (between edit and ceiling).
                                  
                                  const isOccludedByDraft = editingGapStart !== null && 
                                                           chunkStart > editingGapStart && 
                                                           chunkStart < gapCeiling;

                                  if (isOccludedByDraft) {
                                    // Do nothing, this gap is covered by the expanded draft below it
                                  } 
                                  else if (editingGapStart === chunkStart) {
                                    // This is the gap being edited. Render Draft expanding up to ceiling.
                                    gaps.push(
                                      <DraftTimelineEntry
                                        key={`draft-${chunkStart}`}
                                        startTime={chunkStart}
                                        endTime={gapCeiling} // Expand to fill the whole gap
                                        formatTime={formatTime}
                                        onCancel={() => setEditingGapStart(null)}
                                        onSubmit={handleInlineSubmit}
                                      />
                                    );
                                  } else {
                                    // Normal gap
                                    gaps.push(
                                      <GapBlock
                                        key={`gap-morning-${chunkStart}`}
                                        startTime={chunkStart}
                                        endTime={chunkEnd}
                                        formatTime={formatTime}
                                        onClick={() => setEditingGapStart(chunkStart)}
                                      />
                                    );
                                  }
                                }
                                
                                current = chunkStart;
                              }
                              
                              return gaps;
                            })()}
                            </div>
                          )}

                        {/* Right Column: ActivityWatch Events (Time Blocks) - Time Aligned */}
                        {filterSettings.showActivityWatch && timeBlocks.length > 0 && (
                          <div className="relative pl-8" style={{ minHeight: '200px' }}>
                            {/* Vertical AFK Presence Bar */}


                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border"></div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                              ActivityWatch Events
                              <span className="ml-2 text-xs font-normal">
                                {timeBlocks.length} blocks • {awEvents.length} events
                              </span>
                            </h3>

                            {/* ActivityWatch Events (Time Blocks) - Time Aligned */}
                            {(() => {
                              // Sort blocks in descending order (newest first) to match manual activities
                              const sortedBlocks = [...timeBlocks].sort((a, b) => b.startTime - a.startTime);
                              
                              if (sortedBlocks.length === 0) {
                                // If no AW events, fill the whole day with gaps
                                const dayTop = isTodayFlag ? roundToNearest15Minutes(Date.now()) : dayEnd;
                                const gaps: JSX.Element[] = [];
                                let current = dayTop;
                                while (current > dayStart) {
                                  const chunkStart = Math.max(dayStart, current - (15 * 60 * 1000));
                                  const chunkEnd = current;
                                  gaps.push(
                                    <GapBlock
                                      key={`gap-empty-${chunkStart}`}
                                      startTime={chunkStart}
                                      endTime={chunkEnd}
                                      formatTime={formatTime}
                                      isPresenceActive={checkPresence}
                                    />
                                  );
                                  current = chunkStart;
                                }
                                return gaps;
                              }

                              const blockElements = sortedBlocks.map((block, idx) => {
                                  const gapElements: JSX.Element[] = [];

                                  if (idx === 0) {
                                    // For first block (newest), fill gap from Top of Day down to this block
                                    const dayTop = isTodayFlag ? roundToNearest15Minutes(Date.now()) : dayEnd;
                                    const gapTop = dayTop;
                                    const gapBottom = block.endTime;
                                    
                                    let current = gapTop;
                                    while (current > gapBottom) {
                                      const chunkStart = Math.max(gapBottom, current - (15 * 60 * 1000));
                                      const chunkEnd = current;
                                      
                                      gapElements.push(
                                        <GapBlock
                                          key={`gap-top-${chunkStart}`}
                                          startTime={chunkStart}
                                          endTime={chunkEnd}
                                          formatTime={formatTime}
                                          isPresenceActive={checkPresence}
                                        />
                                      );
                                      current = chunkStart;
                                    }
                                  } else {
                                    const prevBlock = sortedBlocks[idx - 1];
                                    // Calculate gap between blocks
                                    const gapStartTime = prevBlock.startTime; // Start of newer block (visual bottom of prev)
                                    const gapEndTime = block.endTime; // End of older block (visual top of current)
                                    
                                    // Fill with 15-min gap blocks
                                    let current = gapStartTime;
                                    while (current > gapEndTime) {
                                      const chunkStart = Math.max(gapEndTime, current - (15 * 60 * 1000));
                                      const chunkEnd = current;
                                      
                                      gapElements.push(
                                        <GapBlock
                                          key={`gap-between-${chunkStart}`}
                                          startTime={chunkStart}
                                          endTime={chunkEnd}
                                          formatTime={formatTime}
                                          isPresenceActive={checkPresence}
                                        />
                                      );
                                      
                                      current = chunkStart;
                                    }
                                  }

                                  const isInactive = isLoginWindowOnlyBlock(block);

                                  return (
                                    <div
                                      key={`block-wrapper-${block.startTime}-${idx}`}
                                      style={{ marginBottom: '0px' }}
                                    >
                                      {/* Render gaps between blocks first */}
                                      {gapElements}
                                      
                                      <div>
                                        {isInactive ? (
                                          // Render inactive blocks as a series of GapBlocks
                                          (() => {
                                            const inactiveGaps: JSX.Element[] = [];
                                            let current = block.endTime;
                                            while (current > block.startTime) {
                                              const chunkStart = Math.max(block.startTime, current - (15 * 60 * 1000));
                                              const chunkEnd = current;
                                              
                                              inactiveGaps.push(
                                                <GapBlock
                                                  key={`gap-inactive-${chunkStart}`}
                                                  startTime={chunkStart}
                                                  endTime={chunkEnd}
                                                  formatTime={formatTime}
                                                  isPresenceActive={checkPresence}
                                                />
                                              );
                                              current = chunkStart;
                                            }
                                            return <>{inactiveGaps}</>;
                                          })()
                                        ) : (
                                          <TimeBlockEntry
                                            block={block}
                                            formatTime={formatTime}
                                            formatDuration={formatDuration}
                                            onEventClick={handleAWEventClick}
                                            // onCreateManual prop removed as requested
                                            isExpanded={expandedBlockStart === block.startTime}
                                            onToggleExpand={() => {
                                                setExpandedBlockStart(
                                                    expandedBlockStart === block.startTime ? null : block.startTime
                                                );
                                            }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  );
                              });

                              // Add Bottom/Morning Gaps (from oldest block start down to dayStart)
                              const oldestBlockStartTime = sortedBlocks[sortedBlocks.length - 1].startTime;
                              const bottomGaps: JSX.Element[] = [];
                              let current = oldestBlockStartTime;
                              while (current > dayStart) {
                                const chunkStart = Math.max(dayStart, current - (15 * 60 * 1000));
                                const chunkEnd = current;
                                bottomGaps.push(
                                  <GapBlock
                                    key={`gap-bottom-${chunkStart}`}
                                    startTime={chunkStart}
                                    endTime={chunkEnd}
                                    formatTime={formatTime}
                                  />
                                );
                                current = chunkStart;
                              }

                              return [...blockElements, ...bottomGaps];
                              })()}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* AFK Status Indicator */}
                {filterSettings.showActivityWatch && (() => {
                  const afkEvents = getFilteredAWEventsForDate(dateKey).filter(
                    e => e.bucketType === 'afkstatus'
                  );

                  if (afkEvents.length === 0) return null;

                  // Process AFK events into 15-minute blocks
                  const [year, month, day] = dateKey.split('-').map(Number);
                  const dayStart = new Date(year, month - 1, day).getTime();
                  const dayDuration = 24 * 60 * 60 * 1000;
                  const blockSize = 15 * 60 * 1000; // 15 minutes in ms

                  // Create map of 15-minute blocks
                  const afkBlocks = new Map<number, boolean>(); // blockStartTime -> isActive

                  afkEvents.forEach(event => {
                    const isActive = event.displayName === 'Active' || event.eventData.status === 'not-afk';
                    const eventStart = event.timestamp;
                    const eventEnd = eventStart + (event.duration * 1000);

                    // Find all 15-minute blocks this event overlaps with
                    const firstBlockStart = Math.floor(eventStart / blockSize) * blockSize;
                    const lastBlockStart = Math.floor(eventEnd / blockSize) * blockSize;

                    for (let blockStart = firstBlockStart; blockStart <= lastBlockStart; blockStart += blockSize) {
                      const blockEnd = blockStart + blockSize;

                      // Calculate overlap between event and block
                      const overlapStart = Math.max(eventStart, blockStart);
                      const overlapEnd = Math.min(eventEnd, blockEnd);
                      const overlapDuration = overlapEnd - overlapStart;

                      if (overlapDuration > 0) {
                        // Mark block as active if any part of it was active
                        const currentStatus = afkBlocks.get(blockStart);
                        if (currentStatus !== false && isActive) {
                          afkBlocks.set(blockStart, true);
                        } else if (currentStatus === undefined) {
                          afkBlocks.set(blockStart, isActive);
                        }
                      }
                    }
                  });

                  // Convert blocks to array for rendering
                  const sortedBlocks = Array.from(afkBlocks.entries()).sort((a, b) => a[0] - b[0]);

                  return (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-sm font-semibold text-foreground">Presence Status (15-min blocks)</h4>
                        <span className="text-xs text-muted-foreground">({sortedBlocks.length} blocks)</span>
                      </div>
                      <div className="relative h-8 bg-background rounded border border-border overflow-hidden">
                        {sortedBlocks.map(([blockStart, isActive], idx) => {
                          const blockOffset = blockStart - dayStart;
                          const leftPercent = (blockOffset / dayDuration) * 100;
                          const widthPercent = (blockSize / dayDuration) * 100;

                          const bgColor = isActive ? 'bg-green-500' : 'bg-gray-400';
                          const blockEnd = blockStart + blockSize;

                          return (
                            <div
                              key={`afk-block-${blockStart}-${idx}`}
                              className={`absolute top-0 bottom-0 ${bgColor} opacity-80 hover:opacity-100 transition-opacity`}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              title={`${isActive ? 'Active' : 'Away'}: ${formatTime(blockStart)} - ${formatTime(blockEnd)}`}
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

                      {/* Online Presence Card */}
                      {(() => {
                     const allAWEvents = getFilteredAWEventsForDate(dateKey);
                     const afkEvents = allAWEvents.filter(e => e.bucketType === 'afkstatus');
                     
                     if (afkEvents.length === 0) return null;

                     // Calculate total active time
                     let totalActiveTime = 0;

                     afkEvents.forEach(event => {
                       const isActive = event.displayName === 'Active' || event.eventData.status === 'not-afk';
                       if (!isActive) return;

                       const eventStart = event.timestamp;
                       const eventEnd = eventStart + (event.duration * 1000);

                       // Find all 15-minute blocks this event overlaps with (to match visual bar logic)
                       // Or we could just sum raw duration? The user asked for "Online Presence" which usually matches the bar.
                       // Let's sum raw duration for accuracy, but respecting the day boundaries.
                       
                       const [y, m, d] = dateKey.split('-').map(Number);
                       const dayStart = new Date(y, m - 1, d).getTime();
                       const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

                       const effectiveStart = Math.max(eventStart, dayStart);
                       const effectiveEnd = Math.min(eventEnd, dayEnd);
                       
                       if (effectiveEnd > effectiveStart) {
                         totalActiveTime += (effectiveEnd - effectiveStart);
                       }
                     });

                     return (
                       <div className="mt-2 flex">
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-md border border-green-500/20">
                           <span className="text-sm font-medium">Online Presence: {formatDuration(totalActiveTime)}</span>
                         </div>
                       </div>
                     );
                  })()}
                    </div>
                  );
                })()}

              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {hasMoreDays && (
          <div className="flex justify-center mt-8 mb-4">
            <button
              onClick={() => setDaysToShow(prev => prev + 5)}
              className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              Load Next 5 Days
              <span className="text-xs text-muted-foreground">
                ({allDates.length - daysToShow} remaining)
              </span>
            </button>
          </div>
        )}

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
