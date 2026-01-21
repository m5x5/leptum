import { useState, useEffect } from "react";
import Modal from ".";
import { Input } from "../ui/input";
import { RichTextEditor } from "../ui/rich-text-editor";
import { dateToInputValue, inputValueToTimestamp } from "../../utils/deadlineUtils";
import { GoalMilestone } from "../../utils/useGoals";

interface AddGoalModalProps {
  onAdd: (goalName: string, color: string, options?: {
    description?: string;
    targetDate?: number;
    milestones?: Omit<GoalMilestone, 'id'>[];
  }) => void;
  isOpen: boolean;
  onHide: () => void;
  categoryName?: string;
  initialName?: string;
  initialColor?: string;
  initialDescription?: string;
  initialTargetDate?: number;
  initialMilestones?: Array<{ name: string; order: number; daysOffset?: number }>;
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
  initialDescription = "",
  initialTargetDate,
  initialMilestones = [],
  isEdit = false,
}: AddGoalModalProps) => {
  const [goalName, setGoalName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [description, setDescription] = useState(initialDescription);
  const [targetDate, setTargetDate] = useState(dateToInputValue(initialTargetDate));
  const [milestones, setMilestones] = useState<Array<{ name: string; order: number; targetDate?: number }>>(
    initialMilestones.map((m, idx) => {
      const baseDate = initialTargetDate || Date.now();
      const targetDate = m.daysOffset ? baseDate + (m.daysOffset * 24 * 60 * 60 * 1000) : undefined;
      return {
        name: m.name,
        order: m.order ?? idx,
        targetDate
      };
    })
  );
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [showMilestones, setShowMilestones] = useState(initialMilestones.length > 0);

  // Update state when initial values change (for edit mode)
  // Note: We only update when the modal opens (isOpen changes to true) to avoid constant rerenders
  useEffect(() => {
    if (!isOpen) return;

    setGoalName(initialName);
    setSelectedColor(initialColor);
    setDescription(initialDescription);
    setTargetDate(dateToInputValue(initialTargetDate));

    const milestonesData = initialMilestones.map((m, idx) => {
      const baseDate = initialTargetDate || Date.now();
      const targetDate = m.daysOffset ? baseDate + (m.daysOffset * 24 * 60 * 60 * 1000) : undefined;
      return {
        name: m.name,
        order: m.order ?? idx,
        targetDate
      };
    });
    setMilestones(milestonesData);
    setShowMilestones(initialMilestones.length > 0);
  }, [isOpen]); // Only run when modal opens

  function resetForm() {
    setGoalName("");
    setSelectedColor("bg-blue-500");
    setDescription("");
    setTargetDate("");
    setMilestones([]);
    setNewMilestoneName("");
    setShowMilestones(false);
  }

  function closeModal() {
    if (!isEdit) {
      resetForm();
    }
    onHide();
  }

  function handleSubmit() {
    if (!goalName.trim()) return;

    const options: { description?: string; targetDate?: number; milestones?: Omit<GoalMilestone, 'id'>[] } = {};
    if (description.trim()) {
      options.description = description.trim();
    }
    if (targetDate) {
      options.targetDate = inputValueToTimestamp(targetDate);
    }
    if (milestones.length > 0) {
      options.milestones = milestones.map((m) => ({
        name: m.name,
        order: m.order,
        targetDate: m.targetDate,
        completed: false
      }));
    }

    onAdd(goalName.trim(), selectedColor, Object.keys(options).length > 0 ? options : undefined);

    if (!isEdit) {
      resetForm();
    }
    onHide();
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      handleSubmit();
    }
  };

  const addMilestone = () => {
    if (!newMilestoneName.trim()) return;
    setMilestones(prev => [...prev, {
      name: newMilestoneName.trim(),
      order: prev.length,
      targetDate: undefined
    }]);
    setNewMilestoneName("");
  };

  const removeMilestone = (index: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i })));
  };

  const handleMilestoneKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMilestone();
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
            <label className="block text-sm font-medium text-foreground mb-2">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Describe your goal and what success looks like..."
              minHeight="120px"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Target Date <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set a deadline to track progress and receive reminders
            </p>
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

          {/* Milestones Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Milestones <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              {!showMilestones && (
                <button
                  type="button"
                  onClick={() => setShowMilestones(true)}
                  className="text-xs text-primary hover:underline"
                >
                  + Add milestones
                </button>
              )}
            </div>

            {showMilestones && (
              <div className="space-y-2">
                {milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                    <span className="flex-1 text-sm">{milestone.name}</span>
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-muted-foreground hover:text-destructive transition"
                      title="Remove milestone"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newMilestoneName}
                    onChange={(e) => setNewMilestoneName(e.target.value)}
                    onKeyPress={handleMilestoneKeyPress}
                    placeholder="Add a milestone..."
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>

                {milestones.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Break down your goal into smaller, achievable steps
                  </p>
                )}
              </div>
            )}
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
