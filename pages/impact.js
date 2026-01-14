import { PlusIcon } from "@heroicons/react/solid";
import Head from "next/head";
import { useEffect, useState } from "react";
import ActivitySelector from "../components/ActivitySelector";
import ImpactCard from "../components/ImpactCard";
import SummaryChart from "../components/SummaryChart";
import Modal from "../components/Modal";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import { remoteStorageClient } from "../lib/remoteStorage";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import { useInsights } from "../utils/useInsights";
import { usePatternNotes } from "../utils/usePatternNotes";
import { useEntities } from "../utils/useEntities";
import { TrashIcon, PencilIcon, ChartBarIcon, ChevronDownIcon } from "@heroicons/react/solid";
import { analyzeActivityPatterns, getSuggestionsForMetrics } from "../utils/activityAnalysis";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { MentionInput, HighlightedMentions, extractMentionedEntityIds } from "../components/ui/mention-input";
import { useMentions } from "../utils/useMentions";

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
  const [dateFilter, setDateFilter] = useState("day"); // "day", "week", "month", "year", "all"
  const [activeTab, setActiveTab] = useState("impact"); // "impact" or "insights"
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

  // Analyze activity patterns when impacts change
  useEffect(() => {
    if (state.impacts && state.impacts.length >= 2) {
      const patterns = analyzeActivityPatterns(state.impacts);
      setActivityPatterns(patterns);
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
      setActiveTab('insights');
    }
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save until data has been loaded from storage
    
    const saveImpacts = async () => {
      try {
        await remoteStorageClient.saveImpacts(state.impacts);
      } catch (error) {
        console.error("Failed to save impacts:", error);
      }
    };

    saveImpacts();
  }, [JSON.stringify(state.impacts), isDataLoaded]);

  // Close timespan dropdown when clicking outside
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

  const openQuickLogModal = () => {
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
  };

  const saveQuickLog = async () => {
    const newState = { ...state };
    // Add a new entry with the logged data
    const now = new Date();
    const timestamp = Date.now();
    const defaultActivity = tempLogData.activity ||
      `Now - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    // Only include fields that were actually touched/changed
    const savedData = {};
    touchedFields.forEach(field => {
      if (tempLogData[field] !== undefined) {
        savedData[field] = tempLogData[field];
      }
    });

    // Generate unique ID for the impact
    const impactId = `impact-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

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
    // Mark this field as touched
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

  const getFilteredImpacts = () => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case "day":
        return state.impacts.filter(impact => impact.date >= todayStart.getTime());
      case "week":
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        weekAgo.setHours(0, 0, 0, 0);
        return state.impacts.filter(impact => impact.date >= weekAgo.getTime());
      case "month":
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        monthAgo.setHours(0, 0, 0, 0);
        return state.impacts.filter(impact => impact.date >= monthAgo.getTime());
      case "year":
        const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);
        yearAgo.setHours(0, 0, 0, 0);
        return state.impacts.filter(impact => impact.date >= yearAgo.getTime());
      case "all":
      default:
        return state.impacts;
    }
  };

  const filteredImpacts = getFilteredImpacts();

  // Insights management functions
  const openAddInsightModal = () => {
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
  };

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

  const QuickLogForm = ({ onSave, onCancel }) => (
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

      {/* Emotion Sliders */}
      {selectedLines
        .filter((impact) => impact !== "activity")
        .map((impact) => {
          const metricConfig = METRIC_CONFIG[impact] || { min: 0, max: 100, allowsNegative: false };
          const defaultValue = metricConfig.allowsNegative ? 0 : 50;
          const placeholderValue = tempLogData[impact] !== undefined ? tempLogData[impact] : defaultValue;
          const displayValue = touchedFields.has(impact) ? tempLogData[impact] : placeholderValue;

          // Calculate gradient - red to green (or inverted for negative metrics)
          const getSliderStyle = () => {
            if (!metricConfig.showGradient) {
              return {};
            }
            // Inverted gradient for metrics where lower is better (stress, shame, guilt)
            if (metricConfig.inverted) {
              return {
                background: `linear-gradient(to right, #22c55e 0%, #fbbf24 50%, #ef4444 100%)`,
                backgroundSize: '100% 100%',
              };
            }
            // Normal gradient for metrics where higher is better
            return {
              background: `linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #22c55e 100%)`,
              backgroundSize: '100% 100%',
            };
          };

          return (
            <div key={impact}>
              <label className="block text-sm font-medium text-foreground mb-2 capitalize">
                {impact}
                {metricConfig.allowsNegative && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (negative to positive)
                  </span>
                )}
              </label>
              <div className="flex items-center gap-3">
                {metricConfig.allowsNegative ? (
                  <div className="flex-grow flex items-center gap-2">
                    <span className="text-xs text-foreground/70 font-medium">-100</span>
                    <div className="flex-grow relative">
                      <input
                        type="range"
                        min={metricConfig.min}
                        max={metricConfig.max}
                        step="10"
                        value={displayValue}
                        onChange={(e) => updateTempLogData(impact, e.target.value)}
                        onMouseUp={handleSliderRelease}
                        onTouchEnd={handleSliderRelease}
                        className="w-full h-2 appearance-none cursor-pointer rounded-lg"
                        style={getSliderStyle()}
                      />
                    </div>
                    <span className="text-xs text-foreground/70 font-medium">+100</span>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center gap-2">
                    <span className="text-xs text-foreground/70 font-medium">0</span>
                    <div className="flex-grow relative">
                      <input
                        type="range"
                        min={metricConfig.min}
                        max={metricConfig.max}
                        step="10"
                        value={displayValue}
                        onChange={(e) => updateTempLogData(impact, e.target.value)}
                        onMouseUp={handleSliderRelease}
                        onTouchEnd={handleSliderRelease}
                        className="w-full h-2 appearance-none cursor-pointer rounded-lg"
                        style={getSliderStyle()}
                      />
                    </div>
                    <span className="text-xs text-foreground/70 font-medium">100</span>
                  </div>
                )}
                <div className="w-20 p-2 bg-muted text-foreground text-center rounded border border-border select-none">
                  {touchedFields.has(impact) ? tempLogData[impact] : placeholderValue}
                </div>
              </div>
            </div>
          );
        })}
      
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

  const InsightForm = ({ onSave, onCancel }) => (
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
      <Head>
        <title>Wellbeing - Leptum</title>
      </Head>

      <div className="max-w-6xl mx-auto pb-32 md:pb-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Wellbeing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your mood and discover what helps
          </p>
        </div>
        {/* Desktop Add Button */}
        {activeTab === 'impact' ? (
          <button
            onClick={openQuickLogModal}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Log</span>
          </button>
        ) : (
          <button
            onClick={openAddInsightModal}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Insight</span>
          </button>
        )}
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
          <QuickLogForm 
            onSave={saveQuickLog} 
            onCancel={() => setShowQuickLogModal(false)} 
          />
        </Modal.Body>
      </Modal>

      <Drawer open={showMobileQuickLogDrawer} onOpenChange={setShowMobileQuickLogDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Quick Log</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <QuickLogForm 
              onSave={saveQuickLog} 
              onCancel={() => setShowMobileQuickLogDrawer(false)} 
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Impact Tracking Tab Content */}
      {activeTab === 'impact' && (
        <>
      {/* Timespan and Category Selectors */}
      <div className="flex gap-2 mb-4">
        {/* Timespan Dropdown */}
        <div className="relative timespan-select-container">
          <button
            onClick={() => setShowTimespanSelect(!showTimespanSelect)}
            className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
          >
            <span>
              {dateFilter === "day" ? "Today" :
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

      <SummaryChart
        impacts={filteredImpacts}
        activities={state.activities}
        selectedLines={selectedLines}
        dateFilter={dateFilter}
        currentActivityTimestamp={state.impacts[activityIndex]?.date}
      />

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

              {/* Emotion Sliders */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Emotion Metrics</h3>
                {selectedLines
                  .filter((impact) => impact !== "activity")
                  .map((impact) => {
                    const metricConfig = METRIC_CONFIG[impact] || { min: 0, max: 100, allowsNegative: false, showGradient: false, inverted: false };
                    const currentValue = state.impacts[activityIndex]?.[impact] || 0;

                    // Calculate gradient - red to green (or inverted for negative metrics)
                    const getSliderStyle = () => {
                      if (!metricConfig.showGradient) {
                        return {};
                      }
                      // Inverted gradient for metrics where lower is better (stress, shame, guilt)
                      if (metricConfig.inverted) {
                        return {
                          background: `linear-gradient(to right, #22c55e 0%, #fbbf24 50%, #ef4444 100%)`,
                          backgroundSize: '100% 100%',
                        };
                      }
                      // Normal gradient for metrics where higher is better
                      return {
                        background: `linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #22c55e 100%)`,
                        backgroundSize: '100% 100%',
                      };
                    };

                    return (
                      <div key={impact}>
                        <label className="block text-sm font-medium text-foreground mb-2 capitalize">
                          {impact}
                          {metricConfig.allowsNegative && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (negative to positive)
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-3">
                          {metricConfig.allowsNegative ? (
                            <div className="flex-grow flex items-center gap-2">
                              <span className="text-xs text-foreground/70 font-medium">-100</span>
                              <div className="flex-grow relative">
                                <input
                                  type="range"
                                  min={metricConfig.min}
                                  max={metricConfig.max}
                                  step="10"
                                  value={currentValue}
                                  onChange={onChange(impact)}
                                  onMouseUp={handleSliderRelease}
                                  onTouchEnd={handleSliderRelease}
                                  className="w-full h-2 appearance-none cursor-pointer rounded-lg"
                                  style={getSliderStyle()}
                                />
                              </div>
                              <span className="text-xs text-foreground/70 font-medium">+100</span>
                            </div>
                          ) : (
                            <div className="flex-grow flex items-center gap-2">
                              <span className="text-xs text-foreground/70 font-medium">0</span>
                              <div className="flex-grow relative">
                                <input
                                  type="range"
                                  min={metricConfig.min}
                                  max={metricConfig.max}
                                  step="10"
                                  value={currentValue}
                                  onChange={onChange(impact)}
                                  onMouseUp={handleSliderRelease}
                                  onTouchEnd={handleSliderRelease}
                                  className="w-full h-2 appearance-none cursor-pointer rounded-lg"
                                  style={getSliderStyle()}
                                />
                              </div>
                              <span className="text-xs text-foreground/70 font-medium">100</span>
                            </div>
                          )}
                          <div className="w-20 p-2 bg-muted text-foreground text-center rounded border border-border select-none">
                            {state.impacts[activityIndex]?.[impact] || 0}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          <InsightForm 
            onSave={handleSaveInsight} 
            onCancel={() => setShowInsightModal(false)} 
          />
        </Modal.Body>
      </Modal>

      <Drawer open={showMobileInsightDrawer} onOpenChange={setShowMobileInsightDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{editingInsight ? 'Edit Insight' : 'Add Insight'}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <InsightForm
              onSave={handleSaveInsight}
              onCancel={() => setShowMobileInsightDrawer(false)}
            />
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
