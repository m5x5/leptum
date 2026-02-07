import Head from "next/head";
import Image from "next/image";
import { useEffect, useState, useMemo, useCallback } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";
import { PlusIcon, TrashIcon, UploadIcon, FilterIcon } from "@heroicons/react/solid";
import Modal from "../components/Modal";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import { useActivityWatch } from "../utils/useActivityWatch";
import { useMentions } from "../utils/useMentions";
import { usePhotoAttachments, PhotoAttachment } from "../utils/usePhotoAttachments";
import { extractMentionedEntityIds, HighlightedMentions } from "../components/ui/mention-input";
import FilterControls from "../components/Timeline/FilterControls";
      import { ActivityWatchEntry, EventGroupEntry, TimeBlockEntry, GapBlock } from "../components/Timeline/TimelineEntry";

import { ProcessedAWEvent, EventGroup } from "../activity-watch.d";
import { groupAdjacentEvents, DEFAULT_GROUP_GAP_MINUTES } from "../utils/activityWatch";
      import { chunkEventsIntoTimeBlocks, mergeConsecutiveBlocks, isLoginWindowOnlyBlock, DEFAULT_BLOCK_SIZE_MINUTES } from "../utils/timeBlocks";

import ActivityForm from "../components/Timeline/ActivityForm";
import ImportActivityWatchForm from "../components/Timeline/ImportActivityWatchForm";
import DraftTimelineEntry from "../components/Timeline/DraftTimelineEntry";
import { LiveActivityDuration } from "../components/Timeline/LiveActivityDuration";
import { LiveSummaryBar } from "../components/Timeline/LiveSummaryBar";
import { TimelineScheduleView } from "../components/Timeline/TimelineScheduleView";
import { TimelineWeekView } from "../components/Timeline/TimelineWeekView";

