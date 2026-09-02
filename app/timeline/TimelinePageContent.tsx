"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "../../components/ui/spinner";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { PlusIcon, FilterIcon, DocumentTextIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from "@heroicons/react/solid";
import { useTimeFormat } from "../../utils/useTimeFormat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import Modal from "../../components/Modal";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { useActivityWatch } from "../../utils/useActivityWatch";
import { useMentions } from "../../utils/useMentions";
import { usePhotoAttachments } from "../../utils/usePhotoAttachments";
import { extractMentionedEntityIds, HighlightedMentions } from "../../components/ui/mention-input";
import { GCalBadge } from "../../components/ui/gcal-badge";
import FilterControls from "../../components/Timeline/FilterControls";

import { ProcessedAWEvent } from "../../activity-watch";

import ActivityForm from "../../components/Timeline/ActivityForm";
import ImportActivityWatchForm from "../../components/Timeline/ImportActivityWatchForm";
import { LiveSummaryBar } from "../../components/Timeline/LiveSummaryBar";
import { TimelineScheduleView } from "../../components/Timeline/TimelineScheduleView";
import { TimelineWeekView } from "../../components/Timeline/TimelineWeekView";
import { TimelineMonthView } from "../../components/Timeline/TimelineMonthView";
import { LifeView } from "../../components/Timeline/LifeView";
import { ImportGoogleCalendarModal } from "../../components/Modal/ImportGoogleCalendarModal";
import { StaticSummaryBar } from "../../components/Timeline/StaticSummaryBar";
import { HeaderPresenceBar } from "../../components/Timeline/HeaderPresenceBar";
import { DayTimelineContent } from "../../components/Timeline/DayTimelineContent";
import { TimeScale } from "../../components/Timeline/TimeScale";
import { AWEventDetailContent } from "../../components/Timeline/AWEventDetailContent";
import { useIsLargeScreen } from "../../hooks/use-mobile";
import { useQuickNotes } from "../../utils/useQuickNotes";
import { SuggestionBanner } from "../../components/Timeline/SuggestionBanner";

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
  dismissed?: boolean;
}

