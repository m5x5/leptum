import { XIcon } from "@heroicons/react/solid";
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

  const removeHabit = (stackIndex, habitIndex) => {
    const habit = stacks[stackIndex].habits[habitIndex];
    const newHabits = stacks[stackIndex].habits.filter(
      (habit2) => habit2.name !== habit.name
    );
    stacks[stackIndex].habits = newHabits;
    setStacks([...stacks]);
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white flex">
      <NewSidebar />
      <div className="flex-grow p-4 h-screen overflow-y-auto">
        <h1 className="text-2xl mb-5">Stacks</h1>
        <div className="grid grid-cols-2 gap-4">
          {stacks.map((stack, stackIndex) => (
            <div
              className="p-4 bg-gray-800 rounded-lg"
              key={(stack.name, stackIndex)}
            >
              <h2 className="text-xl text-white mb-4">{stack.name}</h2>
              <div className="flex flex-col gap-2">
                {stack.habits.map((habit, habitIndex) => (
                  <div
                    className="p-2 bg-gray-700 flex flex-row items-center justify-between"
                    key={habit.name + habitIndex}
                  >
                    <h3 className="text-lg text-gray-300">{habit.name}</h3>
                    <XIcon
                      className="w-4 text-gray-400 cursor-pointer"
                      onClick={() => removeHabit(stackIndex, habitIndex)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
