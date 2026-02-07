"use client";
import { PlusIcon } from "@heroicons/react/solid";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import ActivitySelector from "../../components/ActivitySelector";
import SummaryChart from "../../components/SummaryChart";
import Modal from "../../components/Modal";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { useInsights } from "../../utils/useInsights";
import { usePatternNotes } from "../../utils/usePatternNotes";
import { useEntities } from "../../utils/useEntities";
import { TrashIcon, PencilIcon, ChartBarIcon, ChevronDownIcon } from "@heroicons/react/solid";
import { analyzeActivityPatterns, getSuggestionsForMetrics } from "../../utils/activityAnalysis";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { MentionInput, HighlightedMentions, extractMentionedEntityIds } from "../../components/ui/mention-input";
import { useMentions } from "../../utils/useMentions";
import EmotionSelector, { Emotion } from "../../components/ui/emotion-selector";
import { getCurrentTime, getRandomId } from "../../utils/now";

// Configuration for impact metrics
const METRIC_CONFIG = {
  // Positive metrics with red-green gradient (0 = red/bad, 100 = green/good)
  cleanliness: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  fulfillment: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  motivation: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  energy: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  focus: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  // Inverted metrics with green-red gradient (0 = green/good, 100 = red/bad)
  stress: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: true },
  shame: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: true },
  guilt: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: true },
  // Bipolar metrics (-100 to 100) with red-green gradient
  happiness: { min: -100, max: 100, allowsNegative: true, showGradient: true, inverted: false },
  confidence: { min: -100, max: 100, allowsNegative: true, showGradient: true, inverted: false },
};

const defaultState = {
  impacts: [
    {
      activity: "Started using Leptum",
      date: Date.now(),
      stress: "40",
      fulfillment: "20",
      motivation: "35",
      cleanliness: "40",
    },
  ],
};