export default function TimelinePageContent() {
  const { use24Hour } = useTimeFormat();

  const [impacts, setImpacts] = useState<Impact[]>([]);
  const impactsRef = useRef(impacts);
  useEffect(() => {
    impactsRef.current = impacts;
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMobileAddDrawer, setShowMobileAddDrawer] = useState(false);
  const [editingImpact, setEditingImpact] = useState<Impact | null>(null);
  const [editPopupAnchor, setEditPopupAnchor] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null);
  const editSubmitRef = useRef<(() => void) | null>(null);
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
  const [expandedAWEventId, setExpandedAWEventId] = useState<string | null>(null);
  const [awPopupAnchor, setAwPopupAnchor] = useState<{ top: number; left: number; right: number; bottom: number; width: number; height: number } | null>(null);
  const [showMobileFiltersDrawer, setShowMobileFiltersDrawer] = useState(false);

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

  // Day notes popup (desktop) / drawer (mobile)
  const [noteDrawerDate, setNoteDrawerDate] = useState<string | null>(null);
  const [notePopupAnchor, setNotePopupAnchor] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null);
  const { notes: quickNotes } = useQuickNotes();

  const dayNotesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    quickNotes.forEach((note) => {
      const d = new Date(note.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [quickNotes]);

  const noteDrawerNotes = useMemo(() => {
    if (!noteDrawerDate) return [];
    return quickNotes
      .filter((n) => {
        const d = new Date(n.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key === noteDrawerDate;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [quickNotes, noteDrawerDate]);

  // Pagination state: 7 days by default on large screens, 3 on small
  const [daysToShow, setDaysToShow] = useState(3);

  useEffect(() => {
    if (isLargeScreen && daysToShow === 3) {
      queueMicrotask(() => setDaysToShow(7));
    }
  }, [isLargeScreen, daysToShow]);

  // View mode state - default to schedule on mobile, day on desktop
  const [viewMode, setViewMode] = useState<"day" | "schedule" | "week" | "month" | "life">(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? "schedule" : "day";
    }
    return "day";
  });

  // Week navigation via sessionStorage + custom events (no Next.js route changes)
  const searchParams = useSearchParams();
  const getMonday = useCallback((d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday = 1
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [currentWeekStart, setCurrentWeekStartRaw] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('timeline-week-start');
      if (stored) {
        const parsed = new Date(stored);
        if (!isNaN(parsed.getTime())) return getMonday(parsed);
      }
      const weekParam = searchParams.get("week");
      if (weekParam) {
        const parsed = new Date(weekParam + "T00:00:00");
        if (!isNaN(parsed.getTime())) return getMonday(parsed);
      }
    }
    return getMonday(new Date());
  });

  const setCurrentWeekStart = useCallback((date: Date) => {
    const monday = getMonday(date);
    setCurrentWeekStartRaw(monday);
    sessionStorage.setItem('timeline-week-start', monday.toISOString());
    // Update URL bar without triggering Next.js navigation
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const params = new URLSearchParams(window.location.search);
    params.set("week", key);
    window.history.replaceState(null, '', `/timeline?${params.toString()}`);
    window.dispatchEvent(new CustomEvent('weekChanged', { detail: monday }));
  }, [getMonday]);

  // Listen for week changes from the header navigator
  useEffect(() => {
    const handler = (e: Event) => {
      const date = (e as CustomEvent<Date>).detail;
      setCurrentWeekStartRaw(date);
    };
    window.addEventListener('weekChanged', handler);
    return () => window.removeEventListener('weekChanged', handler);
  }, []);

  const weekDates = useMemo(() => {
    const dates: string[] = [];
    // Chronological order (Monday first) for natural left-to-right reading
    for (let i = 0; i <= 6; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return dates;
  }, [currentWeekStart]);

  // Active date for navigation highlighting
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
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

    // Listen for external impact changes (e.g. from WebMCP suggestions)
    const handleExternalUpdate = () => { loadImpacts(); };
    window.addEventListener("impactsUpdated", handleExternalUpdate);
    return () => { window.removeEventListener("impactsUpdated", handleExternalUpdate); };
  }, []);

  const saveImpacts = useCallback(async (newImpacts: Impact[]) => {
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
  }, []);

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

  const openEditModal = (impact: Impact, _index: number, anchorRect?: DOMRect) => {
    // Find the correct index in the global impacts array by ID or timestamp,
    // since the passed index may be from a filtered/grouped subset
    const globalIndex = impact.id
      ? impacts.findIndex(i => i.id === impact.id)
      : impacts.findIndex(i => i.date === impact.date && i.activity === impact.activity);
    setEditingImpact(impact);
    setEditingIndex(globalIndex >= 0 ? globalIndex : _index);

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

  const handleDismissActivity = async (impact: Impact) => {
    const updatedImpacts = impacts.map((imp) =>
      imp.id === impact.id ? { ...imp, dismissed: !imp.dismissed } : imp
    );
    await saveImpacts(updatedImpacts);
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

        // Only create a continuation if the event genuinely extends past midnight
        // (endTime strictly after midnight — not exactly at 00:00:00 which is zero duration)
        if (nextDateKey === endDateKey && endTime > nextDayStart.getTime()) {
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

  // For day view, use week-based dates; for schedule view, use data-driven dates
  const dates = viewMode === "day" ? weekDates : allDates.slice(0, daysToShow);
  // Day/week/month draw a calendar grid that does not depend on the events —
  // render it at once and let the events fill in when the pod answers.
  // Schedule and life views are built from the events themselves.
  const calendarView = viewMode === "day" || viewMode === "week" || viewMode === "month";
  const showGrid = calendarView || (isDataLoaded && impacts.length > 0);

  // Loading hint as a toast: it lives outside the layout, so nothing jumps
  // when it appears or goes away. Dismissed as soon as the pod has answered.
  useEffect(() => {
    if (isDataLoaded) return;
    const id = toast.loading("Loading events…");
    return () => { toast.dismiss(id); };
  }, [isDataLoaded]);
  const hasMoreDays = viewMode !== "day" && allDates.length > daysToShow;

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
    setExpandedAWEventId(null);
    setAwPopupAnchor(null);
  }, []);

  const tryCloseOpenPopups = useCallback(() => {
    let closed = false;
    if (awPopupAnchor != null) {
      setSelectedAWEvent(null);
      setSelectedAWHourEvents(null);
      setAwPopupAnchor(null);
      closed = true;
    }
    if (notePopupAnchor != null) {
      setNotePopupAnchor(null);
      closed = true;
    }
    return closed;
  }, [awPopupAnchor, notePopupAnchor]);

  const showAWPopup = (selectedAWEvent != null || (selectedAWHourEvents && selectedAWHourEvents.length > 0)) && awPopupAnchor != null;



  const showEditPopup = editFormData != null && editPopupAnchor != null;

  // The popups are anchored to a rect captured on click (a calendar block or a
  // day-header button), not to a rendered element. Radix positions against a
  // virtual anchor, so we hand it that rect; flipping at the viewport edge and
  // closing on outside click/Escape come from the Popover itself.
  const virtualAnchor = (r: { top: number; left: number; right: number; bottom: number } | null) => ({
    current: {
      getBoundingClientRect: () => {
        const top = r?.top ?? 0, left = r?.left ?? 0, right = r?.right ?? 0, bottom = r?.bottom ?? 0;
        return { top, left, right, bottom, x: left, y: top, width: right - left, height: bottom - top, toJSON: () => ({}) } as DOMRect;
      },
    },
  });
  const editAnchorRef = useMemo(() => virtualAnchor(editPopupAnchor), [editPopupAnchor]);
  const awAnchorRef = useMemo(() => virtualAnchor(awPopupAnchor), [awPopupAnchor]);
  const noteAnchorRef = useMemo(() => virtualAnchor(notePopupAnchor), [notePopupAnchor]);





  const openNotePanel = useCallback((dateKey: string, buttonEl: HTMLButtonElement) => {
    setNoteDrawerDate(dateKey);
    if (isLargeScreen) {
      const rect = buttonEl.getBoundingClientRect();
      setNotePopupAnchor({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom });
    } else {
      setNotePopupAnchor(null);
    }
  }, [isLargeScreen]);

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

  // undefined: slots not looked up yet (first paint); null: the shell has none.
  // Rendering the inline fallback before the lookup would flash the view
  // switcher inside the content and then move it into the header.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null | undefined>(undefined);
  const [headerActionsSlot, setHeaderActionsSlot] = useState<HTMLElement | null | undefined>(undefined);

  useEffect(() => {
    // Find the portal targets in the AppShell header; re-resolve on resize/rotation
    const update = () => {
      setHeaderSlot(document.getElementById("timeline-header-slot"));
      setHeaderActionsSlot(document.getElementById("timeline-header-actions-slot"));
    };
    queueMicrotask(update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const tabs = (
    <Select
      value={viewMode}
      onValueChange={(v) => setViewMode(v as "day" | "schedule" | "week" | "month" | "life")}
    >
      <SelectTrigger className="h-11 md:h-8 w-[110px] sm:w-[140px] rounded-full">
        <SelectValue placeholder="View" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">Day</SelectItem>
        <SelectItem value="schedule">Schedule</SelectItem>
        <SelectItem value="week">Week</SelectItem>
        <SelectItem value="month">Month</SelectItem>
        <SelectItem value="life">Life</SelectItem>
      </SelectContent>
    </Select>
  );

  const filterButton =
    viewMode === "day" && awData && awData.buckets.length > 0 ? (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-11 px-0 md:w-8 shrink-0" title="Filters">
            <FilterIcon className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
          <FilterControls
            filterSettings={filterSettings}
            buckets={awData.buckets}
            onUpdateFilters={updateFilterSettings}
            onToggleBucket={toggleBucket}
            forceExpanded={true}
          />
        </PopoverContent>
      </Popover>
    ) : null;

  return (
    <div className="@container">
        {/* Portal tabs into the sub-header; filter button goes next to the Import button in the top bar */}
        {headerSlot ? createPortal(tabs, headerSlot) : headerSlot === null ? (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            {tabs}
            {filterButton}
          </div>
        ) : null}
        {headerSlot && headerActionsSlot && filterButton && createPortal(filterButton, headerActionsSlot)}

        {/* Mobile Add Activity Button */}
        <Button
          size="lg"
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
          className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-[45] shadow-lg"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Activity</span>
        </Button>

        {/* Mobile Filter Button */}
        {viewMode === "day" && awData && awData.buckets.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowMobileFiltersDrawer(true)}
            className="md:hidden w-full mb-6"
          >
            <FilterIcon className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}

        {/* Desktop Filter — popup anchored to toggle button, hidden when inline header button takes over */}
        {viewMode === "day" && awData && awData.buckets.length > 0 && (
          <div className="hidden md:block @4xl:hidden mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="md:px-4" title="Filters">
                  <FilterIcon className="text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-96 max-w-[calc(100vw-2rem)] p-0">
                <FilterControls
                  filterSettings={filterSettings}
                  buckets={awData.buckets}
                  onUpdateFilters={updateFilterSettings}
                  onToggleBucket={toggleBucket}
                  forceExpanded={true}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Error Display */}
        {awError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-control">
            <p className="text-sm text-red-500">{awError}</p>
          </div>
        )}

        {/* Loading State — only where there is nothing to draw without events */}
        {!isDataLoaded && !calendarView && (
          <div className="flex flex-col items-center justify-center py-32">
            <Spinner className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {isDataLoaded && impacts.length === 0 && !calendarView && (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="text-lg text-muted-foreground">No timeline data yet</p>
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
        <Popover
          open={showEditPopup && !showDeleteConfirm}
          onOpenChange={(open) => {
            if (open) return;
            // Save any unsaved edits, then close.
            editSubmitRef.current?.();
            closeEditPopup();
          }}
        >
          <PopoverAnchor virtualRef={editAnchorRef} />
          <PopoverContent
            side="bottom"
            align="start"
            collisionPadding={16}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-[9999] w-[360px] max-w-[calc(100vw-2rem)] max-h-[min(480px,70vh)] overflow-y-auto scrollbar-hide p-4"
          >
              <button
                onClick={() => {
                  editSubmitRef.current?.();
                  closeEditPopup();
                }}
                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted z-10"
                aria-label="Close"
              >
                <XIcon className="w-4 h-4" />
              </button>
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
                  submitRef={editSubmitRef}
                  hideSubmit
                />
              )}
          </PopoverContent>
        </Popover>

        {/* Note Popup (desktop) */}
        <Popover
          open={notePopupAnchor !== null && noteDrawerDate !== null}
          onOpenChange={(open) => {
            if (open) return;
            setNotePopupAnchor(null);
            setNoteDrawerDate(null);
          }}
        >
          <PopoverAnchor virtualRef={noteAnchorRef} />
          <PopoverContent
            side="bottom"
            align="start"
            collisionPadding={16}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-[9999] w-80 max-h-[min(400px,70vh)] overflow-y-auto scrollbar-hide p-0"
          >
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  {new Date(noteDrawerDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="p-3 space-y-2">
                {noteDrawerNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">No notes for this day.</p>
                ) : (
                  noteDrawerNotes.map((note) => (
                    <article key={note.id} className="rounded-control border border-border/80 bg-muted/30 overflow-hidden">
                      <div className="p-2.5">
                        {note.text && (
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed"><HighlightedMentions text={note.text} /></p>
                        )}
                        {!note.text && note.audioPath && (
                          <p className="text-xs text-muted-foreground italic">Voice note</p>
                        )}
                        {!note.text && !note.audioPath && (note.photoIds?.length ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground italic">Photo note</p>
                        )}
                      </div>
                      <div className="px-2.5 py-1 border-t border-border/60">
                        <time className="text-xs text-muted-foreground tabular-nums">
                          {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </time>
                      </div>
                    </article>
                  ))
                )}
              </div>
          </PopoverContent>
        </Popover>

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
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteActivity}
              >
                Delete
              </Button>
            </div>
          </Modal.Footer>
        </Modal>

        {/* Pending WebMCP Suggestions */}
        <SuggestionBanner />

        {/* Timeline Content - Only show when data is loaded and exists */}
        {showGrid && (
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
                onNoteClick={(dateKey, btn) => openNotePanel(dateKey, btn)}
                dayNotesCounts={dayNotesCounts}
                hasMoreDays={hasMoreDays}
                remainingDays={allDates.length - daysToShow}
                onLoadMore={() => setDaysToShow(prev => prev + (isLargeScreen ? 7 : 5))}
                daysToShow={daysToShow}
              />
            )}

            {/* Day View - Single shared time scale for all days */}
            {viewMode === "day" && (
              <>
        <div>
          {/* Single scroll container so headers and timeline columns stay aligned */}
          <div className="overflow-x-auto scrollbar-hide border-b border-border pb-4 mb-4 scroll-mt-32">
            <div
              className="min-w-max inline-grid gap-x-4 gap-y-4"
              style={{
                gridTemplateColumns: `3rem repeat(${dates.length}, minmax(${filterSettings.showManual && filterSettings.showActivityWatch ? "400px, 400px" : "200px, 200px"}))${hasMoreDays ? ' auto' : ''}`,
                gridTemplateRows: "auto auto",
              }}
            >
              {/* Row 0: header spacer + day headers */}
              <div className="row-start-1" />
              {dates.map((dateKey) => {
              const allDayImpacts = (groupedImpacts[dateKey] || []).filter(i => i.allDay);
              const dayImpacts = (groupedImpacts[dateKey] || []).filter(i => !i.allDay);
              let weekdayLabel: string;
              let dayNum: number;
              let isTodayFlag: boolean;
              const firstImpact = dayImpacts[0] ?? allDayImpacts[0];
              const headingParts = (ts: number) => {
                const d = new Date(ts);
                return {
                  weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
                  day: d.getDate(),
                };
              };
              if (firstImpact) {
                ({ weekday: weekdayLabel, day: dayNum } = headingParts(firstImpact.date));
                isTodayFlag = isToday(firstImpact.date);
              } else {
                const [year, month, day] = dateKey.split('-').map(Number);
                const dateTimestamp = new Date(year, month - 1, day).getTime();
                ({ weekday: weekdayLabel, day: dayNum } = headingParts(dateTimestamp));
                isTodayFlag = isToday(dateTimestamp);
              }
              return (
                <div key={dateKey} id={`day-${dateKey}`} className="row-start-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      <span>{weekdayLabel},</span>
                      {isTodayFlag ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white">
                          {dayNum}
                        </span>
                      ) : (
                        <span>{dayNum}</span>
                      )}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => openNotePanel(dateKey, e.currentTarget)}
                      title="View notes for this day"
                      className={
                        dayNotesCounts[dateKey]
                          ? 'text-primary hover:text-primary/80'
                          : 'text-muted-foreground'
                      }
                    >
                      <DocumentTextIcon />
                    </Button>
                  </div>
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
                  ) : (
                    <StaticSummaryBar
                      dateKey={dateKey}
                      dayImpacts={dayImpacts}
                      getActivityColor={getActivityColor}
                      formatTime={formatTime}
                    />
                  )}
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
                    tryCloseOpenPopups={tryCloseOpenPopups}
                    sharedTimeScale
                  />
                </div>
              );
            })}
            {hasMoreDays && (
              <div className="row-start-1 row-span-2 flex items-center pl-2">
                <button
                  onClick={() => setDaysToShow(prev => prev + (isLargeScreen ? 7 : 5))}
                  className="flex flex-col items-center gap-1 px-3 py-6 bg-muted hover:bg-muted/80 text-foreground rounded-control font-medium text-sm transition-colors h-full"
                >
                  <span className="text-xs text-muted-foreground">{allDates.length - daysToShow}</span>
                  <span className="text-xs">more</span>
                  <span className="text-lg leading-none mt-1">→</span>
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
              </>
            )}

            {/* Week View */}
            {viewMode === "week" && (
              <TimelineWeekView
                impacts={impacts}
                goals={goals}
                goalTypes={goalTypes}
                onEditActivity={openEditModal}
                onAddActivity={handleAddActivityForDate}
                getActivityColor={getActivityColor}
                formatDate={formatDate}
                formatTime={formatTime}
                isToday={isToday}
                getDurationInMs={getDurationInMs}
                weekStartDate={currentWeekStart}
              />
            )}

            {/* Month View */}
            {viewMode === "month" && (
              <TimelineMonthView
                impacts={impacts}
                goals={goals}
                goalTypes={goalTypes}
                isToday={isToday}
                getDurationInMs={getDurationInMs}
                monthDate={currentWeekStart}
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
        <Popover open={!!showAWPopup} onOpenChange={(open) => { if (!open) handleAWPopupClose(); }}>
          <PopoverAnchor virtualRef={awAnchorRef} />
          <PopoverContent
            side="bottom"
            align="start"
            collisionPadding={16}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="z-[9999] w-80 max-h-[min(400px,60vh)] overflow-y-auto scrollbar-hide p-3"
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {selectedAWHourEvents.length} events
                        </p>
                        <button
                          onClick={handleAWPopupClose}
                          className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                          aria-label="Close"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {selectedAWHourEvents
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map((event, idx) => {
                          const isExpanded = expandedAWEventId === event.id;
                          return (
                            <div
                              key={`${event.id}-${idx}`}
                              className="rounded-control border border-border bg-muted/30 transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedAWEventId(isExpanded ? null : event.id)
                                }
                                aria-expanded={isExpanded}
                                className="w-full flex items-center justify-between gap-2 p-2 hover:bg-muted/60 rounded-control transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`w-1.5 h-8 rounded shrink-0 ${event.color}`}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      {event.displayName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: !use24Hour })} ·{" "}
                                      {Math.floor(event.duration / 60)}m
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 text-muted-foreground">
                                  {isExpanded ? (
                                    <ChevronUpIcon className="h-5 w-5" />
                                  ) : (
                                    <ChevronDownIcon className="h-5 w-5" />
                                  )}
                                </span>
                              </button>
                              {isExpanded && (
                                <div className="border-t border-border px-2 py-2 space-y-2">
                                  <div>
                                    <p className="text-xs font-medium text-foreground">Bucket</p>
                                    <p className="text-xs text-muted-foreground">{event.bucketType}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-foreground">Timestamp</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(event.timestamp).toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: !use24Hour })}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-foreground">Duration</p>
                                    <p className="text-xs text-muted-foreground">
                                      {Math.floor(event.duration / 60)}m {Math.floor(event.duration % 60)}s
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-foreground mb-1">Event Data</p>
                                    <div className="bg-background rounded-control border border-border overflow-y-auto scrollbar-hide p-2 max-h-32">
                                      <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-words">
                                        {JSON.stringify(event.eventData, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleCreateManualEntry(event);
                                        handleAWPopupClose();
                                      }}
                                      className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:opacity-90"
                                    >
                                      To Entry
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
              </div>
          </PopoverContent>
        </Popover>

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
                <div className="bg-card rounded-control">
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

        {/* Day Notes Drawer (mobile only — desktop uses the popup above) */}
        <Drawer open={noteDrawerDate !== null && notePopupAnchor === null} onOpenChange={(open) => { if (!open) setNoteDrawerDate(null); }}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>
                Notes — {noteDrawerDate
                  ? new Date(noteDrawerDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                  : ''}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto space-y-3">
              {noteDrawerNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No notes for this day.</p>
              ) : (
                noteDrawerNotes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-card border border-border/80 bg-muted/30 overflow-hidden"
                  >
                    <div className="p-3">
                      {note.text && (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed"><HighlightedMentions text={note.text} /></p>
                      )}
                      {!note.text && note.audioPath && (
                        <p className="text-sm text-muted-foreground italic">Voice note</p>
                      )}
                      {!note.text && !note.audioPath && note.photoIds && note.photoIds.length > 0 && (
                        <p className="text-sm text-muted-foreground italic">Photo note</p>
                      )}
                    </div>
                    <div className="px-3 border-t border-border/60 bg-background/50 py-1">
                      <time className="text-xs text-muted-foreground tabular-nums">
                        {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </time>
                    </div>
                  </article>
                ))
              )}
            </div>
          </DrawerContent>
        </Drawer>
    </div>
  );
}
