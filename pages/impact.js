import { PlusIcon } from "@heroicons/react/solid";
import Head from "next/head";
import { useEffect, useState } from "react";
import ActivitySelector from "../components/ActivitySelector";
import ImpactCard from "../components/ImpactCard";
import SummaryChart from "../components/SummaryChart";
import Modal from "../components/Modal";
import { remoteStorageClient } from "../lib/remoteStorage";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";

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
  console.log("state", state);
  const [activityIndex, setActivityIndex] = useState(0);
  const [editMode, setEditMode] = useState(true);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  // Initialize with all available impact categories from METRIC_CONFIG
  const [selectedLines, setSelectedLines] = useState(() => Object.keys(METRIC_CONFIG));
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [showTimespanSelect, setShowTimespanSelect] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [tempLogData, setTempLogData] = useState({});
  const [touchedFields, setTouchedFields] = useState(new Set());
  const [dateFilter, setDateFilter] = useState("day"); // "day", "week", "month", "year", "all"
  const activities = state.impacts.map((impact) => impact.activity);

  const { goals } = useGoals();
  const { goalTypes } = useGoalTypes();

  useEffect(() => {
    const loadImpacts = async () => {
      try {
        const impacts = await remoteStorageClient.getImpacts();
        console.log("impacts", impacts);
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
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return; // Don't save until data has been loaded from storage
    
    const saveImpacts = async () => {
      try {
        console.log("saving impacts", state.impacts);
        await remoteStorageClient.saveImpacts(state.impacts);
      } catch (error) {
        console.error("Failed to save impacts:", error);
      }
    };

    saveImpacts();
  }, [JSON.stringify(state.impacts), isDataLoaded]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCategorySelect && !event.target.closest('.category-select-container')) {
        setShowCategorySelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategorySelect]);

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
    setShowQuickLogModal(true);
  };

  const saveQuickLog = () => {
    const newState = { ...state };
    // Add a new entry with the logged data
    const now = new Date();
    const defaultActivity = tempLogData.activity ||
      `Now - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    // Only include fields that were actually touched/changed
    const savedData = {};
    touchedFields.forEach(field => {
      if (tempLogData[field] !== undefined) {
        savedData[field] = tempLogData[field];
      }
    });

    const newEntry = {
      activity: defaultActivity,
      date: Date.now(),
      ...savedData
    };
    newState.impacts.push(newEntry);
    setState(newState);
    setActivityIndex(newState.impacts.length - 1);
    setShowQuickLogModal(false);
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

  const deleteActivity = () => {
    const result = confirm("Are you sure you want to delete this activity?");
    if (!result) return;
    const newState = { ...state };
    newState.impacts.splice(activityIndex, 1);
    setState(newState);
    
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


  const updateActivityName = (newName) => {
    const newState = { ...state };
    if (newState.impacts[activityIndex]) {
      newState.impacts[activityIndex].activity = newName;
      setState(newState);
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

  return (
    <>
      <Head>
        <title>Impact - Leptum</title>
      </Head>

      <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Impact</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log your activities and track their impact on your wellbeing
          </p>
        </div>
        <button
          onClick={openQuickLogModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Log</span>
        </button>
      </div>

      {/* Quick Log Modal */}
      <Modal
        isOpen={showQuickLogModal}
        closeModal={() => setShowQuickLogModal(false)}
      >
        <Modal.Title>Quick Log</Modal.Title>
        <Modal.Body>
          <div className="space-y-4 mt-4">
            {/* Activity Name Input */}
            <div>
              <input
                type="text"
                placeholder="What are you doing? (optional)"
                className="text-lg p-3 bg-muted border border-border text-foreground rounded-lg w-full focus:border-primary focus:outline-none"
                value={tempLogData.activity || ""}
                onChange={(e) => updateTempLogData("activity", e.target.value)}
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
              <textarea
                placeholder="How are you feeling? What happened today?"
                className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none min-h-[100px] resize-y"
                value={tempLogData.notes || ""}
                onChange={(e) => updateTempLogData("notes", e.target.value)}
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
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowQuickLogModal(false)}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={saveQuickLog}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
            >
              Save Log
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Date Filter Buttons */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setDateFilter("day")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            dateFilter === "day"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-muted"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setDateFilter("week")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            dateFilter === "week"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-muted"
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setDateFilter("month")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            dateFilter === "month"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-muted"
          }`}
        >
          Month
        </button>
        <button
          onClick={() => setDateFilter("year")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            dateFilter === "year"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-muted"
          }`}
        >
          Year
        </button>
        <button
          onClick={() => setDateFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            dateFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-muted"
          }`}
        >
          All Time
        </button>
      </div>

      {/* Category Multiselect */}
      <div className="mb-4 relative category-select-container">
        <button
          onClick={() => setShowCategorySelect(!showCategorySelect)}
          className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
        >
          <span>Impact Categories ({selectedLines.length})</span>
          <svg
            className={`w-4 h-4 transition-transform ${showCategorySelect ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showCategorySelect && (
          <div className="absolute z-10 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg p-2 max-h-96 overflow-y-auto">
            {Object.keys(METRIC_CONFIG).map((category) => {
              const isSelected = selectedLines.includes(category);
              return (
                <label
                  key={category}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLines([...selectedLines, category]);
                      } else {
                        setSelectedLines(selectedLines.filter((item) => item !== category));
                      }
                    }}
                    className="rounded border-border"
                  />
                  <span className="text-foreground capitalize">{category}</span>
                </label>
              );
            })}
          </div>
        )}
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
                <input
                  type="text"
                  value={state.impacts[activityIndex]?.activity || ""}
                  onChange={(e) => updateActivityName(e.target.value)}
                  className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
                  placeholder="Activity name"
                />
              </div>

              {/* Notes/Diary */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes / Diary Entry
                </label>
                <textarea
                  placeholder="How are you feeling? What happened?"
                  className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none min-h-[100px] resize-y"
                  value={state.impacts[activityIndex]?.notes || ""}
                  onChange={(e) => {
                    const newState = { ...state };
                    if (newState.impacts[activityIndex]) {
                      newState.impacts[activityIndex].notes = e.target.value;
                      setState(newState);
                    }
                  }}
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
      </div>
    </>
  );
}
