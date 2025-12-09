import { PlusIcon } from "@heroicons/react/solid";
import { useState } from "react";
import { useGoals } from "../../utils/useGoals";
import EditableListItem from "../EditableList/Item";
import AddGoalModal from "../Modal/AddGoalModal";

interface IProps {
  name: string;
  stored: Boolean;
  children?: JSX.Element[] | JSX.Element;
  remove: (name: string) => void;
  id: string;
  items: any[];
}

export default function GoalList({ name = "", children, id, items }: IProps) {
  const { deleteGoal, addGoal, updateGoal } = useGoals();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<{ id: string; name: string; color?: string } | null>(null);

  const handleAddGoal = (goalName: string, color: string): void => {
    addGoal(goalName, id, color);
  };

  const handleEditGoal = (goalId: string, goal: any): void => {
    setEditingGoal({ id: goalId, name: goal.name, color: goal.color });
    setShowEditModal(true);
  };

  const handleSaveEdit = (goalName: string, color: string): void => {
    if (editingGoal) {
      updateGoal(goalName, editingGoal.id, color);
      setEditingGoal(null);
    }
  };

  // Use the filtered items passed via props instead of all goals
  const goalsForThisType = items || [];

  return (
    <>
      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex flex-row justify-between items-center mb-4">
          <h2 className="text-xl text-foreground">{name}</h2>
          <div className="flex-row flex text-muted-foreground gap-1">
            {children}
            <PlusIcon className="w-5 cursor-pointer" onClick={() => setShowAddModal(true)} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {goalsForThisType.map((item) => (
            <EditableListItem
              id={item.id}
              item={item}
              onDelete={deleteGoal}
              onEdit={handleEditGoal as any}
              key={item.id}
            />
          ))}
          {goalsForThisType.length === 0 && <p className="text-muted-foreground">No items.</p>}
        </div>
      </div>

      <AddGoalModal
        isOpen={showAddModal}
        onHide={() => setShowAddModal(false)}
        onAdd={handleAddGoal}
        categoryName={name}
      />

      {editingGoal && (
        <AddGoalModal
          isOpen={showEditModal}
          onHide={() => {
            setShowEditModal(false);
            setEditingGoal(null);
          }}
          onAdd={handleSaveEdit}
          categoryName={name}
          initialName={editingGoal.name}
          initialColor={editingGoal.color || "bg-blue-500"}
          isEdit={true}
        />
      )}
    </>
  );
}
