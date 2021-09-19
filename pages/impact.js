import NewSidebar from "../components/Sidebar/new";
import { useState } from "react";
import ImpactCard from "../components/ImpactCard";
import { PlusSmIcon } from "@heroicons/react/outline";
import SummaryChart from "../components/SummaryChart";

const defaultState = {
  impacts: [
    {
      activity: "Eat",
      stress: "I was stressed, so it's a 20",
      cleanliness: "I cleaned my room before so, 30",
      motivation: "I was happy, so it's a 20",
      confidence: "I felt confident, so it's a 20",
      happiness: "I was happy, so it's a 20",
      shame: "I was not happy, so it's a 20",
      gratefulness: "I was grateful, so it's a 20",
      energy: "I was happy, so it's a 25",
    },
    {
      activity: "Drink",
      stress: "It was a stressful day, so it's a 80",
      cleanliness: "I cleaned my room after, 40",
      motivation: "I was sad, so it's a 10",
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
