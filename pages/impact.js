import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/solid";
import Head from "next/head";
import { useEffect, useState } from "react";
import ActivitySelector from "../components/ActivitySelector";
import ImpactCard from "../components/ImpactCard";
import LineControls from "../components/LineControls";
import SummaryChart from "../components/SummaryChart";
import { remoteStorageClient } from "../lib/remoteStorage";

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
    const loadImpacts = async () => {
      try {
        const impacts = await remoteStorageClient.getImpacts();
        console.log("impacts", impacts);
        if (impacts.length > 0) {
          setState({ impacts });
          setActivityIndex(impacts.length - 1);
        }
      } catch (error) {
        console.error("Failed to load impacts:", error);
      }
    };

    loadImpacts();
  }, []);

  useEffect(() => {
    const saveImpacts = async () => {
      try {
        await remoteStorageClient.saveImpacts(state.impacts);
      } catch (error) {
        console.error("Failed to save impacts:", error);
      }
    };

    saveImpacts();
  }, [JSON.stringify(state.impacts)]);

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
    // Edit mode setting can be stored locally or in RemoteStorage if needed
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
    // Selected lines setting can be stored locally or in RemoteStorage if needed
    setSelectedLines([...selected]);
  };

  return (
    <>
      <Head>
        <title>Impact - Leptum</title>
      </Head>
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
          placeholder="Activity"
          className="p-2 px-3 bg-gray-800 rounded-md w-full"
          onChange={changeActivityName}
          value={activityName}
        />
        <div className="flex flex-row justify-between items-center text-gray-400">
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
              impact={impact}
              impacts={state.impacts}
              activities={activities}
              activityIndex={activityIndex}
              onChange={onChange(impact)}
              editMode={editMode}
            />
          ))}
      </div>
    </>
  );
}
