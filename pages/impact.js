import NewSidebar from "../components/Sidebar/new";
import { useState } from "react";
import ImpactCard from "../components/ImpactCard";
import { PlusSmIcon } from "@heroicons/react/outline";
import SummaryChart from "../components/SummaryChart";

const defaultState = {
  impacts: [
    {
      activity: "Morning",
      stress: "20",
      motivation: "40",
      fulfillment: "25",
      clean: "55",
    },
    {
      activity: "Evening",
      stress: "15",
      cleanliness: "25",
      shame: "0",
      guilt: "10",
      stress: "0",
    },
    {
      activity: "Afternoon",
      stress: "20",
      cleanliness: "25",
      shame: "0",
      guilt: "5",
      motivation: "30",
    },
  ],
};

export default function ImpactPage() {
  const [state] = useState(defaultState);
  const impacts = Object.keys(state.impacts[0]);
  const activities = state.impacts.map((impact) => impact.activity);

  return (
    <div className="w-full h-full bg-gray-900 text-white flex">
      <NewSidebar />
      <div className="flex-grow p-4 h-screen overflow-y-auto">
        <p className="text-4xl">Add Activity </p>
        <SummaryChart impacts={state.impacts} activities={state.activities} />
        <div className="grid grid-cols-2 flex-grow gap-4 mt-12">
          <input
            type="text"
            className="w-full"
            placeholder="Activity"
            className="p-2 px-3 bg-gray-800 rounded-md"
          />
          <button className="btn btn-primary btn-sm" onClick={() => {}}>
            <PlusSmIcon className="w-6" />
          </button>
          {impacts.map((impact) => (
            <ImpactCard
              impact={impact}
              impacts={state.impacts}
              activities={activities}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
