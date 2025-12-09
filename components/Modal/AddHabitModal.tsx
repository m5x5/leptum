import { useState } from "react";
import Modal from ".";

interface AddHabitModalProps {
  onAdd: (habitName: string) => void;
  isOpen: boolean;
  onHide: () => void;
  stackName?: string;
}

const AddHabitModal = ({ onAdd, isOpen, onHide, stackName }: AddHabitModalProps) => {
  const [habitName, setHabitName] = useState("");

  function closeModal() {
    setHabitName("");
    onHide();
  }

  function addHabit() {
    if (!habitName.trim()) return;
    onAdd(habitName.trim());
    setHabitName("");
    onHide();
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addHabit();
    }
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>Add Habit{stackName ? ` to ${stackName}` : ''}</Modal.Title>
      <Modal.Body>
        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Habit Name
          </label>
          <input
            type="text"
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Make bed, Drink water, Exercise..."
            className="w-full p-3 bg-muted border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
            autoFocus
          />
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
            onClick={addHabit}
          >
            Add Habit
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default AddHabitModal;
