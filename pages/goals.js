import { useEffect, useState } from "react";
import EditableList from "../components/EditableList";

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

  useEffect(() => {
    localStorage.setItem("goals", JSON.stringify(stacks));
  }, [JSON.stringify(stacks)]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stacks = JSON.parse(localStorage.getItem("goals"));
    if (stacks) setStacks(stacks);
  }, [typeof window]);

  return (
    <>
      <h1 className="text-2xl mb-5">Goals</h1>
      <div className="grid grid-cols-2 gap-4">
        {stacks.map((stack, stackIndex) => (
          <EditableList
            name={stack.name}
            stored={true}
            key={stack.name + stackIndex}
          />
        ))}
      </div>
    </>
  );
}