interface Impact {
  id?: string;
  activity: string;
  date: number;
  goalId?: string;
  stress?: string | number;
  fulfillment?: string | number;
  motivation?: string | number;
  cleanliness?: string | number;
  energy?: string | number;
  isVirtualContinuation?: boolean;
  originalStartTime?: number;
  photoIds?: string[];
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
  const [showMobileAddDrawer, setShowMobileAddDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMobileEditDrawer, setShowMobileEditDrawer] = useState(false);
  const [editingImpact, setEditingImpact] = useState<Impact | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editFormData, setEditFormData] = useState<{
    activity: string;
    date: string;
    time: string;
    goalId: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addFormInitialData, setAddFormInitialData] = useState<{
    activity: string;
    date: string;
    time: string;
    goalId: string;
  } | null>(null);

  // ActivityWatch state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMobileImportDrawer, setShowMobileImportDrawer] = useState(false);
  const [showAWDetailModal, setShowAWDetailModal] = useState(false);
  const [showMobileAWDetailDrawer, setShowMobileAWDetailDrawer] = useState(false);
  const [selectedAWEvent, setSelectedAWEvent] = useState<ProcessedAWEvent | null>(null);
  const [showMobileFiltersDrawer, setShowMobileFiltersDrawer] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);

  // State for collapsible detailed activities in timeline
  const [expandedBlockStart, setExpandedBlockStart] = useState<number | null>(null);

  // State for inline adding in gaps
  const [editingGapStart, setEditingGapStart] = useState<number | null>(null);

  // State for summary bar hover
  const [summaryBarHover, setSummaryBarHover] = useState<{
    dateKey: string;
    percent: number;
    activity: string;
    time: string;
  } | null>(null);

  // State for presence bar hover
  const [presenceBarHover, setPresenceBarHover] = useState<{
    dateKey: string;
    percent: number;
    status: string;
    time: string;
  } | null>(null);

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

  // Listen for openAddActivity event from header button
  useEffect(() => {
    const handleOpenAddActivity = () => {
      // Round current time to nearest 15 minutes
      const roundedTimestamp = roundToNearest15Minutes(Date.now());
      const { dateStr, timeStr } = getLocalDateTimeStrings(roundedTimestamp);
      setAddFormInitialData({
        activity: "",
        date: dateStr,
        time: timeStr,
        goalId: "",
      });
      setShowAddModal(true);
    };
    window.addEventListener('openAddActivity', handleOpenAddActivity);
    return () => {
      window.removeEventListener('openAddActivity', handleOpenAddActivity);
    };
  }, []);

  // Pagination state
  const [daysToShow, setDaysToShow] = useState(3);

  // View mode state - default to schedule on mobile, day on desktop
  const [viewMode, setViewMode] = useState<"day" | "schedule" | "week">(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? "schedule" : "day";
    }
    return "day";
  });

  // Active date for navigation highlighting
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  // Scroll to a specific date
  const scrollToDate = (dateKey: string) => {
    const element = document.getElementById(`day-${dateKey}`);
    if (element) {
      // Get the offset position accounting for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 120; // 120px for sticky nav + padding
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      setActiveDateKey(dateKey);
    }
  };


  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
  const { updateMentionsForSource, deleteMentionsForSource } = useMentions();
  const {
    photos,
    addPhoto,
    deletePhoto,
    deletePhotosForImpact,
    getPhotosForImpact,
  } = usePhotoAttachments();
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
      // Filter out virtual continuations before saving
      const realImpacts = newImpacts.filter(imp => !imp.isVirtualContinuation);
      await remoteStorageClient.saveImpacts(realImpacts);
      const sortedData = [...realImpacts].sort((a, b) => b.date - a.date);
      setImpacts(sortedData);
    } catch (error) {
      console.error("Failed to save impacts:", error);
    }
  };

  const addNewActivity = async (formData: {
    activity: string;
    date: string;
    time: string;
    goalId: string;
    pendingPhotos?: Array<{ id: string; file: File; thumbnail: string; width: number; height: number }>;
  }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    // Generate unique ID for the impact
    const impactId = `impact-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    const newImpact: Impact = {
      id: impactId,
      activity: formData.activity,
      date: timestamp,
    };

    if (formData.goalId) {
      newImpact.goalId = formData.goalId;
    }

    // Handle photo uploads
    if (formData.pendingPhotos && formData.pendingPhotos.length > 0) {
      const photoIds: string[] = [];
      for (const pendingPhoto of formData.pendingPhotos) {
        const photo = await addPhoto(impactId, pendingPhoto.file);
        if (photo) {
          photoIds.push(photo.id);
        }
      }
      if (photoIds.length > 0) {
        newImpact.photoIds = photoIds;
      }
    }

    const updatedImpacts = [...impacts, newImpact];
    await saveImpacts(updatedImpacts);

    // Track mentions
    const entityIds = extractMentionedEntityIds(formData.activity);
    await updateMentionsForSource('impact', impactId, 'activity', entityIds, formData.activity);

    setShowAddModal(false);
    setShowMobileAddDrawer(false);
    setAddFormInitialData(null);
  };

  const handleInlineSubmit = (data: { activity: string; goalId: string }) => {
  if (!editingGapStart) return;
  
  const { dateStr, timeStr } = getLocalDateTimeStrings(editingGapStart);
  
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

    const { dateStr, timeStr } = getLocalDateTimeStrings(impact.date);

    setEditFormData({
      activity: impact.activity,
      date: dateStr,
      time: timeStr,
      goalId: impact.goalId || "",
    });

    if (window.innerWidth < 768) {
      setShowMobileEditDrawer(true);
    } else {
      setShowEditModal(true);
    }
  };

  const saveEditedActivity = async (formData: {
    activity: string;
    date: string;
    time: string;
    goalId: string;
    pendingPhotos?: Array<{ id: string; file: File; thumbnail: string; width: number; height: number }>;
  }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    const updatedImpacts = [...impacts];
    const existingImpact = updatedImpacts[editingIndex];

    // Ensure the impact has an ID (for backwards compatibility with existing data)
    const impactId = existingImpact.id || `impact-${existingImpact.date}-${Math.random().toString(36).substr(2, 9)}`;

    // Handle new photo uploads
    let photoIds = existingImpact.photoIds || [];
    if (formData.pendingPhotos && formData.pendingPhotos.length > 0) {
      for (const pendingPhoto of formData.pendingPhotos) {
        const photo = await addPhoto(impactId, pendingPhoto.file);
        if (photo) {
          photoIds.push(photo.id);
        }
      }
    }

    updatedImpacts[editingIndex] = {
      ...existingImpact,
      id: impactId,
      activity: formData.activity,
      date: timestamp,
      goalId: formData.goalId || undefined,
      photoIds: photoIds.length > 0 ? photoIds : undefined,
    };

    await saveImpacts(updatedImpacts);

    // Track mentions
    const entityIds = extractMentionedEntityIds(formData.activity);
    await updateMentionsForSource('impact', impactId, 'activity', entityIds, formData.activity);

    setShowEditModal(false);
    setShowMobileEditDrawer(false);
    setEditingImpact(null);
    setEditingIndex(-1);
    setEditFormData(null);
  };

  // Handle photo deletion from edit form
  const handleDeletePhotoFromImpact = async (photoId: string) => {
    if (!editingImpact || editingIndex < 0) return;

    // Delete the photo
    await deletePhoto(photoId);

    // Update the impact's photoIds
    const updatedImpacts = [...impacts];
    const existingImpact = updatedImpacts[editingIndex];
    const updatedPhotoIds = (existingImpact.photoIds || []).filter(id => id !== photoId);

    updatedImpacts[editingIndex] = {
      ...existingImpact,
      photoIds: updatedPhotoIds.length > 0 ? updatedPhotoIds : undefined,
    };

    await saveImpacts(updatedImpacts);
    setEditingImpact(updatedImpacts[editingIndex]);
  };

  const deleteActivity = async () => {
    const impactToDelete = impacts[editingIndex];
    const impactId = impactToDelete.id;

    // Delete mentions if the impact has an ID
    if (impactId) {
      await deleteMentionsForSource('impact', impactId);
      // Delete associated photos
      await deletePhotosForImpact(impactId);
    }

    const updatedImpacts = impacts.filter((_, index) => index !== editingIndex);
    await saveImpacts(updatedImpacts);

    setShowDeleteConfirm(false);
    setShowEditModal(false);
    setShowMobileEditDrawer(false);
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

  // Extract date and time strings in local time (not UTC) for form inputs
  const getLocalDateTimeStrings = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hours}:${minutes}`
    };
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

  const groupByDate = useCallback((impactsToGroup: Impact[]) => {
    const toDateKey = (timestamp: number) => {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const now = Date.now();
    const todayKey = toDateKey(now);

    const sortedImpacts = [...impactsToGroup].sort((a, b) => b.date - a.date);
    const grouped: { [key: string]: Impact[] } = {};

    sortedImpacts.forEach((impact, index) => {
      let endTime: number;

      if (index === 0) {
        const impactDateKey = toDateKey(impact.date);
        if (impactDateKey === todayKey) {
          endTime = now;
        } else {
          const dayEnd = new Date(impact.date);
          dayEnd.setHours(24, 0, 0, 0);
          endTime = dayEnd.getTime();
        }
      } else {
        endTime = sortedImpacts[index - 1].date;
      }

      const startDateKey = toDateKey(impact.date);
      const endDateKey = toDateKey(endTime);

      if (!grouped[startDateKey]) {
        grouped[startDateKey] = [];
      }
      grouped[startDateKey].push(impact);

      if (startDateKey !== endDateKey) {
        const nextDayStart = new Date(impact.date);
        nextDayStart.setHours(24, 0, 0, 0);
        const nextDateKey = toDateKey(nextDayStart.getTime());

        if (nextDateKey === endDateKey) {
          const virtualImpact: Impact = {
            id: impact.id,
            activity: impact.activity,
            date: nextDayStart.getTime(),
            goalId: impact.goalId,
            isVirtualContinuation: true,
            originalStartTime: impact.date,
          };

          if (!grouped[nextDateKey]) {
            grouped[nextDateKey] = [];
          }
          grouped[nextDateKey].push(virtualImpact);
        }
      }
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => b.date - a.date);
    });

    return grouped;
  }, []);

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

  const groupedImpacts = useMemo(() => groupByDate(impacts), [impacts, groupByDate]);

  // Get all dates that have either manual impacts or AW events
  const allDates = useMemo(() => {
    const dateSet = new Set<string>(Object.keys(groupedImpacts));

    // Add dates from AW events if they exist
    if (awData && filterSettings.showActivityWatch) {
      awData.events.forEach((event) => {
        const dateKey = formatDateKey(event.timestamp);
        dateSet.add(dateKey);
      });
    }

    return Array.from(dateSet).sort().reverse();
  }, [groupedImpacts, awData, filterSettings.showActivityWatch]);

  const dates = allDates.slice(0, daysToShow);
  const hasMoreDays = allDates.length > daysToShow;

  // Track which date is currently in view
  useEffect(() => {
    if (viewMode !== "day" || dates.length === 0) return;

    // Set initial active date to the first (most recent) date
    if (!activeDateKey && dates.length > 0) {
      setActiveDateKey(dates[0]);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that's most visible in the upper portion of viewport
        const visibleEntries = entries.filter(e => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio, prefer entries higher in viewport
          const sorted = visibleEntries.sort((a, b) => {
            const aTop = a.boundingClientRect.top;
            const bTop = b.boundingClientRect.top;
            // Prefer entries closer to top of viewport
            if (Math.abs(aTop - 100) < Math.abs(bTop - 100)) return -1;
            if (Math.abs(aTop - 100) > Math.abs(bTop - 100)) return 1;
            return b.intersectionRatio - a.intersectionRatio;
          });
          
          const mostVisible = sorted[0];
          const dateKey = mostVisible.target.id.replace('day-', '');
          setActiveDateKey(dateKey);
        }
      },
      {
        rootMargin: '-100px 0px -60% 0px', // Consider date "active" when it's near the top of viewport
        threshold: [0, 0.1, 0.5],
      }
    );

    dates.forEach((dateKey) => {
      const element = document.getElementById(`day-${dateKey}`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      dates.forEach((dateKey) => {
        const element = document.getElementById(`day-${dateKey}`);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [dates, viewMode, activeDateKey]);

  const AWEventDetailContent = ({ event, onCreateManualEntry, onClose }: { event: ProcessedAWEvent, onCreateManualEntry?: (event: ProcessedAWEvent) => void, onClose: () => void }) => {
    return (
      <div className="space-y-4 mt-4">
        {/* Header Info */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <div className={`w-3 h-12 rounded-sm ${event.color}`} />
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{event.displayName}</h4>
            <p className="text-sm text-muted-foreground">{event.bucketType}</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Timestamp</p>
              <p className="text-sm text-muted-foreground">
                {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Duration</p>
              <p className="text-sm text-muted-foreground">
                {Math.floor(event.duration / 60)}m {Math.floor(event.duration % 60)}s
              </p>
            </div>
          </div>
        </div>

        {/* Event Data */}
        <div className="border-t border-border pt-4">
          <h5 className="text-sm font-semibold text-foreground mb-2">Event Data</h5>
          <div className="bg-background p-3 rounded-lg border border-border max-h-64 overflow-y-auto">
            <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(event.eventData, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex gap-2 justify-between pt-4">
          {onCreateManualEntry && (
            <button
              onClick={() => {
                onCreateManualEntry(event);
                onClose();
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 font-semibold"
            >
              Create Manual Entry
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80 ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

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

  // Handle add activity for a specific date
  const handleAddActivityForDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const now = new Date();
    
    // If it's today, use current time rounded to 15 minutes
    const isDateToday = 
      year === now.getFullYear() &&
      month === now.getMonth() + 1 &&
      day === now.getDate();
    
    let timestamp: number;
    if (isDateToday) {
      timestamp = roundToNearest15Minutes(Date.now());
    } else {
      // For other days, default to 9:00 AM
      timestamp = new Date(year, month - 1, day, 9, 0, 0).getTime();
    }
    
    const { dateStr, timeStr } = getLocalDateTimeStrings(timestamp);
    
    setAddFormInitialData({
      activity: "",
      date: dateStr,
      time: timeStr,
      goalId: "",
    });
    
    if (window.innerWidth < 768) {
      setShowMobileAddDrawer(true);
    } else {
      setShowAddModal(true);
    }
  };

  // Handle ActivityWatch event click
  const handleAWEventClick = (event: ProcessedAWEvent) => {
    setSelectedAWEvent(event);
    if (window.innerWidth < 768) {
      setShowMobileAWDetailDrawer(true);
    } else {
      setShowAWDetailModal(true);
    }
  };

  // Create manual entry from AW event
  const handleCreateManualEntry = (event: ProcessedAWEvent) => {
    // Round the timestamp to nearest 15 minutes
    const roundedTimestamp = roundToNearest15Minutes(event.timestamp);
    const { dateStr, timeStr } = getLocalDateTimeStrings(roundedTimestamp);

    setAddFormInitialData({
      activity: event.displayName,
      date: dateStr,
      time: timeStr,
      goalId: "",
    });

    if (window.innerWidth < 768) {
      setShowMobileAddDrawer(true);
    } else {
      setShowAddModal(true);
    }
  };

  const getFilteredAWEventsForDate = useCallback((dateKey: string) => {
    if (!awData || !filterSettings.showActivityWatch) {
      return [];
    }

    const [year, month, day] = dateKey.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    return awData.events.filter((event) => {
      if (event.timestamp < dayStart || event.timestamp > dayEnd) return false;
      if (!filterSettings.visibleBuckets.includes(event.bucketId)) return false;
      if (event.isHidden) return false;
      return true;
    });
  }, [awData, filterSettings]);

  // Calculate total active time across all visible days
  const totalActiveTime = useMemo(() => {
    if (!awData || !filterSettings.showActivityWatch) {
      return 0;
    }

    let total = 0;

    dates.forEach((dateKey) => {
      const allAWEvents = getFilteredAWEventsForDate(dateKey);
      const afkEvents = allAWEvents.filter(e => e.bucketType === 'afkstatus');

      afkEvents.forEach(event => {
        const isActive = event.displayName === 'Active' || event.eventData?.status === 'not-afk';
        if (!isActive) return;

        const eventStart = event.timestamp;
        const eventEnd = eventStart + (event.duration * 1000);

        const [y, m, d] = dateKey.split('-').map(Number);
        const dayStart = new Date(y, m - 1, d).getTime();
        const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

        const effectiveStart = Math.max(eventStart, dayStart);
        const effectiveEnd = Math.min(eventEnd, dayEnd);

        if (effectiveEnd > effectiveStart) {
          total += (effectiveEnd - effectiveStart);
        }
      });
    });

    return total;
  }, [awData, filterSettings, dates, getFilteredAWEventsForDate]);

  return (
    <>
      <Head>
        <title>Timeline - Leptum</title>
      </Head>

      <div className="w-full mx-auto pb-32 md:pb-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Timeline</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Daily breakdown of your activities
              </p>
            </div>
            <div className="flex gap-2">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setShowMobileImportDrawer(true);
                } else {
                  setShowImportModal(true);
                }
              }}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 font-semibold"
            >
              <UploadIcon className="w-5 h-5" />
              Import ActivityWatch
            </button>
          </div>
          </div>

          {/* View Tabs */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "day" | "schedule" | "week")} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="day">Day View</TabsTrigger>
              <TabsTrigger value="schedule">Schedule View</TabsTrigger>
              <TabsTrigger value="week">Week View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile Add Activity Button */}
        <button
          onClick={() => {
            // Round current time to nearest 15 minutes
            const roundedTimestamp = roundToNearest15Minutes(Date.now());
            const { dateStr, timeStr } = getLocalDateTimeStrings(roundedTimestamp);
            setAddFormInitialData({
              activity: "",
              date: dateStr,
              time: timeStr,
              goalId: "",
            });
            setShowMobileAddDrawer(true);
          }}
          className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Activity</span>
        </button>

        {/* Mobile Filter Button - Only show in day view */}
        {viewMode === "day" && awData && awData.buckets.length > 0 && (
          <button
            onClick={() => setShowMobileFiltersDrawer(true)}
            className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition mb-6"
          >
            <FilterIcon className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">Filters</span>
            {totalActiveTime > 0 && (
              <span className="ml-auto text-sm text-green-700 dark:text-green-400">
                {formatDuration(totalActiveTime)}
              </span>
            )}
          </button>
        )}

        {/* Desktop Filter Toggle Button */}
        {awData && awData.buckets.length > 0 && (
          <div className="hidden md:block mb-6">
            <button
              onClick={() => setShowDesktopFilters(!showDesktopFilters)}
              className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition"
            >
              <div className="flex items-center gap-2">
                <FilterIcon className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold text-foreground">Filters</span>
                {totalActiveTime > 0 && (
                  <span className="ml-2 px-3 py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-md border border-green-500/20 text-sm font-medium">
                    Online Presence: {formatDuration(totalActiveTime)}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {showDesktopFilters ? "Hide" : "Show"}
              </span>
            </button>
          </div>
        )}

        {/* Filter Controls - Desktop Only */}
        {awData && awData.buckets.length > 0 && showDesktopFilters && (
          <div className="hidden md:block">
            <FilterControls
              filterSettings={filterSettings}
              buckets={awData.buckets}
              onUpdateFilters={updateFilterSettings}
              onToggleBucket={toggleBucket}
              totalActiveTime={totalActiveTime}
              formatDuration={formatDuration}
              forceExpanded={true}
            />
          </div>
        )}

        {/* Error Display */}
        {awError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-500">{awError}</p>
          </div>
        )}

        {/* Loading State */}
        {!isDataLoaded && (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="text-lg text-muted-foreground">Loading timeline data...</p>
          </div>
        )}

        {/* Empty State */}
        {isDataLoaded && impacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="text-lg text-muted-foreground mb-4">No timeline data yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Click &quot;Add Activity&quot; above to start logging your activities
            </p>
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
                onDelete={() => setShowDeleteConfirm(true)}
                existingPhotos={editingImpact?.id ? getPhotosForImpact(editingImpact.id) : []}
                onDeletePhoto={handleDeletePhotoFromImpact}
              />
            )}
          </Modal.Body>
        </Modal>

        {/* Delete Activity Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirm}
          closeModal={() => setShowDeleteConfirm(false)}
        >
          <Modal.Title>Delete Activity</Modal.Title>
          <Modal.Body>
            Are you sure you want to delete &quot;{editingImpact?.activity}&quot;?
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
              >
                Cancel
              </button>
              <button
                onClick={deleteActivity}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </Modal.Footer>
        </Modal>

        {/* Timeline Content - Only show when data is loaded and exists */}
        {isDataLoaded && impacts.length > 0 && (
          <>
            {/* Schedule View */}
            {viewMode === "schedule" && (
              <TimelineScheduleView
                impacts={impacts}
                goals={goals}
                onEditActivity={openEditModal}
                onAddActivity={handleAddActivityForDate}
                daysToShow={daysToShow}
              />
            )}

            {/* Day View */}
            {viewMode === "day" && (
              <>
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
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
              <div key={dateKey} id={`day-${dateKey}`} className="space-y-4 scroll-mt-32">
                <div className="sticky top-0 bg-background z-20 pb-3 border-b border-border">
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
                    // Static summary for past days - positioned by actual time
                    (() => {
                      const [year, month, day] = dateKey.split('-').map(Number);
                      const dayStart = new Date(year, month - 1, day).getTime();
                      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
                      const fullDayInMs = dayEnd - dayStart;

                      // Build timeline segments with actual positions
                      const segments: Array<{
                        activity: string;
                        color: string;
                        startTime: number;
                        endTime: number;
                        startPercent: number;
                        widthPercent: number;
                      }> = [];

                      // dayImpacts are sorted in descending order (most recent first)
                      for (let i = dayImpacts.length - 1; i >= 0; i--) {
                        const current = dayImpacts[i];
                        let endTime: number;

                        if (i === 0) {
                          // Last activity goes until end of day
                          endTime = dayEnd;
                        } else {
                          // Duration goes until the next activity
                          endTime = dayImpacts[i - 1].date;
                        }

                        const startPercent = ((current.date - dayStart) / fullDayInMs) * 100;
                        const widthPercent = ((endTime - current.date) / fullDayInMs) * 100;

                        segments.push({
                          activity: current.activity,
                          color: getActivityColor(current),
                          startTime: current.date,
                          endTime: endTime,
                          startPercent,
                          widthPercent,
                        });
                      }

                      // Calculate current time position (only for today when viewing past day's bar)
                      const now = Date.now();
                      const currentTimePercent = (now >= dayStart && now <= dayEnd)
                        ? ((now - dayStart) / fullDayInMs) * 100
                        : null;

                      // Handle mouse move for hover tooltip
                      const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percent = (x / rect.width) * 100;

                        const timeAtPosition = dayStart + ((percent / 100) * fullDayInMs);

                        // Find which activity this time falls into
                        let activityAtPosition = "No activity";
                        for (let i = dayImpacts.length - 1; i >= 0; i--) {
                          const current = dayImpacts[i];
                          let endTime: number;

                          if (i === 0) {
                            endTime = dayEnd;
                          } else {
                            endTime = dayImpacts[i - 1].date;
                          }

                          if (timeAtPosition >= current.date && timeAtPosition <= endTime) {
                            activityAtPosition = current.activity;
                            break;
                          }
                        }

                        setSummaryBarHover({
                          dateKey,
                          percent,
                          activity: activityAtPosition,
                          time: formatTime(timeAtPosition),
                        });
                      };

                      const handleMouseLeave = () => {
                        setSummaryBarHover(null);
                      };

                      const isHovering = summaryBarHover?.dateKey === dateKey;
                      const hoverPercent = isHovering ? summaryBarHover?.percent : null;

                      return (
                        <div className="relative">
                          <div
                            className="relative h-8 rounded-lg overflow-hidden border border-border bg-muted/20"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                          >
                            {segments.map((segment, idx) => (
                              <div
                                key={`${segment.activity}-${idx}`}
                                className={`${segment.color} absolute top-0 bottom-0 flex items-center justify-center text-xs text-white font-medium ${
                                  idx < segments.length - 1 ? 'border-r border-background/50' : ''
                                }`}
                                style={{
                                  left: `${segment.startPercent}%`,
                                  width: `${segment.widthPercent}%`,
                                }}
                                title={`${segment.activity}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
                              >
                                {segment.widthPercent > 8 && (
                                  <span className="px-1 truncate">
                                    {segment.activity}
                                  </span>
                                )}
                              </div>
                            ))}
                            {/* Current time indicator - red line (only shows if current time falls within this day) */}
                            {currentTimePercent !== null && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                                style={{ left: `${currentTimePercent}%` }}
                                title={`Current time: ${formatTime(now)}`}
                              />
                            )}
                            {/* Hover indicator line */}
                            {hoverPercent !== null && (
                              <div
                                className="absolute top-0 bottom-0 w-px bg-foreground/40 z-20 pointer-events-none"
                                style={{ left: `${hoverPercent}%` }}
                              />
                            )}
                          </div>
                          {/* Hover tooltip */}
                          {isHovering && summaryBarHover && (
                            <div
                              className="absolute top-full mt-1 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border whitespace-nowrap z-30 pointer-events-none"
                              style={{ left: `${summaryBarHover.percent}%` }}
                            >
                              <div className="font-semibold">{summaryBarHover.activity}</div>
                              <div className="text-muted-foreground">{summaryBarHover.time}</div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : null}

                  {/* Presence Status Bar - Shows Active/Away status across the day */}
                  {(() => {
                    // Get AW events for this day to calculate presence
                    const allAWEvents = getFilteredAWEventsForDate(dateKey);
                    const afkEvents = allAWEvents.filter(e => e.bucketType === 'afkstatus');

                    if (afkEvents.length === 0) return null;

                    // Calculate presence for 15-min blocks
                    const afkMap = new Map<number, boolean>();
                    const blockSize = 15 * 60 * 1000;
                    const [year, month, day] = dateKey.split('-').map(Number);
                    const dayStart = new Date(year, month - 1, day).getTime();
                    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

                    afkEvents.forEach(event => {
                      const isActive = event.displayName === 'Active' || event.eventData?.status === 'not-afk';
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

                    // Generate blocks for the entire day
                    const blocks = [];
                    for (let time = dayStart; time < dayEnd; time += blockSize) {
                      const isActive = afkMap.get(time) === true;
                      blocks.push({
                        time,
                        isActive,
                      });
                    }

                    // Calculate current time position (only for today)
                    const currentTimePercent = isTodayFlag
                      ? ((Date.now() - dayStart) / (dayEnd - dayStart)) * 100
                      : null;

                    // Handle mouse move for hover tooltip
                    const handlePresenceMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percent = (x / rect.width) * 100;

                      const timeAtPosition = dayStart + ((percent / 100) * (dayEnd - dayStart));

                      // Find the status at this position
                      const blockStart = Math.floor(timeAtPosition / blockSize) * blockSize;
                      const isActive = afkMap.get(blockStart) === true;

                      setPresenceBarHover({
                        dateKey,
                        percent,
                        status: isActive ? 'Active' : 'Away',
                        time: formatTime(timeAtPosition),
                      });
                    };

                    const handlePresenceMouseLeave = () => {
                      setPresenceBarHover(null);
                    };

                    const isPresenceHovering = presenceBarHover?.dateKey === dateKey;
                    const presenceHoverPercent = isPresenceHovering ? presenceBarHover?.percent : null;

                    return (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">Presence:</span>
                          <div className="flex gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-muted-foreground">Active</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                              <span className="text-muted-foreground">Away</span>
                            </div>
                          </div>
                        </div>
                        <div className="relative">
                          <div
                            className="relative flex h-2 rounded overflow-hidden border border-border"
                            onMouseMove={handlePresenceMouseMove}
                            onMouseLeave={handlePresenceMouseLeave}
                          >
                            {blocks.map((block, idx) => (
                              <div
                                key={idx}
                                className={`flex-1 ${block.isActive ? 'bg-green-500' : 'bg-gray-600'}`}
                                title={`${formatTime(block.time)}: ${block.isActive ? 'Active' : 'Away'}`}
                              />
                            ))}
                            {/* Current time indicator - red line */}
                            {currentTimePercent !== null && currentTimePercent >= 0 && currentTimePercent <= 100 && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                                style={{ left: `${currentTimePercent}%` }}
                                title={`Current time: ${formatTime(Date.now())}`}
                              />
                            )}
                            {/* Hover indicator line */}
                            {presenceHoverPercent !== null && (
                              <div
                                className="absolute top-0 bottom-0 w-px bg-foreground/60 z-20 pointer-events-none"
                                style={{ left: `${presenceHoverPercent}%` }}
                              />
                            )}
                          </div>
                          {/* Hover tooltip */}
                          {isPresenceHovering && presenceBarHover && (
                            <div
                              className="absolute top-full mt-1 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border whitespace-nowrap z-30 pointer-events-none"
                              style={{ left: `${presenceBarHover.percent}%` }}
                            >
                              <div className="font-semibold">{presenceBarHover.status}</div>
                              <div className="text-muted-foreground">{presenceBarHover.time}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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
                      // Pass dayStart and dayEnd to ensure blocks stay within the day boundaries
                      const chunks = chunkEventsIntoTimeBlocks(awEvents, DEFAULT_BLOCK_SIZE_MINUTES, dayStart, dayEnd);
                      // Then merge consecutive blocks with same dominant activity
                      // This will also merge consecutive loginwindow-only blocks
                      timeBlocks = mergeConsecutiveBlocks(chunks);
                    }

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Manual Activities */}
                        {filterSettings.showManual && (
                          <div className="relative pl-8" style={{ minHeight: '200px' }}>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Manual Activities</h3>

                            {dayImpacts.map((impact, index) => {
                              const isFirstItem = index === 0;
                              const isVirtualContinuation = impact.isVirtualContinuation || false;
                              const isLive = isTodayFlag && isFirstItem && !isVirtualContinuation;

                              let duration = null;
                              let endTime: number;
                              let durationMs: number;
                              let displayStartTime = impact.date;

                              // For virtual continuations, the display starts from midnight of this day
                              if (isVirtualContinuation) {
                                displayStartTime = impact.date; // Already set to midnight by groupByDate
                              }

                              if (isFirstItem && !isTodayFlag) {
                                // For past days, calculate static duration
                                const dayEnd = new Date(impact.date);
                                dayEnd.setHours(24, 0, 0, 0);
                                endTime = dayEnd.getTime();
                                duration = getDuration(displayStartTime, endTime);
                                durationMs = getDurationInMs(displayStartTime, endTime);
                              } else if (!isFirstItem) {
                                const nextActivity = dayImpacts[index - 1];
                                endTime = nextActivity.date;
                                duration = getDuration(displayStartTime, endTime);
                                durationMs = getDurationInMs(displayStartTime, endTime);
                              } else {
                                // For live activities, we'll use LiveActivityDuration component
                                // Calculate a temporary duration for bar height
                                durationMs = Date.now() - displayStartTime;
                                // For live activities, end time is effectively now
                                endTime = Date.now();
                              }

                              const durationMinutes = durationMs / (1000 * 60);
                              const barHeight = Math.max(12, durationMinutes * 2);
                              const isShortActivity = durationMinutes < 15;
                              const isLongActivity = durationMinutes >= 60; // 1 hour or more

                              // Find the actual (original) impact for editing
                              const actualIndex = impacts.findIndex(
                                (imp) => {
                                  if (isVirtualContinuation && impact.originalStartTime) {
                                    return imp.date === impact.originalStartTime && imp.activity === impact.activity && !imp.isVirtualContinuation;
                                  }
                                  return imp.date === impact.date && imp.activity === impact.activity && !imp.isVirtualContinuation;
                                }
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

                                  {/* Optimized Sub-slots - only render on parent hover */}
                                  {durationMs >= 20 * 60 * 1000 && (
                                    <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none group-hover/manual-entry:pointer-events-auto z-10 hidden group-hover/manual-entry:block">
                                      {(() => {
                                        const slots: JSX.Element[] = [];
                                        const slotSize = 15 * 60 * 1000;
                                        const effectiveEndTime = isLive ? Date.now() : endTime;
                                        let currentSlotTime = effectiveEndTime - slotSize;

                                        while (currentSlotTime > displayStartTime + (5 * 60 * 1000)) {
                                            const timeFromEnd = effectiveEndTime - currentSlotTime;
                                            const slotTop = (timeFromEnd / (1000 * 60)) * 2;
                                            const thisSlotTime = currentSlotTime;

                                            slots.push(
                                                <div
                                                    key={`slot-${thisSlotTime}`}
                                                    className="absolute left-[-3.5rem] w-12 h-5 flex items-center justify-end opacity-0 hover:opacity-100 cursor-pointer group/slot"
                                                    style={{ top: `${slotTop - 10}px` }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const { dateStr, timeStr } = getLocalDateTimeStrings(thisSlotTime);
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
                                                    <span className="text-[10px] font-mono text-muted-foreground mr-1 bg-background px-1 rounded shadow-sm">
                                                      {formatTime(thisSlotTime)}
                                                    </span>
                                                    <div className="w-5 h-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground shrink-0 z-10">
                                                        <span className="text-[10px] font-bold">+</span>
                                                    </div>
                                                    <div className="absolute right-[-2rem] w-[2rem] h-px bg-primary/30 pointer-events-none" />
                                                </div>
                                            );
                                            currentSlotTime -= slotSize;
                                        }
                                        return slots;
                                      })()}
                                  </div>
                                  )}

                                  <div
                                    className={`bg-card border-b hover:shadow-md transition-shadow cursor-pointer flex-1 min-w-0 ${
                                      isLive ? 'border-b-primary border-b-2' : 'border-b-border'
                                    } ${isShortActivity ? 'pb-2' : 'pb-3'}`}
                                    style={{ minHeight: `${barHeight}px` }}
                                    onClick={() => openEditModal(impact, actualIndex)}
                                  >
                                    <div className={`flex items-center justify-between pr-2 rounded py-1 -my-1 ${isLongActivity ? 'sticky top-[7.7rem] z-10 bg-card' : ''}`}>
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className={`text-sm font-mono whitespace-nowrap shrink-0 ${isLive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                          {formatTime(displayStartTime)}
                                        </span>
                                        {isVirtualContinuation && (
                                          <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded whitespace-nowrap shrink-0 border border-amber-500/20" title={`Continued from ${formatTime(impact.originalStartTime || 0)}`}>
                                            ↗ Continued
                                          </span>
                                        )}
                                        <h3 className={`text-base font-semibold truncate ${isLive ? 'text-primary' : 'text-foreground'}`}>
                                          <HighlightedMentions text={impact.activity} />
                                        </h3>
                                        {isLive && <span className="text-xs text-primary whitespace-nowrap shrink-0">(Live)</span>}
                                      </div>
                                      {isLive ? (
                                        <LiveActivityDuration
                                          startTime={displayStartTime}
                                          formatDuration={getDuration}
                                        />
                                      ) : duration && (
                                        <span className="text-sm px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                                          {duration}
                                        </span>
                                      )}
                                    </div>
                                    {/* Photo thumbnails */}
                                    {impact.id && getPhotosForImpact(impact.id).length > 0 && (
                                      <div className="flex gap-2 mt-2 pl-[4.5rem] overflow-x-auto">
                                        {getPhotosForImpact(impact.id).map((photo) => (
                                          <Image
                                            key={photo.id}
                                            src={photo.thumbnail}
                                            alt="Activity photo"
                                            width={48}
                                            height={48}
                                            unoptimized
                                            className="w-12 h-12 object-cover rounded border border-border flex-shrink-0"
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Render GapBlocks for the top (empty space after last/newest activity) */}
                            {(() => {
                              // If there are activities, the newest one extends to now/end-of-day, so no top gaps needed
                              // dayImpacts is sorted Newest First, so the FIRST item is the NEWEST
                              // For today: newest activity extends to "now" (either live or calculated duration)
                              // For past days: newest activity extends to end of day (midnight)
                              if (dayImpacts.length > 0) {
                                return null;
                              }

                              // If no activities, the bottom gap rendering will fill the entire day
                              return null;
                            })()}
                            
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
                                        onClick={(e) => {
                                          e?.stopPropagation();
                                          setEditingGapStart(chunkStart);
                                        }}
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
                                const dayTop = isTodayFlag ? Math.min(roundToNearest15Minutes(Date.now()), dayEnd) : dayEnd;
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
                                    const dayTop = isTodayFlag ? Math.min(roundToNearest15Minutes(Date.now()), dayEnd) : dayEnd;
                                    const gapTop = dayTop;
                                    // Ensure block doesn't extend beyond day boundaries
                                    const gapBottom = Math.min(block.endTime, dayEnd);
                                    
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
                                    const gapStartTime = Math.min(prevBlock.startTime, dayEnd); // Start of newer block (visual bottom of prev)
                                    const gapEndTime = Math.min(block.endTime, dayEnd); // End of older block (visual top of current)
                                    
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

                      {/* Online Presence Card - Mobile Only */}
                      {(() => {
                     const allAWEvents = getFilteredAWEventsForDate(dateKey);
                     const afkEvents = allAWEvents.filter(e => e.bucketType === 'afkstatus');

                     if (afkEvents.length === 0) return null;

                     // Calculate active time for this day
                     let dayActiveTime = 0;

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
                         dayActiveTime += (effectiveEnd - effectiveStart);
                       }
                     });

                     return (
                       <div className="mt-2 flex md:hidden">
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-md border border-green-500/20">
                           <span className="text-sm font-medium">Online Presence: {formatDuration(dayActiveTime)}</span>
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
              </>
            )}

            {/* Load More Button - Schedule View */}
            {viewMode === "schedule" && hasMoreDays && (
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

            {/* Week View */}
            {viewMode === "week" && (
              <TimelineWeekView
                impacts={impacts}
                goals={goals}
                onEditActivity={openEditModal}
                onAddActivity={handleAddActivityForDate}
                getActivityColor={getActivityColor}
                formatDate={formatDate}
                formatTime={formatTime}
                isToday={isToday}
                getDurationInMs={getDurationInMs}
              />
            )}
          </>
        )}

        {/* Import ActivityWatch Modal */}
        <Modal
          isOpen={showImportModal}
          closeModal={() => setShowImportModal(false)}
        >
          <Modal.Title>Import ActivityWatch Data</Modal.Title>
          <Modal.Body>
            <ImportActivityWatchForm 
              onImport={async (file, options) => {
                await importData(file, options);
                setShowImportModal(false);
              }}
              onCancel={() => setShowImportModal(false)}
            />
          </Modal.Body>
        </Modal>

        <Drawer open={showMobileImportDrawer} onOpenChange={setShowMobileImportDrawer}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Import ActivityWatch Data</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              <ImportActivityWatchForm 
                onImport={async (file, options) => {
                  await importData(file, options);
                  setShowMobileImportDrawer(false);
                }}
                onCancel={() => setShowMobileImportDrawer(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* ActivityWatch Event Detail Modal */}
        <Modal
          isOpen={showAWDetailModal}
          closeModal={() => setShowAWDetailModal(false)}
        >
          <Modal.Title>ActivityWatch Event Details</Modal.Title>
          <Modal.Body>
            {selectedAWEvent && (
              <AWEventDetailContent
                event={selectedAWEvent}
                onCreateManualEntry={handleCreateManualEntry}
                onClose={() => setShowAWDetailModal(false)}
              />
            )}
          </Modal.Body>
        </Modal>

        <Drawer open={showMobileAddDrawer} onOpenChange={setShowMobileAddDrawer}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Add Missing Activity</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              {addFormInitialData && (
                <ActivityForm
                  initialData={addFormInitialData}
                  onSubmit={addNewActivity}
                  onCancel={() => {
                    setShowMobileAddDrawer(false);
                    setAddFormInitialData(null);
                  }}
                  submitLabel="Add Activity"
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={showMobileEditDrawer} onOpenChange={setShowMobileEditDrawer}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Edit Activity</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              {editFormData && (
                <ActivityForm
                  initialData={editFormData}
                  onSubmit={saveEditedActivity}
                  onCancel={() => {
                    setShowMobileEditDrawer(false);
                    setEditFormData(null);
                  }}
                  submitLabel="Save Changes"
                  showDelete={true}
                  onDelete={deleteActivity}
                  existingPhotos={editingImpact?.id ? getPhotosForImpact(editingImpact.id) : []}
                  onDeletePhoto={handleDeletePhotoFromImpact}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={showMobileAWDetailDrawer} onOpenChange={setShowMobileAWDetailDrawer}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>ActivityWatch Event Details</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              {selectedAWEvent && (
                <AWEventDetailContent
                  event={selectedAWEvent}
                  onCreateManualEntry={handleCreateManualEntry}
                  onClose={() => setShowMobileAWDetailDrawer(false)}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Mobile Filters Drawer */}
        <Drawer open={showMobileFiltersDrawer} onOpenChange={setShowMobileFiltersDrawer}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              {awData && awData.buckets.length > 0 && (
                <div className="bg-card rounded-lg">
                  <FilterControls
                    filterSettings={filterSettings}
                    buckets={awData.buckets}
                    onUpdateFilters={updateFilterSettings}
                    onToggleBucket={toggleBucket}
                    totalActiveTime={totalActiveTime}
                    formatDuration={formatDuration}
                    forceExpanded={true}
                  />
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
