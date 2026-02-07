"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import EditableList from "../../components/EditableList";
import ConfirmDeleteModal from "../../components/Modal/Confirm/ConfirmDeleteModal";
import CreateStackModal from "../../components/Modal/CreateStackModal";
import AddHabitModal from "../../components/Modal/AddHabitModal";
import { remoteStorageClient } from "../../lib/remoteStorage";

const defaultStacks = [
  { name: "Morning Routine", habits: [] as { id: string; name: string }[] },
  { name: "Evening Routine", habits: [] as { id: string; name: string }[] },
];

export default function StacksPageContent() {
  const [stacks, setStacks] = useState(defaultStacks);
  const [showCreateStackModal, setShowCreateStackModal] = useState(false);
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStack, setSelectedStack] = useState<number | null>(null);
  const [selectedStackForHabit, setSelectedStackForHabit] = useState<number | null>(null);

  useEffect(() => {
    const loadStacks = async () => {
      try {
        const loadedStacks = await remoteStorageClient.getStacks();
        if (loadedStacks.length > 0) {
          setStacks(loadedStacks as typeof defaultStacks);
        }
      } catch (error) {
        console.error("Failed to load stacks:", error);
      }
    };

    loadStacks();
  }, []);

  useEffect(() => {
    const saveStacks = async () => {
      try {
        for (let i = 0; i < stacks.length; i++) {
          await remoteStorageClient.saveStack(stacks[i], i);
        }
      } catch (error) {
        console.error("Failed to save stacks:", error);
      }
    };

    if (stacks.length > 0) {
      saveStacks();
    }
  }, [stacks]);

  const createStack = (name: string) => {
    setStacks([...stacks, { name, habits: [] }]);
  };

  const deleteStack = async () => {
    if (selectedStack === null) return;
    try {
      await remoteStorageClient.deleteStack(selectedStack);
      const newStacks = [...stacks];
      newStacks.splice(selectedStack, 1);
      setStacks(newStacks);
      setShowDeleteModal(false);
      setSelectedStack(null);
    } catch (error) {
      console.error("Failed to delete stack:", error);
    }
  };

  const openDeleteModal = (index: number) => {
    setSelectedStack(index);
    setShowDeleteModal(true);
  };

  const openAddHabitModal = (stackIndex: number) => {
    setSelectedStackForHabit(stackIndex);
    setShowAddHabitModal(true);
  };

  const addHabit = (habitName: string) => {
    if (selectedStackForHabit === null) return;

    const newStacks = [...stacks];
    const habit = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: habitName,
    };

    if (!newStacks[selectedStackForHabit].habits) {
      newStacks[selectedStackForHabit].habits = [];
    }

    newStacks[selectedStackForHabit].habits.push(habit);
    setStacks(newStacks);
  };

  const removeHabit = (stackIndex: number, habitId: string) => {
    const newStacks = [...stacks];
    if (newStacks[stackIndex].habits) {
      newStacks[stackIndex].habits = newStacks[stackIndex].habits.filter(
        (habit) => habit.id !== habitId
      );
      setStacks(newStacks);
    }
  };

  return (
    <>
      <div className="flex flex-row w-full justify-end mb-6">
        <button
          onClick={() => setShowCreateStackModal(true)}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Stack</span>
        </button>
      </div>

      <button
        onClick={() => setShowCreateStackModal(true)}
        className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition cursor-pointer"
      >
        <PlusIcon className="w-5 h-5" />
        <span>Create Stack</span>
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stacks.map((stack, stackIndex) => (
          <EditableList
            name={stack.name}
            key={stack.name + stackIndex}
            items={stack.habits || []}
            onAddItem={() => openAddHabitModal(stackIndex)}
            onRemoveItem={(habitId) => removeHabit(stackIndex, habitId)}
          >
            <TrashIcon
              className="cursor-pointer h-5 w-5 hover:text-destructive"
              onClick={() => openDeleteModal(stackIndex)}
            />
          </EditableList>
        ))}
      </div>

      {stacks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No stacks yet. Create your first habit stack!</p>
          <button
            onClick={() => setShowCreateStackModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Create Stack
          </button>
        </div>
      )}

      <CreateStackModal
        onCreate={createStack}
        isOpen={showCreateStackModal}
        onHide={() => setShowCreateStackModal(false)}
      />

      <AddHabitModal
        onAdd={addHabit}
        isOpen={showAddHabitModal}
        onHide={() => setShowAddHabitModal(false)}
        stackName={selectedStackForHabit !== null ? stacks[selectedStackForHabit]?.name : ""}
      />

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setSelectedStack(null);
        }}
        onConfirm={deleteStack}
        title="Delete Stack"
        description="Are you sure you want to delete this stack? All habits in this stack will be deleted."
      />
    </>
  );
}
