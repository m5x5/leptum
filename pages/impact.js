import NewSidebar from "../components/Sidebar/new";
import { useState } from "react";
import ImpactCard from "../components/ImpactCard";
import { PlusSmIcon } from "@heroicons/react/outline";
import SummaryChart from "../components/SummaryChart";
import { useEffect } from "react";
import { IMPACT_TYPES } from "../utils";
import ActivitySelector from "../components/ActivitySelector";

const defaultState = {
  impacts: [
    {
      activity: "Started using Leptum",
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
  const activities = state.impacts.map((impact) => impact.activity);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("leptum-impacts");
    if (stored) {
      const newState = JSON.parse(stored);
      if (newState.impacts.length > 0) {
        setState({ ...newState });
      }
    }
  }, [typeof window]);

  useEffect(() => {
    localStorage.setItem("leptum-impacts", JSON.stringify(state));
  }, [JSON.stringify(state)]);

  const onChange = (impact) => (e) => {
    const value = e.target.value;
    const newState = { ...state };

    // Update [impact] property of last object in state.impacts
    if (newState.impacts[newState.impacts.length - 1]) {
      newState.impacts[newState.impacts.length - 1][impact] = value;
    }

    setState(newState);
  };

  const addActivity = () => {
    if (!activityName) return;

    const newState = { ...state };
    newState.impacts.push({
      activity: activityName,
    });
    setState(newState);
    setActivityName("");
  };

  const changeActivityName = (e) => {
    setActivityName(e.target.value);
  };

  const onChangeActivity = (index) => {
    setActivityIndex(index);
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
        <SummaryChart impacts={state.impacts} activities={state.activities} />
        <div className="grid grid-cols-2 flex-grow gap-4 mt-12">
          <input
            type="text"
            className="w-full"
            placeholder="Activity"
            className="p-2 px-3 bg-gray-800 rounded-md"
            onChange={changeActivityName}
            value={activityName}
          />
          <button className="btn btn-primary btn-sm" onClick={addActivity}>
            <PlusSmIcon className="w-6" />
          </button>
          {IMPACT_TYPES.filter((impact) => impact !== "activity").map(
            (impact) => (
              <ImpactCard
                impact={impact}
                impacts={state.impacts}
                activities={activities}
                onChange={onChange(impact)}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
