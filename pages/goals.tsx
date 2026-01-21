import Head from "next/head";
import { useState } from "react";
import GoalList from "../components/Goals/List";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import { PlusIcon } from "@heroicons/react/solid";

export default function GoalsPage() {
  const { goals, isError } = useGoals();
  const { goalTypes, isError: isErrorGoalTypes, addGoalType } = useGoalTypes();

  const handleRemove = (name: string) => {};

  const handleAddGoalType = () => {
    const name = prompt("What is the name of the goal category?");
    if (!name) return;

    const description = prompt("Optional: Add a description for this category") || "";
    addGoalType(name, description);
  };

  if (isError) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goals) return <div>loading...</div>;
  if (isErrorGoalTypes) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goalTypes) return <div>loading...</div>;

  return (
    <>
      <Head>
        <title>Goals - Leptum</title>
      </Head>
      <div className="max-w-7xl mx-auto pb-32 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your objectives and organize them by category
        </p>
      </div>

      <div className="mb-4 flex justify-end">
        {/* Desktop Add Goal Category Button */}
        <button
          onClick={handleAddGoalType}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Goal Category</span>
        </button>
        {/* Mobile Add Goal Category Button */}
        <button
          onClick={handleAddGoalType}
          className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Goal Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goalTypes.map((goalType) => (
          <GoalList
            name={goalType.name}
            stored={true}
            key={goalType.id}
            id={goalType.id}
            remove={handleRemove}
            items={goals.filter((goal) => goal.type === goalType.id)}
          />
        ))}
        {goalTypes.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-8 text-muted-foreground">
            No goal categories yet. Click "Add Goal Category" to create one.
          </div>
        )}
      </div>
      </div>
    </>
  );
}
