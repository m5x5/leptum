import NewSidebar from "../components/Sidebar/new";
import { useState } from "react";
import ImpactCard from "../components/ImpactCard";
import SummaryChart from "../components/SummaryChart";
import { useEffect } from "react";
import ActivitySelector from "../components/ActivitySelector";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/solid";
import LineControls from "../components/LineControls";

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
  const [activityName, setActivityName] = useState("");
  const [activityIndex, setActivityIndex] = useState(0);
  const [editMode, setEditMode] = useState(true);
  const [selectedLines, setSelectedLines] = useState([]);
  const activities = state.impacts.map((impact) => impact.activity);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("leptum-impacts");
    const editMode = !!localStorage.getItem("leptum-impacts-edit-mode");
    const selected = localStorage.getItem("leptum-impacts-selected");
    if (stored) {
      const newState = JSON.parse(stored);
      if (newState.impacts.length > 0) {
        setState({ ...newState });
        setActivityIndex(newState.impacts.length - 1);
      }
    }
    if (selected) {
      setSelectedLines(JSON.parse(selected));
    }
    setEditMode(editMode);
  }, [typeof window]);

  useEffect(() => {
    localStorage.setItem("leptum-impacts", JSON.stringify(state));
  }, [JSON.stringify(state)]);

  const onChange = (impact) => (e) => {
    const value = e.target.value;
    const newState = { ...state };

    // Update [impact] property of last object in state.impacts
    if (newState.impacts[activityIndex]) {
      newState.impacts[activityIndex][impact] = value;
    }

    setState(newState);
  };

  const addActivity = () => {
    if (!activityName) return;

    const newState = { ...state };
    // insert after activityIndex
    newState.impacts.splice(activityIndex + 1, 0, { activity: activityName });
    setState(newState);
    setActivityName("");
  };

  const changeActivityName = (e) => {
    setActivityName(e.target.value);
  };

  const onChangeActivity = (index) => {
    setActivityIndex(index);
  };

  const toggleEditMode = () => {
    localStorage.setItem("leptum-impacts-edit-mode", editMode);
    setEditMode(!editMode);
  };

  const deleteActivity = () => {
    const result = confirm("Are you sure you want to delete this activity?");
    if (!result) return;
    const newState = { ...state };
    newState.impacts.splice(activityIndex, 1);
    setState(newState);
    setActivityIndex(activityIndex - 1);
  };

  const selectLines = (selected) => {
    localStorage.setItem("leptum-impacts-selected", JSON.stringify(selected));
    setSelectedLines([...selected]);
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white flex">
      <NewSidebar />
      <div className="flex-grow p-4 h-screen overflow-y-auto">
        <ActivitySelector
          impacts={state.impacts}
          index={activityIndex}
          onChange={onChangeActivity}
        />
        <LineControls selected={selectedLines} onChange={selectLines} />
        <SummaryChart
          impacts={state.impacts}
          activities={state.activities}
          selectedLines={selectedLines}
        />
        <div className="grid grid-cols-2 flex-grow gap-4 mt-12">
          <input
            type="text"
            className="w-full"
            placeholder="Activity"
            className="p-2 px-3 bg-gray-800 rounded-md"
            onChange={changeActivityName}
            value={activityName}
          />
          <div className="flex flex-row justify-between items-center text-gray-400">
            <button className="btn btn-primary btn-sm" onClick={addActivity}>
              <PlusIcon className="w-5" />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={toggleEditMode}
            >
              <PencilIcon className="w-5" />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={deleteActivity}
            >
              <TrashIcon className="w-5" />
            </button>
          </div>
          {selectedLines
            .filter((impact) => impact !== "activity")
            .map((impact) => (
              <ImpactCard
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
    </div>
  );
}
