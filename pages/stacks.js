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
      {
        name: "Set Goals for the time at home",
      },
    ],
  },
  {
    name: "Eat Dinner",
    habits: [
      {
        name: "Clean Dishes",
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
        <h1 className="text-2xl mb-5">Stacks</h1>
        <div className="grid grid-cols-2 gap-4">
          {stacks.map((stack, index) => (
            <div
              className="p-4 bg-gray-800 rounded-lg"
              key={(stack.name, index)}
            >
              <h2 className="text-xl text-white mb-4">{stack.name}</h2>
              {stack.habits.map((habit, index) => (
                <div className="p-2 bg-gray-700" key={habit.name + index}>
                  <h3 className="text-lg text-gray-300 mb-4">{habit.name}</h3>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
