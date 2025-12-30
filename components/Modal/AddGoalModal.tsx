import { useState } from "react";
import Modal from ".";
import { Input } from "../ui/input";

interface AddGoalModalProps {
  onAdd: (goalName: string, color: string) => void;
  isOpen: boolean;
  onHide: () => void;
  categoryName?: string;
  initialName?: string;
  initialColor?: string;
  isEdit?: boolean;
}

const COLORS = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Yellow", value: "bg-yellow-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Teal", value: "bg-teal-500" },
  { name: "Cyan", value: "bg-cyan-500" },
];

const AddGoalModal = ({
  onAdd,
  isOpen,
  onHide,
  categoryName,
  initialName = "",
  initialColor = "bg-blue-500",
  isEdit = false,
}: AddGoalModalProps) => {
  const [goalName, setGoalName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  function closeModal() {
    if (!isEdit) {
      setGoalName("");
      setSelectedColor("bg-blue-500");
    }
    onHide();
  }

  function handleSubmit() {
    if (!goalName.trim()) return;
    onAdd(goalName.trim(), selectedColor);
    if (!isEdit) {
      setGoalName("");
      setSelectedColor("bg-blue-500");
    }
    onHide();
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>
        {isEdit ? "Edit Goal" : `Add Goal${categoryName ? ` to ${categoryName}` : ""}`}
      </Modal.Title>
      <Modal.Body>
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Goal Name
            </label>
            <Input
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Learn React, Exercise daily..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-full h-10 rounded-lg ${color.value} hover:opacity-80 transition ${
                    selectedColor === color.value
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
            onClick={closeModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
            onClick={handleSubmit}
          >
            {isEdit ? "Save Changes" : "Add Goal"}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default AddGoalModal;
