import { useState } from "react";
import NewSidebar from "../components/Sidebar/new";

const defaultStacks = [
  {
    name: "Enter Home",
    habits: [
      {
        name: "Empty Bag",
      },
      {
        name: "Put bottle & laptop on the table",
      },
      {
        name: "Put mobile in my shelf",
      },
    ],
  },
];

export default function StacksPage() {
  const [stacks, setStacks] = useState(defaultStacks);

  return (
    <div className="w-full h-full bg-gray-900 text-white flex">
      <NewSidebar />
      <div className="flex-grow p-4 h-screen overflow-y-auto">
        <h1 className="text-2xl">Stacks</h1>
        {stacks.map((stack) => (
          <div className="pa-4" key={stack.id}>
            <h2 className="text-xl text-white mb-4">{stack.name}</h2>
            {stack.habits.map((habit) => (
              <div className="pa-2" key={habit.id}>
                <h3 className="text-lg text-white mb-4">{habit.name}</h3>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
