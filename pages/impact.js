import NewSidebar from "../components/Sidebar/new";
import { useState } from "react";
import ImpactCard from "../components/ImpactCard";
import { AddIcon, PlusSmIcon } from '@heroicons/react/outline';

const defaultState = {
  activities: ["Eat", "Drink"],
  impacts: {
    stress: [
      "I was stressed, so it's a 20"
      ,
      "It was a stressful day, so it's a 80"
    ],
    cleanliness: [
      "I cleaned my room before so, 30",
      "I cleaned my room after, 40"
    ],
    motivation: [
      "I was happy, so it's a 20",
      "I was sad, so it's a 10"
    ],
    confidence: [
      "I felt confident, so it's a 20",
    ],
    happiness: [
      "I was happy, so it's a 20",
    ],
    shame: [
      "I was not happy, so it's a 20",
    ],
    gratefulness: [
      "I was grateful, so it's a 20",
    ],
    energy: [
      "I was happy, so it's a 25",
    ],
  }
};

export default function ImpactPage() {
  const [state] = useState(defaultState);
  const impacts = Object.keys(state.impacts);

  return (
    <div className="w-full h-full bg-gray-900 text-white flex">
      <NewSidebar />
      <div className="flex-grow p-4">
        <p className="text-4xl">Add Activity </p>
        <div className="grid grid-cols-2 flex-grow gap-4 mt-12">
          <input type="text" className="w-full" placeholder="Activity" className="p-2 px-3 bg-gray-800 rounded-md" />
          <button className="btn btn-primary btn-sm" onClick={() => { }}>
            <PlusSmIcon className="w-6" />
          </button>
          {impacts.map(impact => (
            <ImpactCard title={impact} data={state.impacts[impact]} labels={state.activities} />
          ))}
        </div>
      </div>
    </div>
  );
};