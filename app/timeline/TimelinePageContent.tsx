"use client";
import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { PlusIcon, FilterIcon } from "@heroicons/react/solid";
import Modal from "../../components/Modal";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { useActivityWatch } from "../../utils/useActivityWatch";
import { useMentions } from "../../utils/useMentions";
import { usePhotoAttachments } from "../../utils/usePhotoAttachments";
import { extractMentionedEntityIds } from "../../components/ui/mention-input";
import { GCalBadge } from "../../components/ui/gcal-badge";
import FilterControls from "../../components/Timeline/FilterControls";

import { ProcessedAWEvent } from "../../activity-watch";

import ActivityForm from "../../components/Timeline/ActivityForm";
import ImportActivityWatchForm from "../../components/Timeline/ImportActivityWatchForm";
import { LiveSummaryBar } from "../../components/Timeline/LiveSummaryBar";
import { TimelineScheduleView } from "../../components/Timeline/TimelineScheduleView";
import { TimelineWeekView } from "../../components/Timeline/TimelineWeekView";
import { LifeView } from "../../components/Timeline/LifeView";
import { ImportGoogleCalendarModal } from "../../components/Modal/ImportGoogleCalendarModal";
import { StaticSummaryBar } from "../../components/Timeline/StaticSummaryBar";
import { HeaderPresenceBar } from "../../components/Timeline/HeaderPresenceBar";
import { DayTimelineContent } from "../../components/Timeline/DayTimelineContent";
import { TimeScale } from "../../components/Timeline/TimeScale";
import { AWEventDetailContent } from "../../components/Timeline/AWEventDetailContent";
import { useIsLargeScreen } from "../../hooks/use-mobile";

interface Impact {
  id?: string;
  activity: string;
  date: number;
  endTime?: number;
  goalId?: string;
  stress?: string | number;
  fulfillment?: string | number;
  motivation?: string | number;
  cleanliness?: string | number;
  energy?: string | number;
  isVirtualContinuation?: boolean;
  originalStartTime?: number;
  photoIds?: string[];
  notes?: string;
  sourceUrl?: string;
  allDay?: boolean;
  requiresOnlineTime?: boolean;
}

