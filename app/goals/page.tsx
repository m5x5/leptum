"use client";

import { useState, useEffect } from "react";
import GoalList from "../../components/Goals/List";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { PlusIcon } from "@heroicons/react/solid";
import AddGoalTypeModal from "../../components/Modal/AddGoalTypeModal";

export default function GoalsPage() {
  const { goals, isError } = useGoals();
  const { goalTypes, isError: isErrorGoalTypes, addGoalType } = useGoalTypes();
  const [showAddGoalTypeModal, setShowAddGoalTypeModal] = useState(false);

  const handleRemove = (_name: string) => {};

  const handleAddGoalType = (name: string, description?: string) => {
    addGoalType(name, description || "");
  };

  useEffect(() => {
    const handleOpenAddGoalCategory = () => {
      setShowAddGoalTypeModal(true);
    };
    window.addEventListener("openAddGoalCategory", handleOpenAddGoalCategory);
    return () => {
      window.removeEventListener("openAddGoalCategory", handleOpenAddGoalCategory);
    };
  }, []);

  if (isError) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goals) return <div>loading...</div>;
  if (isErrorGoalTypes) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goalTypes) return <div>loading...</div>;

  return (
    <div className="max-w-7xl mx-auto pt-4 pb-32 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your objectives and organize them by category
        </p>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAddGoalTypeModal(true)}
          className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Goal Category</span>
        </button>
      </div>

      <AddGoalTypeModal
        isOpen={showAddGoalTypeModal}
        onHide={() => setShowAddGoalTypeModal(false)}
        onAdd={handleAddGoalType}
      />

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
            No goal categories yet. Click &quot;Add Goal Category&quot; to create one.
          </div>
        )}
      </div>
    </div>
  );
}
