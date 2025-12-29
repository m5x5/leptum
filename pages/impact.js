import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/solid";
import Head from "next/head";
import { useEffect, useState } from "react";
import ActivitySelector from "../components/ActivitySelector";
import ImpactCard from "../components/ImpactCard";
import LineControls from "../components/LineControls";
import SummaryChart from "../components/SummaryChart";
import Modal from "../components/Modal";
import { remoteStorageClient } from "../lib/remoteStorage";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";

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
  const [activityName, setActivityName] = useState("");
  const [activityIndex, setActivityIndex] = useState(0);
  const [editMode, setEditMode] = useState(true);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [selectedLines, setSelectedLines] = useState(["stress", "cleanliness", "motivation", "energy"]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [tempLogData, setTempLogData] = useState({});
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

  const addActivity = () => {
    if (!activityName) return;

    const newState = { ...state };
    // insert after activityIndex
    newState.impacts.splice(activityIndex + 1, 0, { activity: activityName, date: Date.now() });
    setState(newState);
    setActivityName("");
  };

  const openQuickLogModal = () => {
    // Initialize temp data with default values
    setTempLogData({
      activity: "",
      ...selectedLines.reduce((acc, line) => {
        if (line !== "activity") acc[line] = 50;
        return acc;
      }, {})
    });
    setShowQuickLogModal(true);
  };

  const saveQuickLog = () => {
    const newState = { ...state };
    // Add a new entry with the logged data
    const now = new Date();
    const defaultActivity = tempLogData.activity ||
      `Now - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    const newEntry = {
      activity: defaultActivity,
      date: Date.now(),
      ...tempLogData
    };
    newState.impacts.push(newEntry);
    setState(newState);
    setActivityIndex(newState.impacts.length - 1);
    setShowQuickLogModal(false);
    setTempLogData({});
  };

  const updateTempLogData = (field, value) => {
    setTempLogData({
      ...tempLogData,
      [field]: value
    });
  };

  const changeActivityName = (e) => {
    setActivityName(e.target.value);
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

  const selectLines = (selected) => {
    // Selected lines setting can be stored locally or in RemoteStorage if needed
    setSelectedLines([...selected]);
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

            {/* Emotion Sliders */}
            {selectedLines
              .filter((impact) => impact !== "activity")
              .map((impact) => (
                <div key={impact}>
                  <label className="block text-sm font-medium text-foreground mb-2 capitalize">
                    {impact}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tempLogData[impact] || 50}
                      onChange={(e) => updateTempLogData(impact, e.target.value)}
                      className="flex-grow h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempLogData[impact] || ""}
                      onChange={(e) => updateTempLogData(impact, e.target.value)}
                      className="w-16 p-2 bg-background text-foreground text-center rounded border border-border"
                      placeholder="50"
                    />
                  </div>
                </div>
              ))}
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

      {/* Main Content */}
      <ActivitySelector
        impacts={state.impacts}
        index={activityIndex}
        onChange={onChangeActivity}
      />

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

      <LineControls selected={selectedLines} onChange={selectLines} />
      <SummaryChart
        impacts={filteredImpacts}
        activities={state.activities}
        selectedLines={selectedLines}
      />
      <div className="grid grid-cols-2 flex-grow gap-4 mt-12">
        <input
          type="text"
          placeholder="Activity"
          className="p-2 px-3 bg-card border border-border text-foreground rounded-md w-full"
          onChange={changeActivityName}
          value={activityName}
        />
        <div className="flex flex-row justify-between items-center text-muted-foreground">
          <button className="btn btn-primary btn-sm" onClick={addActivity}>
            <PlusIcon className="w-5" />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={toggleEditMode}>
            <PencilIcon className="w-5" />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={deleteActivity}>
            <TrashIcon className="w-5" />
          </button>
        </div>
        {selectedLines
          .filter((impact) => impact !== "activity")
          .map((impact) => (
            <ImpactCard
              key={impact}
              impact={impact}
              impacts={state.impacts}
              activities={activities}
              activityIndex={activityIndex}
              onChange={onChange(impact)}
              editMode={editMode}
            />
          ))}
      </div>
      </div>
    </>
  );
}
