"use client";

import { useState, useEffect } from "react";
import GoalList from "../../components/Goals/List";
import { useGoals } from "../../utils/useGoals";
import { useGoalTypes } from "../../utils/useGoalTypes";
import { PlusIcon } from "@heroicons/react/solid";
import AddGoalTypeModal from "../../components/Modal/AddGoalTypeModal";
import { Spinner } from "../../components/ui/spinner";
import { Button } from "../../components/ui/button";

export default function GoalsPageContent() {
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
  if (!goals) return <div className="p-8 flex justify-center"><Spinner className="h-6 w-6 text-muted-foreground" /></div>;
  if (isErrorGoalTypes) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goalTypes) return <div className="p-8 flex justify-center"><Spinner className="h-6 w-6 text-muted-foreground" /></div>;

  return (
    <>
      <Button
        size="lg"
        onClick={() => setShowAddGoalTypeModal(true)}
        aria-label="Add goal category"
        className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-[45] shadow-lg"
      >
        <PlusIcon />
        <span>Add</span>
      </Button>

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
      </div>
    </>
  );
}
