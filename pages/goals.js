import { PlusIcon, XIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import NewSidebar from "../components/Sidebar/new";

const defaultGoals = [
  {
    name: "Short Term",
    habits: [
      {
        name: "Eat",
      },
      {
        name: "Do Homework",
      },
      {
        name: "Prepare for class test",
      },
      {
        name: "Improve Leptum",
      },
    ],
  },
  {
    name: "Long Term",
    habits: [
      {
        name: "Write faster",
      },
      {
        name: "Read faster",
      },
    ],
  },
];

export default function GoalsPage() {
  const [stacks, setStacks] = useState(defaultGoals);

  const removeHabit = (stackIndex, habitIndex) => {
    const habit = stacks[stackIndex].habits[habitIndex];
    const newHabits = stacks[stackIndex].habits.filter(
      (habit2) => habit2.name !== habit.name
    );
    stacks[stackIndex].habits = newHabits;
    setStacks([...stacks]);
  };

  const addHabitToStack = (stackIndex) => {
    const habitName = prompt("What habit do you want to add?");
    if (!habitName) return;

    const habit = {
      name: habitName,
    };

    stacks[stackIndex].habits.push(habit);
    setStacks([...stacks]);
  };

  useEffect(() => {
    localStorage.setItem("stacks", JSON.stringify(stacks));
  }, [JSON.stringify(stacks)]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stacks = JSON.parse(localStorage.getItem("stacks"));
    if (stacks) {
      setStacks(stacks);
    }
  }, [typeof window]);

  return (
    <div className="w-full h-full bg-gray-900 text-white flex">
      <NewSidebar />
      <div className="flex-grow p-4 h-screen overflow-y-auto">
        <h1 className="text-2xl mb-5">Goals</h1>
        <div className="grid grid-cols-2 gap-4">
          {stacks.map((stack, stackIndex) => (
            <div
              className="p-4 bg-gray-800 rounded-lg"
              key={(stack.name, stackIndex)}
            >
              <div className="flex flex-row justify-between items-center mb-4">
                <h2 className="text-xl text-white">{stack.name}</h2>
                <PlusIcon
                  className="w-5 cursor-pointer"
                  onClick={() => addHabitToStack(stackIndex)}
                />
              </div>
              <div className="flex flex-col gap-2">
                {stack.habits.map((habit, habitIndex) => (
                  <div
                    className="py-2 px-3 bg-gray-700 flex flex-row items-center justify-between rounded-lg"
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