export default function TimelinePageContent() {

  const [impacts, setImpacts] = useState<Impact[]>([]);
  const impactsRef = useRef(impacts);
  impactsRef.current = impacts;
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMobileAddDrawer, setShowMobileAddDrawer] = useState(false);
  const [editingImpact, setEditingImpact] = useState<Impact | null>(null);
  const [editPopupAnchor, setEditPopupAnchor] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null);
  const [editPopupPosition, setEditPopupPosition] = useState({ top: 0, left: 0 });
  const editPopupRef = useRef<HTMLDivElement>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editFormData, setEditFormData] = useState<{
    activity: string;
    date: string;
    time: string;
    endDate?: string;
    endTime?: string;
    goalId: string;
    requiresOnlineTime?: boolean;
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
  const [showGCalModal, setShowGCalModal] = useState(false);
  const [gcalImportRange, setGcalImportRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedAWEvent, setSelectedAWEvent] = useState<ProcessedAWEvent | null>(null);
  const [selectedAWHourEvents, setSelectedAWHourEvents] = useState<ProcessedAWEvent[] | null>(null);
  const [awPopupAnchor, setAwPopupAnchor] = useState<{ top: number; left: number; right: number; bottom: number; width: number; height: number } | null>(null);
  const [awPopupPosition, setAwPopupPosition] = useState({ top: 0, left: 0 });
  const awPopupRef = useRef<HTMLDivElement>(null);
  const [showMobileFiltersDrawer, setShowMobileFiltersDrawer] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);

  // Helpers for add-activity (used in effect and handlers below)
  const getLocalDateTimeStrings = useCallback((timestamp: number) => {
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
  }, []);
  const roundToNearest15Minutes = useCallback((timestamp: number): number => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    date.setMinutes(roundedMinutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date.getTime();
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
  }, [getLocalDateTimeStrings, roundToNearest15Minutes]);

  // Listen for import events fired from the header
  useEffect(() => {
    const handleOpenAW = () => {
      if (window.innerWidth < 768) {
        setShowMobileImportDrawer(true);
      } else {
        setShowImportModal(true);
      }
    };
    const handleOpenGCal = () => {
      setGcalImportRange(null);
      setShowGCalModal(true);
    };
    window.addEventListener('openActivityWatchImport', handleOpenAW);
    window.addEventListener('openGCalImport', handleOpenGCal);
    return () => {
      window.removeEventListener('openActivityWatchImport', handleOpenAW);
      window.removeEventListener('openGCalImport', handleOpenGCal);
    };
  }, []);

  const isLargeScreen = useIsLargeScreen();

  // Pagination state: 7 days by default on large screens, 3 on small
  const [daysToShow, setDaysToShow] = useState(3);

  useEffect(() => {
    if (isLargeScreen && daysToShow === 3) {
      setDaysToShow(7);
    }
  }, [isLargeScreen, daysToShow]);

  // View mode state - default to schedule on mobile, day on desktop
  const [viewMode, setViewMode] = useState<"day" | "schedule" | "week" | "life">(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? "schedule" : "day";
    }
    return "day";
  });

  // Active date for navigation highlighting
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  const { goals } = useGoals();
  useGoalTypes();
  const { updateMentionsForSource, deleteMentionsForSource } = useMentions();
  const {
    addPhoto,
    deletePhoto,
    deletePhotosForImpact,
    getPhotosForImpact,
  } = usePhotoAttachments();
  const {
    awData,
    error: awError,
    filterSettings,
    importData,
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("impactsUpdated"));
      }
    } catch (error) {
      console.error("Failed to save impacts:", error);
    }
  };

  const addNewActivity = async (formData: {
    activity: string;
    date: string;
    time: string;
    endDate?: string;
    endTime?: string | number;
    goalId: string;
    requiresOnlineTime?: boolean;
    pendingPhotos?: Array<{ id: string; file: File; thumbnail: string; width: number; height: number }>;
  }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();
    let endTime: number | undefined;
    if (formData.endDate && formData.endTime && typeof formData.endTime === "string") {
      endTime = new Date(`${formData.endDate}T${formData.endTime}`).getTime();
    } else if (typeof formData.endTime === "number") {
      endTime = formData.endTime;
    }

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
    if (endTime != null) {
      newImpact.endTime = endTime;
    }
    if (formData.requiresOnlineTime) {
      newImpact.requiresOnlineTime = true;
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

    const updatedImpacts = [...impactsRef.current, newImpact];
    await saveImpacts(updatedImpacts);

    // Track mentions
    const entityIds = extractMentionedEntityIds(formData.activity);
    await updateMentionsForSource('impact', impactId, 'activity', entityIds, formData.activity);

    setShowAddModal(false);
    setShowMobileAddDrawer(false);
    setAddFormInitialData(null);
  };

  const handleResizeImpact = useCallback(
    (impactIndex: number, newStart: number, newEnd: number) => {
      if (impactIndex < 0 || impactIndex >= impacts.length) return;
      const updatedImpacts = [...impacts];
      const existing = updatedImpacts[impactIndex];
      updatedImpacts[impactIndex] = {
        ...existing,
        date: newStart,
        endTime: newEnd,
      };
      saveImpacts(updatedImpacts);
    },
    [impacts, saveImpacts]
  );

  const handleInlineSubmit = useCallback((
    slotStart: number,
    data: { activity: string; goalId: string },
    endTime?: number
  ) => {
    const { dateStr, timeStr } = getLocalDateTimeStrings(slotStart);
    addNewActivity({
      activity: data.activity,
      date: dateStr,
      time: timeStr,
      goalId: data.goalId,
      endTime,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getLocalDateTimeStrings]);

  const openEditModal = (impact: Impact, index: number, anchorRect?: DOMRect) => {
    setEditingImpact(impact);
    setEditingIndex(index);

    const { dateStr, timeStr } = getLocalDateTimeStrings(impact.date);
    const editData: { activity: string; date: string; time: string; endDate?: string; endTime?: string; goalId: string; requiresOnlineTime?: boolean } = {
      activity: impact.activity,
      date: dateStr,
      time: timeStr,
      goalId: impact.goalId || "",
      requiresOnlineTime: impact.requiresOnlineTime,
    };
    if (impact.endTime != null) {
      const end = getLocalDateTimeStrings(impact.endTime);
      editData.endDate = end.dateStr;
      editData.endTime = end.timeStr;
    }
    setEditFormData(editData);

    if (anchorRect) {
      setEditPopupAnchor({
        top: anchorRect.top,
        left: anchorRect.left,
        right: anchorRect.right,
        bottom: anchorRect.bottom,
      });
    } else {
      setEditPopupAnchor({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 160,
        right: window.innerWidth / 2 + 160,
        bottom: window.innerHeight / 2 + 150,
      });
    }
  };

  const closeEditPopup = useCallback(() => {
    setEditingImpact(null);
    setEditingIndex(-1);
    setEditFormData(null);
    setEditPopupAnchor(null);
  }, []);

  const saveEditedActivity = async (formData: {
    activity: string;
    date: string;
    time: string;
    endDate?: string;
    endTime?: string;
    goalId: string;
    requiresOnlineTime?: boolean;
    pendingPhotos?: Array<{ id: string; file: File; thumbnail: string; width: number; height: number }>;
  }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();
    const endTime =
      formData.endDate && formData.endTime
        ? new Date(`${formData.endDate}T${formData.endTime}`).getTime()
        : undefined;

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
      endTime,
      goalId: formData.goalId || undefined,
      photoIds: photoIds.length > 0 ? photoIds : undefined,
      requiresOnlineTime: formData.requiresOnlineTime || undefined,
    };

    await saveImpacts(updatedImpacts);

    // Track mentions
    const entityIds = extractMentionedEntityIds(formData.activity);
    await updateMentionsForSource('impact', impactId, 'activity', entityIds, formData.activity);

    closeEditPopup();
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
    closeEditPopup();
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

    // All-day events are kept separate so they don't affect duration calculations
    const allDayImpacts = impactsToGroup.filter(i => i.allDay);
    const timedImpacts  = impactsToGroup.filter(i => !i.allDay);

    const sortedImpacts = [...timedImpacts].sort((a, b) => b.date - a.date);
    const grouped: { [key: string]: Impact[] } = {};

    // Place all-day events into their date bucket first
    allDayImpacts.forEach(impact => {
      const dateKey = toDateKey(impact.date);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(impact);
    });

    sortedImpacts.forEach((impact, index) => {
      let endTime: number;

      if (index === 0) {
        if (impact.endTime != null) {
          endTime = impact.endTime;
        } else {
          const impactDateKey = toDateKey(impact.date);
          if (impactDateKey === todayKey) {
            endTime = now;
          } else {
            const dayEnd = new Date(impact.date);
            dayEnd.setHours(24, 0, 0, 0);
            endTime = dayEnd.getTime();
          }
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
            endTime: impact.endTime ?? undefined,
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
      queueMicrotask(() => setActiveDateKey(dates[0]));
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

  // Handle ActivityWatch event click (single event)
  const handleAWEventClick = (event: ProcessedAWEvent, anchorRect: DOMRect) => {
    setSelectedAWEvent(event);
    setSelectedAWHourEvents(null);
    setAwPopupAnchor({
      top: anchorRect.top,
      left: anchorRect.left,
      right: anchorRect.right,
      bottom: anchorRect.bottom,
      width: anchorRect.width,
      height: anchorRect.height,
    });
  };

  // Handle ActivityWatch hour click (multiple events in that hour)
  const handleAWHourClick = (events: ProcessedAWEvent[], anchorRect: DOMRect) => {
    setSelectedAWHourEvents(events);
    setSelectedAWEvent(null);
    setAwPopupAnchor({
      top: anchorRect.top,
      left: anchorRect.left,
      right: anchorRect.right,
      bottom: anchorRect.bottom,
      width: anchorRect.width,
      height: anchorRect.height,
    });
  };

  const handleAWPopupClose = useCallback(() => {
    setSelectedAWEvent(null);
    setSelectedAWHourEvents(null);
    setAwPopupAnchor(null);
  }, []);

  const showAWPopup = (selectedAWEvent != null || (selectedAWHourEvents && selectedAWHourEvents.length > 0)) && awPopupAnchor != null;

  useLayoutEffect(() => {
    if (!awPopupAnchor) return;
    const updatePosition = () => {
      const GAP = 8;
      const popupWidth = 320;
      const popupMaxHeight = Math.min(400, window.innerHeight * 0.6);
      let top = awPopupAnchor.bottom + GAP;
      let left = awPopupAnchor.left;
      if (top + popupMaxHeight > window.innerHeight - 16) {
        top = Math.max(16, awPopupAnchor.top - popupMaxHeight - GAP);
      }
      if (left + popupWidth > window.innerWidth - 16) {
        left = window.innerWidth - popupWidth - 16;
      }
      if (left < 16) left = 16;
      setAwPopupPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [awPopupAnchor]);

  useEffect(() => {
    if (!showAWPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (awPopupRef.current?.contains(target)) return;
      handleAWPopupClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAWPopup, handleAWPopupClose]);

  const showEditPopup = editFormData != null && editPopupAnchor != null;

  useLayoutEffect(() => {
    if (!editPopupAnchor) return;
    const updatePosition = () => {
      const GAP = 8;
      const popupWidth = 360;
      const popupMaxHeight = Math.min(480, window.innerHeight * 0.7);
      let top = editPopupAnchor.bottom + GAP;
      let left = editPopupAnchor.left;
      if (top + popupMaxHeight > window.innerHeight - 16) {
        top = Math.max(16, editPopupAnchor.top - popupMaxHeight - GAP);
      }
      if (left + popupWidth > window.innerWidth - 16) {
        left = window.innerWidth - popupWidth - 16;
      }
      if (left < 16) left = 16;
      setEditPopupPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [editPopupAnchor]);

  useEffect(() => {
    if (!showEditPopup || showDeleteConfirm) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (editPopupRef.current?.contains(target)) return;
      closeEditPopup();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEditPopup, showDeleteConfirm, closeEditPopup]);

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
    <div className="@container">
        {/* Header: title left, tabs + filter right when container has enough space */}
        <div className="flex flex-col gap-3 @4xl:flex-row @4xl:items-center @4xl:justify-between mb-6">
          <div className="shrink-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Timeline</h1>
            <p className="text-sm text-muted-foreground mt-1">Daily breakdown of your activities</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Tabs */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "day" | "schedule" | "week" | "life")}>
              <TabsList className="grid w-full @4xl:w-auto grid-cols-4">
                <TabsTrigger value="day">Day View</TabsTrigger>
                <TabsTrigger value="schedule">Schedule View</TabsTrigger>
                <TabsTrigger value="week">Week View</TabsTrigger>
                <TabsTrigger value="life">Life</TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Compact filter button — only in wide layout */}
            {viewMode === "day" && awData && awData.buckets.length > 0 && (
              <div className="hidden @4xl:block relative shrink-0">
                <button
                  onClick={() => setShowDesktopFilters(!showDesktopFilters)}
                  className="flex items-center gap-2 px-3 py-2 h-10 bg-card border border-border rounded-lg hover:bg-muted/50 transition text-sm"
                >
                  <FilterIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Filters</span>
                  {totalActiveTime > 0 && (
                    <span className="text-xs text-green-700 dark:text-green-400">
                      {formatDuration(totalActiveTime)}
                    </span>
                  )}
                </button>
                {showDesktopFilters && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-96 bg-popover border border-border rounded-lg shadow-xl">
                    <FilterControls
                      filterSettings={filterSettings}
                      buckets={awData.buckets}
                      onUpdateFilters={updateFilterSettings}
                      onToggleBucket={toggleBucket}
                      forceExpanded={true}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
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

        {/* Mobile Filter Button */}
        {viewMode === "day" && awData && awData.buckets.length > 0 && (
          <button
            onClick={() => setShowMobileFiltersDrawer(true)}
            className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition mb-6"
          >
            <FilterIcon className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">Filters</span>
          </button>
        )}

        {/* Desktop Filter — popup anchored to toggle button, hidden when inline header button takes over */}
        {viewMode === "day" && awData && awData.buckets.length > 0 && (
          <div className="hidden md:block @4xl:hidden mb-6 relative">
            <button
              onClick={() => setShowDesktopFilters(!showDesktopFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted/50 transition"
            >
              <FilterIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground text-sm">Filters</span>
            </button>
            {showDesktopFilters && (
              <div className="absolute left-0 top-full mt-1 z-50 w-96 bg-popover border border-border rounded-lg shadow-xl">
                <FilterControls
                  filterSettings={filterSettings}
                  buckets={awData.buckets}
                  onUpdateFilters={updateFilterSettings}
                  onToggleBucket={toggleBucket}
                  forceExpanded={true}
                />
              </div>
            )}
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

        {/* Edit Activity Popup */}
        {showEditPopup &&
          !showDeleteConfirm &&
          createPortal(
            <div
              ref={editPopupRef}
              className="fixed z-[9999] w-[360px] max-h-[min(480px,70vh)] overflow-y-auto scrollbar-hide rounded-lg border border-border bg-popover shadow-xl p-4"
              style={{ top: editPopupPosition.top, left: editPopupPosition.left }}
            >
              {editFormData && (
                <ActivityForm
                  initialData={editFormData}
                  onSubmit={saveEditedActivity}
                  onCancel={closeEditPopup}
                  submitLabel="Save Changes"
                  showDelete={true}
                  onDelete={() => setShowDeleteConfirm(true)}
                  existingPhotos={editingImpact?.id ? getPhotosForImpact(editingImpact.id) : []}
                  onDeletePhoto={handleDeletePhotoFromImpact}
                />
              )}
            </div>,
            document.body
          )}

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
                onImportAW={(dateKey) => {
                  if (window.innerWidth < 768) {
                    setShowMobileImportDrawer(true);
                  } else {
                    setShowImportModal(true);
                  }
                }}
                onImportGCal={(dateKey) => {
                  const [y, m, d] = dateKey.split('-').map(Number);
                  const start = new Date(y, m - 1, d);
                  const end   = new Date(y, m - 1, d, 23, 59, 59, 999);
                  setGcalImportRange({ start, end });
                  setShowGCalModal(true);
                }}
                daysToShow={daysToShow}
              />
            )}

            {/* Day View - Single shared time scale for all days */}
            {viewMode === "day" && (
              <>
        <div className="flex flex-col">
          {/* Single scroll container so headers and timeline columns stay aligned */}
          <div className="overflow-x-auto scrollbar-hide border-b border-border pb-4 mb-4 scroll-mt-32">
            <div
              className="min-w-max inline-grid gap-x-4 gap-y-4"
              style={{
                gridTemplateColumns: `3rem repeat(${dates.length}, minmax(400px, 400px))`,
                gridTemplateRows: "auto auto",
              }}
            >
              {/* Row 0: header spacer + day headers */}
              <div className="row-start-1" />
              {dates.map((dateKey) => {
              const allDayImpacts = (groupedImpacts[dateKey] || []).filter(i => i.allDay);
              const dayImpacts = (groupedImpacts[dateKey] || []).filter(i => !i.allDay);
              let displayDate: string;
              let isTodayFlag: boolean;
              const firstImpact = dayImpacts[0] ?? allDayImpacts[0];
              if (firstImpact) {
                displayDate = formatDate(firstImpact.date);
                isTodayFlag = isToday(firstImpact.date);
              } else {
                const [year, month, day] = dateKey.split('-').map(Number);
                const dateTimestamp = new Date(year, month - 1, day).getTime();
                displayDate = formatDate(dateTimestamp);
                isTodayFlag = isToday(dateTimestamp);
              }
              return (
                <div key={dateKey} id={`day-${dateKey}`} className="row-start-1 space-y-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    {displayDate}
                    {isTodayFlag && (
                      <span className="ml-2 text-sm font-normal text-primary">(Today)</span>
                    )}
                  </h2>
                  {allDayImpacts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {allDayImpacts.map(imp => (
                        <div
                          key={imp.id ?? imp.activity}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs text-foreground"
                        >
                          {imp.id?.startsWith('gcal-') && <GCalBadge href={imp.sourceUrl} />}
                          <span className="truncate max-w-[18rem]">{imp.activity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {isTodayFlag && dayImpacts.length > 0 ? (
                    <LiveSummaryBar
                      dayImpacts={dayImpacts}
                      isTodayFlag={isTodayFlag}
                      getDurationInMs={getDurationInMs}
                      getActivityColor={getActivityColor}
                    />
                  ) : dayImpacts.length > 0 ? (
                    <StaticSummaryBar
                      dateKey={dateKey}
                      dayImpacts={dayImpacts}
                      getActivityColor={getActivityColor}
                      formatTime={formatTime}
                    />
                  ) : null}
                  <HeaderPresenceBar
                    dateKey={dateKey}
                    afkEvents={getFilteredAWEventsForDate(dateKey).filter(e => e.bucketType === 'afkstatus')}
                    isTodayFlag={isTodayFlag}
                    formatTime={formatTime}
                    dayImpacts={dayImpacts}
                  />
                </div>
              );
            })}

              {/* Row 1: time scale + day contents */}
              <div className="row-start-2">
                <TimeScale />
              </div>
            {dates.map((dateKey) => {
              const allDayImpacts = (groupedImpacts[dateKey] || []).filter(i => i.allDay);
              const dayImpacts = (groupedImpacts[dateKey] || []).filter(i => !i.allDay);
              let isTodayFlag: boolean;
              const firstImpact = dayImpacts[0] ?? allDayImpacts[0];
              if (firstImpact) {
                isTodayFlag = isToday(firstImpact.date);
              } else {
                const [year, month, day] = dateKey.split('-').map(Number);
                isTodayFlag = isToday(new Date(year, month - 1, day).getTime());
              }
              return (
                <div key={dateKey} className="row-start-2 space-y-4">
                  <DayTimelineContent
                    dateKey={dateKey}
                    dayImpacts={dayImpacts}
                    impacts={impacts}
                    isTodayFlag={isTodayFlag}
                    filterSettings={filterSettings}
                    getFilteredAWEventsForDate={getFilteredAWEventsForDate}
                    formatTime={formatTime}
                    getDuration={getDuration}
                    getDurationInMs={getDurationInMs}
                    formatDuration={formatDuration}
                    getActivityColor={getActivityColor}
                    getLocalDateTimeStrings={getLocalDateTimeStrings}
                    roundToNearest15Minutes={roundToNearest15Minutes}
                    getPhotosForImpact={getPhotosForImpact}
                    onOpenAddModal={(data) => { setAddFormInitialData(data); setShowAddModal(true); }}
                    onOpenEditModal={openEditModal}
                    onInlineGapSubmit={handleInlineSubmit}
                    onResizeImpact={handleResizeImpact}
                    onAWEventClick={handleAWEventClick}
                    onAWHourClick={handleAWHourClick}
                    sharedTimeScale
                  />
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Load More Button */}
        {hasMoreDays && (
          <div className="flex justify-center mt-8 mb-4">
            <button
              onClick={() => setDaysToShow(prev => prev + (isLargeScreen ? 7 : 5))}
              className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              Load Next {isLargeScreen ? 7 : 5} Days
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
                  onClick={() => setDaysToShow(prev => prev + (isLargeScreen ? 7 : 5))}
                  className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  Load Next {isLargeScreen ? 7 : 5} Days
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

            {/* Life View */}
            {viewMode === "life" && (
              <LifeView
                impacts={impacts}
                onImportAW={() => {
                  if (window.innerWidth < 768) {
                    setShowMobileImportDrawer(true);
                  } else {
                    setShowImportModal(true);
                  }
                }}
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

        {/* Google Calendar Import Modal */}
        <ImportGoogleCalendarModal
          isOpen={showGCalModal}
          closeModal={() => setShowGCalModal(false)}
          weekStart={gcalImportRange?.start}
          weekEnd={gcalImportRange?.end}
        />

        {/* ActivityWatch Event Popup - positioned next to clicked event */}
        {showAWPopup &&
          createPortal(
            <div
              ref={awPopupRef}
              className="fixed z-[9999] w-80 max-h-[min(400px,60vh)] overflow-y-auto scrollbar-hide rounded-lg border border-border bg-popover shadow-xl p-3"
              style={{ top: awPopupPosition.top, left: awPopupPosition.left }}
            >
              <div className="space-y-2">
                {selectedAWEvent && (
                  <AWEventDetailContent
                    event={selectedAWEvent}
                    onCreateManualEntry={handleCreateManualEntry}
                    onClose={handleAWPopupClose}
                    compact
                  />
                )}
                {selectedAWHourEvents &&
                  selectedAWHourEvents.length > 1 &&
                  !selectedAWEvent && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {selectedAWHourEvents.length} events
                      </p>
                      {selectedAWHourEvents
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map((event, idx) => (
                          <div
                            key={`${event.id}-${idx}`}
                            className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-1.5 h-8 rounded shrink-0 ${event.color}`}
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {event.displayName}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(event.timestamp).toLocaleTimeString()} ·{" "}
                                    {Math.floor(event.duration / 60)}m
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    setSelectedAWEvent(event);
                                    setSelectedAWHourEvents(null);
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-muted text-foreground rounded hover:bg-muted/80"
                                >
                                  Details
                                </button>
                                <button
                                  onClick={() => {
                                    handleCreateManualEntry(event);
                                    handleAWPopupClose();
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:opacity-90"
                                >
                                  To Entry
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      <button
                        onClick={handleAWPopupClose}
                        className="w-full mt-2 px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:opacity-80"
                      >
                        Close
                      </button>
                    </div>
                  )}
              </div>
            </div>,
            document.body
          )}

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
  );
}