export default function ImpactPage() {
  const [state, setState] = useState(defaultState);
  const [activityIndex, setActivityIndex] = useState(0);
  const [editMode, setEditMode] = useState(true);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [showMobileQuickLogDrawer, setShowMobileQuickLogDrawer] = useState(false);
  // Initialize with all available impact categories from METRIC_CONFIG
  const [selectedLines, setSelectedLines] = useState(() => Object.keys(METRIC_CONFIG));
  const [showTimespanSelect, setShowTimespanSelect] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [tempLogData, setTempLogData] = useState({});
  const [touchedFields, setTouchedFields] = useState(new Set());
  const [dateFilter, setDateFilter] = useState("day"); // "day", "week", "month", "year", "all", or specific date string "YYYY-MM-DD"
  const [activeTab, setActiveTab] = useState("impact"); // "impact" or "insights"
  const [activeDateKey, setActiveDateKey] = useState(null); // For date navigation highlighting
  const activities = state.impacts.map((impact) => impact.activity);

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();
  const { insights, loading: insightsLoading, addInsight, updateInsight, deleteInsight } = useInsights();
  const { patternNotes, getPatternNote, savePatternNote, deletePatternNote } = usePatternNotes();
  const { entities } = useEntities();
  const { updateMentionsForSource, deleteMentionsForSource } = useMentions();

  // Form state for insights
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showMobileInsightDrawer, setShowMobileInsightDrawer] = useState(false);
  const [editingInsight, setEditingInsight] = useState(null);
  const [insightFormData, setInsightFormData] = useState({
    name: '',
    notes: '',
    category: '',
    affectedMetrics: []
  });

  // Activity pattern analysis
  const [activityPatterns, setActivityPatterns] = useState([]);
  const [expandedPatterns, setExpandedPatterns] = useState({});
  const [editingPatternNote, setEditingPatternNote] = useState(null);
  const [patternNoteText, setPatternNoteText] = useState("");
  const [showDeleteThoughtConfirm, setShowDeleteThoughtConfirm] = useState(false);
  const [thoughtToDelete, setThoughtToDelete] = useState(null);
  const [nowForFilter, setNowForFilter] = useState(0);

  const openQuickLogModalRef = useRef(() => {});
  const openAddInsightModalRef = useRef(() => {});

  useEffect(() => {
    queueMicrotask(() => setNowForFilter(Date.now()));
    const id = setInterval(() => setNowForFilter(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // Listen for openAddLog and openAddInsight events from header button
  useEffect(() => {
    const handleOpenAddLog = () => {
      openQuickLogModalRef.current();
    };
    const handleOpenAddInsight = () => {
      openAddInsightModalRef.current();
    };
    window.addEventListener('openAddLog', handleOpenAddLog);
    window.addEventListener('openAddInsight', handleOpenAddInsight);
    return () => {
      window.removeEventListener('openAddLog', handleOpenAddLog);
      window.removeEventListener('openAddInsight', handleOpenAddInsight);
    };
  }, []);

  useEffect(() => {
    if (state.impacts && state.impacts.length >= 2) {
      const patterns = analyzeActivityPatterns(state.impacts);
      queueMicrotask(() => setActivityPatterns(patterns));
    }
  }, [state.impacts]);

  const togglePatternExpanded = (activityName) => {
    setExpandedPatterns(prev => ({
      ...prev,
      [activityName]: !prev[activityName]
    }));
  };

  const startEditingPatternNote = (activity) => {
    const existingNote = getPatternNote(activity);
    setEditingPatternNote(activity);
    setPatternNoteText(existingNote?.notes || "");
  };

  const cancelEditingPatternNote = () => {
    setEditingPatternNote(null);
    setPatternNoteText("");
  };

  const saveCurrentPatternNote = async () => {
    if (editingPatternNote && patternNoteText.trim()) {
      await savePatternNote(editingPatternNote, patternNoteText.trim());

      // Extract and save mentions
      const entityIds = extractMentionedEntityIds(patternNoteText);
      await updateMentionsForSource('patternNote', editingPatternNote, 'notes', entityIds, patternNoteText);

      setEditingPatternNote(null);
      setPatternNoteText("");
    }
  };

  const handleDeletePatternNote = (activity) => {
    setThoughtToDelete(activity);
    setShowDeleteThoughtConfirm(true);
  };

  const confirmDeletePatternNote = async () => {
    if (thoughtToDelete) {
      await deletePatternNote(thoughtToDelete);
      // Delete associated mentions
      await deleteMentionsForSource('patternNote', thoughtToDelete);
      if (editingPatternNote === thoughtToDelete) {
        cancelEditingPatternNote();
      }
      setShowDeleteThoughtConfirm(false);
      setThoughtToDelete(null);
    }
  };

  // Listen for openAddLog and openAddInsight events from header button
  useEffect(() => {
    const handleOpenAddLog = () => {
      openQuickLogModalRef.current();
    };
    const handleOpenAddInsight = () => {
      openAddInsightModalRef.current();
    };
    window.addEventListener('openAddLog', handleOpenAddLog);
    window.addEventListener('openAddInsight', handleOpenAddInsight);
    return () => {
      window.removeEventListener('openAddLog', handleOpenAddLog);
      window.removeEventListener('openAddInsight', handleOpenAddInsight);
    };
  }, []);

  useEffect(() => {
    const loadImpacts = async () => {
      try {
        const impacts = await remoteStorageClient.getImpacts();
        if (impacts.length > 0) {
          setState({ impacts });
          setActivityIndex(impacts.length - 1);
        }
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to load impacts:", error);
        setIsDataLoaded(true);
      }
    };

    loadImpacts();

    // Check URL hash to set active tab
    if (window.location.hash === '#insights') {
      queueMicrotask(() => setActiveTab('insights'));
    }
  }, []);

  const impactsKey = useMemo(
    () => JSON.stringify(state.impacts ?? []),
    [state.impacts]
  );

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save until data has been loaded from storage

    const saveImpacts = async () => {
      try {
        await remoteStorageClient.saveImpacts(state.impacts);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("impactsUpdated"));
        }
      } catch (error) {
        console.error("Failed to save impacts:", error);
      }
    };

    saveImpacts();
  }, [impactsKey, isDataLoaded, state.impacts]);

  // Close timespan dropdown when clicking outside
  // Listen for openAddLog and openAddInsight events from header button
  useEffect(() => {
    const handleOpenAddLog = () => {
      openQuickLogModalRef.current();
    };
    const handleOpenAddInsight = () => {
      openAddInsightModalRef.current();
    };
    window.addEventListener('openAddLog', handleOpenAddLog);
    window.addEventListener('openAddInsight', handleOpenAddInsight);
    return () => {
      window.removeEventListener('openAddLog', handleOpenAddLog);
      window.removeEventListener('openAddInsight', handleOpenAddInsight);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTimespanSelect && !event.target.closest('.timespan-select-container')) {
        setShowTimespanSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimespanSelect]);

  const onChange = (impact) => (e) => {
    const value = e.target.value;
    const newState = { ...state };

    // Update [impact] property of the current activity
    // Add safety check to ensure activityIndex is valid
    if (newState.impacts[activityIndex] && activityIndex >= 0 && activityIndex < newState.impacts.length) {
      newState.impacts[activityIndex][impact] = value;
    }

    setState(newState);
  };

  const openQuickLogModal = useCallback(() => {
    // Get the last entry's values as placeholders
    const lastEntry = state.impacts[state.impacts.length - 1] || {};
    const placeholderValues = selectedLines.reduce((acc, line) => {
      if (line !== "activity") {
        // Use last entry's value, or default to 0 for bipolar metrics, 50 for others
        const metricConfig = METRIC_CONFIG[line];
        const defaultValue = metricConfig?.allowsNegative ? 0 : 50;
        acc[line] = lastEntry[line] !== undefined ? lastEntry[line] : defaultValue;
      }
      return acc;
    }, {});

    setTempLogData({
      activity: "",
      notes: "",
      ...placeholderValues
    });
    setTouchedFields(new Set()); // Reset touched fields
    if (window.innerWidth < 768) {
      setShowMobileQuickLogDrawer(true);
    } else {
      setShowQuickLogModal(true);
    }
  }, [state.impacts, selectedLines]);

  useEffect(() => {
    openQuickLogModalRef.current = openQuickLogModal;
  }, [openQuickLogModal]);

  const saveQuickLog = async () => {
    const newState = { ...state };
    // Add a new entry with the logged data
    const timestamp = getCurrentTime();
    const now = new Date(timestamp);
    const defaultActivity = tempLogData.activity ||
      `Now - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    // Only include fields that were actually touched/changed
    const savedData = {};
    touchedFields.forEach(field => {
      if (tempLogData[field] !== undefined) {
        // For emotions array, include even if empty
        if (field === 'emotions') {
          savedData[field] = tempLogData[field] || [];
        } else {
          savedData[field] = tempLogData[field];
        }
      }
    });
    
    // Always include emotions if they exist (even if not in touchedFields)
    if (tempLogData.emotions && tempLogData.emotions.length > 0) {
      savedData.emotions = tempLogData.emotions;
    }

    // Generate unique ID for the impact
    const impactId = `impact-${timestamp}-${getRandomId()}`;

    const newEntry = {
      id: impactId,
      activity: defaultActivity,
      date: timestamp,
      ...savedData
    };
    newState.impacts.push(newEntry);
    setState(newState);

    // Extract and save mentions from activity field
    if (defaultActivity) {
      const activityEntityIds = extractMentionedEntityIds(defaultActivity);
      if (activityEntityIds.length > 0) {
        await updateMentionsForSource('impact', impactId, 'activity', activityEntityIds, defaultActivity);
      }
    }

    // Extract and save mentions from notes field
    if (savedData.notes) {
      const notesEntityIds = extractMentionedEntityIds(savedData.notes);
      if (notesEntityIds.length > 0) {
        await updateMentionsForSource('impact', impactId, 'notes', notesEntityIds, savedData.notes);
      }
    }

    setActivityIndex(newState.impacts.length - 1);
    setShowQuickLogModal(false);
    setShowMobileQuickLogDrawer(false);
    setTempLogData({});
    setTouchedFields(new Set());
  };

  const updateTempLogData = (field, value) => {
    setTempLogData({
      ...tempLogData,
      [field]: value
    });
    // Mark this field as touched (for emotions array, always mark as touched)
    setTouchedFields(prev => new Set([...prev, field]));
  };

  // Remove focus from any element when slider is released to prevent unwanted focus jumps
  const handleSliderRelease = () => {
    // Use setTimeout to ensure this runs after React's state update
    setTimeout(() => {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    }, 0);
  };

  const onChangeActivity = (index) => {
    setActivityIndex(index);
  };

  const toggleEditMode = () => {
    // Edit mode setting can be stored locally or in RemoteStorage if needed
    setEditMode(!editMode);
  };

  const deleteActivity = async () => {
    const result = confirm("Are you sure you want to delete this activity?");
    if (!result) return;

    const impactToDelete = state.impacts[activityIndex];
    const newState = { ...state };
    newState.impacts.splice(activityIndex, 1);
    setState(newState);

    // Delete mentions if the impact has an ID
    if (impactToDelete?.id) {
      await deleteMentionsForSource('impact', impactToDelete.id);
    }

    // Fix: Properly handle the new index after deletion
    if (newState.impacts.length === 0) {
      // No activities left, reset to 0
      setActivityIndex(0);
    } else if (activityIndex >= newState.impacts.length) {
      // Current index is beyond the array, move to the last item
      setActivityIndex(newState.impacts.length - 1);
    } else if (activityIndex > 0) {
      // Move to the previous item if we're not at the beginning
      setActivityIndex(activityIndex - 1);
    }
    // If activityIndex is 0 and there are still items, keep it at 0
  };


  const updateActivityName = async (newName) => {
    const newState = { ...state };
    if (newState.impacts[activityIndex]) {
      newState.impacts[activityIndex].activity = newName;

      // Ensure the impact has an ID
      const impactId = newState.impacts[activityIndex].id ||
        `impact-${newState.impacts[activityIndex].date}-${Math.random().toString(36).substr(2, 9)}`;
      if (!newState.impacts[activityIndex].id) {
        newState.impacts[activityIndex].id = impactId;
      }

      setState(newState);

      // Save mentions for activity field
      const activityEntityIds = extractMentionedEntityIds(newName);
      await updateMentionsForSource('impact', impactId, 'activity', activityEntityIds, newName);
    }
  };

  const formatDateKey = (timestamp) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isToday = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getFilteredImpacts = () => {
    const todayStart = new Date(nowForFilter || undefined);
    todayStart.setHours(0, 0, 0, 0);

    // Check if dateFilter is a specific date (YYYY-MM-DD format)
    if (dateFilter.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateFilter.split('-').map(Number);
      const dayStart = new Date(year, month - 1, day).getTime();
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
      return state.impacts.filter(impact => impact.date >= dayStart && impact.date <= dayEnd);
    }

    switch (dateFilter) {
      case "day":
        return state.impacts.filter(impact => impact.date >= todayStart.getTime());
      case "week":
        const weekAgo = new Date((nowForFilter || 0) - 7 * 24 * 60 * 60 * 1000);
        weekAgo.setHours(0, 0, 0, 0);
        return state.impacts.filter(impact => impact.date >= weekAgo.getTime());
      case "month":
        const monthAgo = new Date((nowForFilter || 0) - 30 * 24 * 60 * 60 * 1000);
        monthAgo.setHours(0, 0, 0, 0);
        return state.impacts.filter(impact => impact.date >= monthAgo.getTime());
      case "year":
        const yearAgo = new Date((nowForFilter || 0) - 365 * 24 * 60 * 60 * 1000);
        yearAgo.setHours(0, 0, 0, 0);
        return state.impacts.filter(impact => impact.date >= yearAgo.getTime());
      case "all":
      default:
        return state.impacts;
    }
  };

  const filteredImpacts = getFilteredImpacts();

  // Get all unique dates that have impacts
  const allDates = [...new Set(state.impacts.map(impact => formatDateKey(impact.date)))].sort().reverse();

  // Insights management functions
  const openAddInsightModal = useCallback(() => {
    setEditingInsight(null);
    setInsightFormData({
      name: '',
      notes: '',
      category: '',
      affectedMetrics: []
    });
    if (window.innerWidth < 768) {
      setShowMobileInsightDrawer(true);
    } else {
      setShowInsightModal(true);
    }
  }, []);

  useEffect(() => {
    openAddInsightModalRef.current = openAddInsightModal;
  }, [openAddInsightModal]);

  const openEditInsightModal = (insight) => {
    setEditingInsight(insight);
    setInsightFormData({
      name: insight.name,
      notes: insight.notes || '',
      category: insight.category || '',
      affectedMetrics: insight.affectedMetrics
    });
    if (window.innerWidth < 768) {
      setShowMobileInsightDrawer(true);
    } else {
      setShowInsightModal(true);
    }
  };

  const toggleInsightMetric = (metric) => {
    const existingIndex = insightFormData.affectedMetrics.findIndex(m => m.metric === metric);

    if (existingIndex >= 0) {
      const existing = insightFormData.affectedMetrics[existingIndex];
      if (existing.effect === 'positive') {
        const updated = [...insightFormData.affectedMetrics];
        updated[existingIndex] = { ...existing, effect: 'negative' };
        setInsightFormData({ ...insightFormData, affectedMetrics: updated });
      } else {
        const updated = insightFormData.affectedMetrics.filter(m => m.metric !== metric);
        setInsightFormData({ ...insightFormData, affectedMetrics: updated });
      }
    } else {
      setInsightFormData({
        ...insightFormData,
        affectedMetrics: [...insightFormData.affectedMetrics, { metric, effect: 'positive' }]
      });
    }
  };

  const handleSaveInsight = async () => {
    if (!insightFormData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (insightFormData.affectedMetrics.length === 0) {
      alert('Please select at least one affected metric');
      return;
    }

    let insightId;
    if (editingInsight) {
      await updateInsight(editingInsight.id, insightFormData);
      insightId = editingInsight.id;
    } else {
      const newInsight = await addInsight(insightFormData);
      insightId = newInsight.id;
    }

    // Extract and save mentions from notes field
    if (insightFormData.notes) {
      const entityIds = extractMentionedEntityIds(insightFormData.notes);
      await updateMentionsForSource('insight', insightId, 'notes', entityIds, insightFormData.notes);
    } else {
      // If notes are empty, clear any existing mentions
      await updateMentionsForSource('insight', insightId, 'notes', [], '');
    }

    setShowInsightModal(false);
    setShowMobileInsightDrawer(false);
  };

  const handleDeleteInsight = async (id) => {
    if (confirm('Are you sure you want to delete this insight?')) {
      await deleteMentionsForSource('insight', id);
      await deleteInsight(id);
    }
  };

  const getInsightMetricEffect = (metric) => {
    const found = insightFormData.affectedMetrics.find(m => m.metric === metric);
    return found ? found.effect : null;
  };

  const getInsightMetricButtonStyle = (metric) => {
    const effect = getInsightMetricEffect(metric);
    if (!effect) {
      return "bg-muted text-foreground border border-border";
    }
    if (effect === 'positive') {
      return "bg-green-500 text-white border border-green-600";
    }
    return "bg-red-500 text-white border border-red-600";
  };

  const getInsightMetricSymbol = (metric) => {
    const effect = getInsightMetricEffect(metric);
    if (!effect) return '';
    return effect === 'positive' ? ' ↑' : ' ↓';
  };

  const renderQuickLogForm = (onSave, onCancel) => (
    <div className="space-y-4 mt-4">
      {/* Activity Name Input */}
      <div>
        <MentionInput
          placeholder="What are you doing? Use @ to mention (optional)"
          className="text-lg"
          value={tempLogData.activity || ""}
          onChange={(value) => updateTempLogData("activity", value)}
          entities={entities}
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
            value={tempLogData.goalId || ""}
            onChange={(e) => updateTempLogData("goalId", e.target.value)}
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

      {/* Notes/Diary */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Notes / Diary Entry (optional)
        </label>
        <MentionInput
          placeholder="How are you feeling? What happened today? Use @ to mention"
          value={tempLogData.notes || ""}
          onChange={(value) => updateTempLogData("notes", value)}
          entities={entities}
          multiline={true}
          rows={4}
        />
      </div>

      {/* Emotion Selector */}
      <EmotionSelector
        selectedEmotions={tempLogData.emotions || []}
        onChange={(emotions) => updateTempLogData("emotions", emotions)}
      />
      
      <div className="flex gap-2 justify-end pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
        >
          Save Log
        </button>
      </div>
    </div>
  );

  const renderInsightForm = (onSave, onCancel) => (
    <div className="space-y-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Name *
        </label>
        <Input
          type="text"
          placeholder="e.g., Tea, Walk outside, Call a friend"
          value={insightFormData.name}
          onChange={(e) => setInsightFormData({ ...insightFormData, name: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Category (optional)
        </label>
        <Input
          type="text"
          placeholder="e.g., Self-care, Social, Physical"
          value={insightFormData.category}
          onChange={(e) => setInsightFormData({ ...insightFormData, category: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Affected Metrics *
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Click once for positive effect (↑), twice for negative (↓), third to remove
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(METRIC_CONFIG).map(metric => (
            <button
              key={metric}
              type="button"
              onClick={() => toggleInsightMetric(metric)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${getInsightMetricButtonStyle(metric)}`}
            >
              {metric}{getInsightMetricSymbol(metric)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Notes (optional)
        </label>
        <MentionInput
          placeholder="When does this help? Any specific situations? Use @ to mention people, projects, or contexts"
          value={insightFormData.notes}
          onChange={(value) => setInsightFormData({ ...insightFormData, notes: value })}
          entities={entities}
          multiline={true}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
        >
          {editingInsight ? 'Save Changes' : 'Add Insight'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-6xl mx-auto pt-4 pb-32 md:pb-8 w-full overflow-x-hidden">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Wellbeing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your mood and discover what helps
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab('impact');
              window.history.replaceState(null, '', '/impact');
            }}
            className={`pb-3 px-2 font-medium transition-colors relative ${
              activeTab === 'impact'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Impact Tracking
            {activeTab === 'impact' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('insights');
              window.history.replaceState(null, '', '/impact#insights');
            }}
            className={`pb-3 px-2 font-medium transition-colors relative ${
              activeTab === 'insights'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Insights
            {activeTab === 'insights' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Add Button - Fixed above navigation */}
      <button
        onClick={activeTab === 'impact' ? openQuickLogModal : openAddInsightModal}
        className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
      >
        <PlusIcon className="w-5 h-5" />
        <span>{activeTab === 'impact' ? 'Add Log' : 'Add Insight'}</span>
      </button>

      {/* Quick Log Modal */}
      <Modal
        isOpen={showQuickLogModal}
        closeModal={() => setShowQuickLogModal(false)}
      >
        <Modal.Title>Quick Log</Modal.Title>
        <Modal.Body>
          {renderQuickLogForm(saveQuickLog, () => setShowQuickLogModal(false))}
        </Modal.Body>
      </Modal>

      <Drawer open={showMobileQuickLogDrawer} onOpenChange={setShowMobileQuickLogDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Quick Log</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            {renderQuickLogForm(saveQuickLog, () => setShowMobileQuickLogDrawer(false))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Impact Tracking Tab Content */}
      {activeTab === 'impact' && (
        <>
      {/* Date Navigation Bar */}
      {allDates.length > 0 && (
        <div className="mb-6 w-full" style={{ overflow: 'hidden', contain: 'layout' }}>
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm pb-4 border-b border-border w-full" style={{ overflow: 'hidden', contain: 'layout' }}>
            <div className="overflow-x-auto scrollbar-hide pb-2 -mb-2 w-full" style={{ overflowY: 'hidden', overflowX: 'auto', contain: 'layout style', maxWidth: '100%' }}>
              <div className="flex gap-2 min-w-max">
              {allDates.map((dateKey) => {
                const [year, month, day] = dateKey.split('-').map(Number);
                const dateTimestamp = new Date(year, month - 1, day).getTime();
                const isDateToday = isToday(dateTimestamp);
                const isActive = dateFilter === dateKey || (dateFilter === "day" && isDateToday);
                const dateImpacts = state.impacts.filter(impact => formatDateKey(impact.date) === dateKey);
                
                // Use consistent date formatting to avoid hydration mismatches
                const dateObj = new Date(year, month - 1, day);
                const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[month - 1];

                return (
                  <button
                    key={dateKey}
                    onClick={() => {
                      setDateFilter(dateKey);
                      setActiveDateKey(dateKey);
                    }}
                    className={`
                      px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all
                      flex flex-col items-center gap-0.5 min-w-[70px] flex-shrink-0
                      ${isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : isDateToday
                        ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                    `}
                    title={`${dateImpacts.length} ${dateImpacts.length === 1 ? 'entry' : 'entries'}`}
                  >
                    <span className={`text-xs ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                      {weekday}
                    </span>
                    <span className="font-semibold">
                      {monthName} {day}
                    </span>
                    {isDateToday && (
                      <span className={`text-[10px] ${isActive ? 'opacity-90' : 'opacity-70'}`}>Today</span>
                    )}
                    {dateImpacts.length > 0 && (
                      <span className={`text-[10px] ${isActive ? 'opacity-90' : 'opacity-70'}`}>
                        {dateImpacts.length}
                      </span>
                    )}
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timespan and Category Selectors */}
      <div className="flex gap-2 mb-4">
        {/* Timespan Dropdown */}
        <div className="relative timespan-select-container">
          <button
            onClick={() => setShowTimespanSelect(!showTimespanSelect)}
            className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
          >
            <span>
              {dateFilter.match(/^\d{4}-\d{2}-\d{2}$/) 
                ? new Date(dateFilter + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : dateFilter === "day" ? "Today" :
                 dateFilter === "week" ? "Week" :
                 dateFilter === "month" ? "Month" :
                 dateFilter === "year" ? "Year" :
                 "All Time"}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${showTimespanSelect ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showTimespanSelect && (
            <div className="absolute z-10 mt-2 w-40 bg-card border border-border rounded-lg shadow-lg p-2">
              {[
                { value: "day", label: "Today" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
                { value: "year", label: "Year" },
                { value: "all", label: "All Time" }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setDateFilter(option.value);
                    setShowTimespanSelect(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors ${
                    dateFilter === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Multiselect */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <span>Impact Categories ({selectedLines.length})</span>
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
            <DropdownMenuLabel>Select Categories</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.keys(METRIC_CONFIG).map((category) => {
              const isSelected = selectedLines.includes(category);
              return (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedLines([...selectedLines, category]);
                    } else {
                      setSelectedLines(selectedLines.filter((item) => item !== category));
                    }
                  }}
                >
                  <span className="capitalize">{category}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Chart - Only show when there's data */}
      {filteredImpacts.length > 0 && (
        <SummaryChart
          impacts={filteredImpacts}
          selectedLines={selectedLines}
          dateFilter={dateFilter}
          currentActivityTimestamp={state.impacts[activityIndex]?.date}
        />
      )}

      {/* Empty State with Recent Entries */}
      {filteredImpacts.length === 0 && (
        <div className="mt-8 space-y-6">
          {/* Main Empty State */}
          <div className="bg-card border border-border rounded-lg p-8 md:p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                {dateFilter.match(/^\d{4}-\d{2}-\d{2}$/)
                  ? `No entries on ${new Date(dateFilter + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                  : dateFilter === 'day' ? "No entries today yet" : 
                   dateFilter === 'week' ? "No entries this week" :
                   dateFilter === 'month' ? "No entries this month" :
                   dateFilter === 'year' ? "No entries this year" :
                   "No entries found"}
              </h2>
              <p className="text-muted-foreground">
                {dateFilter === 'day' || dateFilter.match(/^\d{4}-\d{2}-\d{2}$/)
                  ? "Start tracking your wellbeing by logging how you're feeling and what you're doing."
                  : "Try adjusting the time filter or add your first wellbeing entry."}
              </p>
              <button
                onClick={openQuickLogModal}
                className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium inline-flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>{state.impacts.length === 0 ? "Add Your First Log" : "Add New Log"}</span>
              </button>
            </div>
          </div>

          {/* Recent Entries from Previous Days */}
          {(() => {
            // Get entries from previous days (excluding current filter period)
            const todayStart = new Date(nowForFilter || undefined);
            todayStart.setHours(0, 0, 0, 0);

            let recentImpacts = [];

            if (dateFilter === 'day') {
              // Show last 5 days excluding today
              recentImpacts = state.impacts
                .filter(impact => impact.date < todayStart.getTime())
                .sort((a, b) => b.date - a.date)
                .slice(0, 5);
            } else if (dateFilter === 'week') {
              // Show entries from before this week
              const weekAgo = new Date((nowForFilter || 0) - 7 * 24 * 60 * 60 * 1000);
              weekAgo.setHours(0, 0, 0, 0);
              recentImpacts = state.impacts
                .filter(impact => impact.date < weekAgo.getTime())
                .sort((a, b) => b.date - a.date)
                .slice(0, 5);
            } else if (dateFilter === 'month') {
              // Show entries from before this month
              const monthAgo = new Date((nowForFilter || 0) - 30 * 24 * 60 * 60 * 1000);
              monthAgo.setHours(0, 0, 0, 0);
              recentImpacts = state.impacts
                .filter(impact => impact.date < monthAgo.getTime())
                .sort((a, b) => b.date - a.date)
                .slice(0, 5);
            }

            if (recentImpacts.length === 0) {
              return null;
            }

            // Group by day
            const groupedByDay = {};
            recentImpacts.forEach(impact => {
              const date = new Date(impact.date);
              const dateKey = date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              });
              if (!groupedByDay[dateKey]) {
                groupedByDay[dateKey] = [];
              }
              groupedByDay[dateKey].push(impact);
            });

            return (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Entries
                </h3>
                <div className="space-y-4">
                  {Object.entries(groupedByDay).map(([dateKey, impacts]) => (
                    <div key={dateKey} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{dateKey}</h4>
                      <div className="space-y-2">
                        {impacts.map((impact, idx) => {
                          const time = new Date(impact.date).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });
                          
                          // Get metric values to show
                          const metrics = selectedLines
                            .filter(line => line !== 'activity' && impact[line] !== undefined && impact[line] !== '')
                            .slice(0, 3)
                            .map(metric => {
                              const value = parseInt(impact[metric]);
                              const config = METRIC_CONFIG[metric];
                              const isGood = config?.inverted 
                                ? value < 50 
                                : (config?.allowsNegative ? value > 0 : value > 50);
                              return { metric, value, isGood };
                            });

                          return (
                            <div 
                              key={idx}
                              className="flex items-start justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition cursor-pointer"
                              onClick={() => {
                                const originalIndex = state.impacts.findIndex(imp => imp === impact);
                                if (originalIndex !== -1) {
                                  onChangeActivity(originalIndex);
                                  // Switch to "all" filter to see this entry
                                  if (dateFilter !== 'all') {
                                    setDateFilter('all');
                                  }
                                }
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-muted-foreground font-mono">{time}</span>
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {impact.activity || 'Untitled entry'}
                                  </span>
                                </div>
                                {metrics.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {metrics.map(({ metric, value, isGood }) => (
                                      <span
                                        key={metric}
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                                          isGood
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                        }`}
                                      >
                                        {metric}: {value}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {impact.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                    {impact.notes}
                                  </p>
                                )}
                              </div>
                              <svg className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {state.impacts.length > recentImpacts.length && (
                  <button
                    onClick={() => setDateFilter('all')}
                    className="mt-4 w-full text-sm text-primary hover:underline"
                  >
                    View all {state.impacts.length} entries →
                  </button>
                )}
              </div>
            );
          })()}

          {/* Statistics Summary */}
          {state.impacts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-foreground">{state.impacts.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Total entries</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-foreground">
                  {(() => {
                    const uniqueActivities = new Set(state.impacts.map(i => i.activity)).size;
                    return uniqueActivities;
                  })()}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Unique activities</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-2xl font-bold text-foreground">
                  {(() => {
                    const daysWithEntries = new Set(
                      state.impacts.map(i => {
                        const d = new Date(i.date);
                        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                      })
                    ).size;
                    return daysWithEntries;
                  })()}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Days tracked</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Selector and Edit Panel */}
      {filteredImpacts.length > 0 && (
        <div className="mt-8 bg-card border border-border rounded-lg p-6">
          <ActivitySelector
            impacts={filteredImpacts}
            index={filteredImpacts.findIndex(imp => imp === state.impacts[activityIndex])}
            onChange={(filteredIdx) => {
              // Map filtered index back to original index
              const selectedImpact = filteredImpacts[filteredIdx];
              const originalIndex = state.impacts.findIndex(imp => imp === selectedImpact);
              if (originalIndex !== -1) {
                onChangeActivity(originalIndex);
              }
            }}
            onDelete={deleteActivity}
            onToggleEdit={toggleEditMode}
            editMode={editMode}
          />

          {/* Edit Activity Name */}
              {editMode && state.impacts[activityIndex] && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Activity Name
                </label>
                <MentionInput
                  value={state.impacts[activityIndex]?.activity || ""}
                  onChange={(value) => updateActivityName(value)}
                  placeholder="Activity name (use @ to mention)"
                  entities={entities}
                />
              </div>

              {/* Notes/Diary */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes / Diary Entry
                </label>
                <MentionInput
                  placeholder="How are you feeling? What happened? Use @ to mention"
                  value={state.impacts[activityIndex]?.notes || ""}
                  onChange={(value) => {
                    const newState = { ...state };
                    if (newState.impacts[activityIndex]) {
                      newState.impacts[activityIndex].notes = value;
                      setState(newState);
                      // Save mentions for notes field
                      const impactId = newState.impacts[activityIndex].id ||
                        `impact-${newState.impacts[activityIndex].date}-${Math.random().toString(36).substr(2, 9)}`;
                      if (!newState.impacts[activityIndex].id) {
                        newState.impacts[activityIndex].id = impactId;
                      }
                      const notesEntityIds = extractMentionedEntityIds(value);
                      updateMentionsForSource('impact', impactId, 'notes', notesEntityIds, value);
                    }
                  }}
                  entities={entities}
                  multiline={true}
                  rows={4}
                />
              </div>

              {/* Emotion Selector */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">How did this make you feel?</h3>
                <EmotionSelector
                  selectedEmotions={state.impacts[activityIndex]?.emotions || []}
                  onChange={(emotions) => {
                    const newState = { ...state };
                    if (newState.impacts[activityIndex]) {
                      newState.impacts[activityIndex].emotions = emotions;
                      setState(newState);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Insights Tab Content */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Discovered Patterns from Data */}
          {activityPatterns.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Discovered Patterns</h2>
                <span className="text-xs text-muted-foreground">
                  Based on your logged activities
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activityPatterns.slice(0, 10).map((pattern, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-primary/5 to-transparent border border-border rounded-lg p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground mb-1">
                          <HighlightedMentions text={pattern.activity} />
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Logged {pattern.totalLogs} {pattern.totalLogs === 1 ? 'time' : 'times'}
                          {pattern.totalLogs === 1 && (
                            <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                              • Early data
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {pattern.positiveEffects.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                            Positive Effects:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {pattern.positiveEffects.map(effect => {
                              const isInverted = ['stress', 'shame', 'guilt'].includes(effect.metric);
                              const displayValue = isInverted
                                ? `${effect.change}` // Shows -29 for stress decrease
                                : `+${effect.change}`; // Shows +20 for happiness increase
                              return (
                                <span
                                  key={effect.metric}
                                  className="text-xs px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full font-medium capitalize"
                                >
                                  {effect.metric} {displayValue}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {pattern.negativeEffects.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                            Negative Effects:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {pattern.negativeEffects.map(effect => {
                              const isInverted = ['stress', 'shame', 'guilt'].includes(effect.metric);
                              const displayValue = isInverted
                                ? `+${effect.change}` // Shows +20 for stress increase
                                : `${effect.change}`; // Shows -20 for happiness decrease
                              return (
                                <span
                                  key={effect.metric}
                                  className="text-xs px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full font-medium capitalize"
                                >
                                  {effect.metric} {displayValue}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Show References Button */}
                    <button
                      onClick={() => togglePatternExpanded(pattern.activity)}
                      className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedPatterns[pattern.activity] ? 'rotate-180' : ''}`} />
                      {expandedPatterns[pattern.activity] ? 'Hide' : 'Show'} details
                    </button>

                    {/* References */}
                    {expandedPatterns[pattern.activity] && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">When this was detected:</p>
                        {[...pattern.positiveEffects, ...pattern.negativeEffects].map((effect, effectIdx) => (
                          <div key={effectIdx} className="space-y-1">
                            <p className="text-xs font-medium capitalize text-foreground">{effect.metric}:</p>
                            {effect.references && effect.references.map((ref, refIdx) => (
                              <div key={refIdx} className="text-xs bg-muted/50 rounded px-2 py-1.5">
                                <p className="text-muted-foreground">
                                  {new Date(ref.date).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <p className="text-foreground">
                                  {ref.previousValue} → {ref.currentValue}
                                  <span className={ref.change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {' '}({ref.change > 0 ? '+' : ''}{ref.change})
                                  </span>
                                </p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Your Thoughts Section */}
                    <div className="mt-3 pt-3 border-t border-border">
                      {(() => {
                        const existingNote = getPatternNote(pattern.activity);
                        const isEditing = editingPatternNote === pattern.activity;

                        if (isEditing) {
                          return (
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-foreground">
                                Your thoughts on this pattern:
                              </label>
                              <MentionInput
                                value={patternNoteText}
                                onChange={(value) => setPatternNoteText(value)}
                                placeholder="What do you think about this pattern? Use @ to mention people, projects, or contexts"
                                entities={entities}
                                multiline={true}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={saveCurrentPatternNote}
                                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditingPatternNote}
                                  className="px-3 py-1.5 bg-muted text-foreground rounded text-xs hover:opacity-80"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (existingNote) {
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-foreground">Your thoughts:</p>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => startEditingPatternNote(pattern.activity)}
                                    className="p-1 text-foreground hover:bg-muted rounded transition"
                                    title="Edit thoughts"
                                  >
                                    <PencilIcon className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePatternNote(pattern.activity)}
                                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition"
                                    title="Delete thoughts"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2 whitespace-pre-wrap">
                                <HighlightedMentions text={existingNote.notes} />
                              </p>
                            </div>
                          );
                        }

                        return (
                          <button
                            onClick={() => startEditingPatternNote(pattern.activity)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                            Add your thoughts
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              {activityPatterns.length === 0 && (
                <div className="text-center py-8 bg-card border border-border rounded-lg">
                  <ChartBarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    Keep logging your activities and mood to discover patterns!
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    You need at least 2 logs to see patterns.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Insights */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Insights</h2>
          {insights.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground mb-4">
                No insights yet. Start adding what helps your mood!
              </p>
              <Button onClick={openAddInsightModal}>
                Add Your First Insight
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map(insight => (
              <div
                key={insight.id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {insight.name}
                    </h3>
                    {insight.category && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        {insight.category}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditInsightModal(insight)}
                      className="p-2 text-foreground hover:bg-muted rounded-lg transition"
                      title="Edit"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteInsight(insight.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {insight.affectedMetrics.map(({ metric, effect }) => (
                    <span
                      key={metric}
                      className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
                        effect === 'positive'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}
                    >
                      {effect === 'positive' ? '↑' : '↓'} {metric}
                    </span>
                  ))}
                </div>

                {insight.notes && (
                  <p className="text-sm text-muted-foreground">
                    <HighlightedMentions text={insight.notes} />
                  </p>
                )}
              </div>
            ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Insight Modal */}
      <Modal isOpen={showInsightModal} closeModal={() => setShowInsightModal(false)}>
        <Modal.Title>
          {editingInsight ? 'Edit Insight' : 'Add Insight'}
        </Modal.Title>
        <Modal.Body>
          {renderInsightForm(handleSaveInsight, () => setShowInsightModal(false))}
        </Modal.Body>
      </Modal>

      <Drawer open={showMobileInsightDrawer} onOpenChange={setShowMobileInsightDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{editingInsight ? 'Edit Insight' : 'Add Insight'}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            {renderInsightForm(handleSaveInsight, () => setShowMobileInsightDrawer(false))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Thought Confirmation Modal */}
      <Modal
        isOpen={showDeleteThoughtConfirm}
        closeModal={() => {
          setShowDeleteThoughtConfirm(false);
          setThoughtToDelete(null);
        }}
      >
        <Modal.Title>Delete Thought</Modal.Title>
        <Modal.Body>
          Are you sure you want to delete your thoughts on this pattern?
        </Modal.Body>
        <Modal.Footer>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowDeleteThoughtConfirm(false);
                setThoughtToDelete(null);
              }}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeletePatternNote}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal.Footer>
      </Modal>
      </div>
    </>
  );
}
