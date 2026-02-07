import { useState, useEffect, useRef } from "react";
import Modal from ".";
import { Input } from "../ui/input";
import { RichTextEditor } from "../ui/rich-text-editor";
import { dateToInputValue, inputValueToTimestamp } from "../../utils/deadlineUtils";
import { GoalMilestone } from "../../utils/useGoals";
import { GOAL_TEMPLATES_WITH_TRACKING, GoalTemplateWithTracking } from "../../utils/goalTemplatesWithTracking";
import { GOAL_TEMPLATES, GoalTemplate } from "../../utils/goalTemplates";

interface AddGoalModalProps {
  onAdd: (goalName: string, color: string, options?: {
    description?: string;
    targetDate?: number;
    milestones?: Omit<GoalMilestone, 'id'>[];
    templateId?: string; // ID of the template used (for creating routines)
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

type ModalStep = 'choice' | 'select-template' | 'create-custom';

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
  // Determine initial step: skip choice if editing, or if initialName is already set (from template)
  const allTemplates = [...GOAL_TEMPLATES_WITH_TRACKING, ...GOAL_TEMPLATES];
  const shouldShowChoice = !isEdit && !initialName && allTemplates.length > 0;
  const [step, setStep] = useState<ModalStep>(shouldShowChoice ? 'choice' : 'create-custom');
  const [goalName, setGoalName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [description, setDescription] = useState(initialDescription);
  const [targetDate, setTargetDate] = useState(dateToInputValue(initialTargetDate));
  const baseDateRef = useRef(0);
  const [milestones, setMilestones] = useState<Array<{ name: string; order: number; targetDate?: number }>>(
    initialMilestones.map((m, idx) => {
      const baseDate = initialTargetDate ?? 0;
      const targetDate = m.daysOffset ? baseDate + (m.daysOffset * 24 * 60 * 60 * 1000) : undefined;
      return {
        name: m.name,
        order: m.order ?? idx,
        targetDate
      };
    })
  );
  useEffect(() => {
    if (baseDateRef.current === 0) {
      baseDateRef.current = Date.now();
      if (!initialTargetDate && initialMilestones.length > 0) {
        queueMicrotask(() => {
          setMilestones(initialMilestones.map((m, idx) => {
            const baseDate = baseDateRef.current;
            const targetDate = m.daysOffset ? baseDate + (m.daysOffset * 24 * 60 * 60 * 1000) : undefined;
            return { name: m.name, order: m.order ?? idx, targetDate };
          }));
        });
      }
    }
  }, [initialTargetDate, initialMilestones]);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [showMilestones, setShowMilestones] = useState(initialMilestones.length > 0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  // Update state when initial values change (for edit mode)
  // Note: We only update when the modal opens (isOpen changes to true) to avoid constant rerenders
  useEffect(() => {
    if (!isOpen) {
      // Reset step when modal closes
      const shouldShowChoice = !isEdit && !initialName && allTemplates.length > 0;
      queueMicrotask(() => setStep(shouldShowChoice ? 'choice' : 'create-custom'));
      return;
    }

    queueMicrotask(() => {
      setGoalName(initialName);
      setSelectedColor(initialColor);
      setDescription(initialDescription);
      setTargetDate(dateToInputValue(initialTargetDate));
    });

    if (baseDateRef.current === 0) baseDateRef.current = Date.now();
    const baseDate = initialTargetDate ?? baseDateRef.current;
    const milestonesData = initialMilestones.map((m, idx) => {
      const targetDate = m.daysOffset ? baseDate + (m.daysOffset * 24 * 60 * 60 * 1000) : undefined;
      return {
        name: m.name,
        order: m.order ?? idx,
        targetDate
      };
    });
    queueMicrotask(() => {
      setMilestones(milestonesData);
      setShowMilestones(initialMilestones.length > 0);
      if (initialName) {
        const matchingTemplate = GOAL_TEMPLATES_WITH_TRACKING.find(t => t.name === initialName);
        setSelectedTemplateId(matchingTemplate ? matchingTemplate.id : undefined);
      } else {
        setSelectedTemplateId(undefined);
      }
    });

    // Reset step when modal opens
    const shouldShowChoiceOnOpen = !isEdit && !initialName && allTemplates.length > 0;
    queueMicrotask(() => setStep(shouldShowChoiceOnOpen ? 'choice' : 'create-custom'));
  }, [isOpen, isEdit, initialName, allTemplates.length, initialColor, initialDescription, initialMilestones, initialTargetDate]);

  function resetForm() {
    setGoalName("");
    setSelectedColor("bg-blue-500");
    setDescription("");
    setTargetDate("");
    setMilestones([]);
    setNewMilestoneName("");
    setShowMilestones(false);
    setSelectedTemplateId(undefined);
    const shouldShowChoice = !isEdit && allTemplates.length > 0;
    setStep(shouldShowChoice ? 'choice' : 'create-custom');
  }

  function closeModal() {
    if (!isEdit) {
      resetForm();
    }
    onHide();
  }

  function handleSelectTemplate(template: GoalTemplateWithTracking | GoalTemplate) {
    // Pre-fill form with selected template's data
    setGoalName(template.name);
    setSelectedColor(template.color || "bg-blue-500");
    setDescription(template.description || "");
    
    // Store template ID if it's a template with tracking (has routine configs)
    if ('trackingConfig' in template) {
      setSelectedTemplateId(template.id);
    } else {
      setSelectedTemplateId(undefined);
    }
    
    // Convert milestones if they exist
    if (template.milestones && template.milestones.length > 0) {
      const baseDate = baseDateRef.current || 0;
      const milestonesData = template.milestones.map((m) => {
        const targetDate = m.daysOffset 
          ? baseDate + (m.daysOffset * 24 * 60 * 60 * 1000)
          : undefined;
        return {
          name: m.name,
          order: m.order,
          targetDate
        };
      });
      setMilestones(milestonesData);
      setShowMilestones(true);
    } else {
      setMilestones([]);
      setShowMilestones(false);
    }
    
    setStep('create-custom');
  }

  function handleSubmit() {
    if (!goalName.trim()) return;

    const options: { description?: string; targetDate?: number; milestones?: Omit<GoalMilestone, 'id'>[]; templateId?: string } = {};
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
    if (selectedTemplateId) {
      options.templateId = selectedTemplateId;
    }

    onAdd(goalName.trim(), selectedColor, Object.keys(options).length > 0 ? options : undefined);

    if (!isEdit) {
      resetForm();
      setSelectedTemplateId(undefined);
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

  // Render choice screen
  if (step === 'choice') {
    return (
      <Modal isOpen={isOpen} closeModal={closeModal}>
        <Modal.Title>
          Add Goal{categoryName ? ` to ${categoryName}` : ""}
        </Modal.Title>
        <Modal.Body>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Would you like to select a predefined goal template or create a custom one?
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setStep('select-template')}
                className="px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition text-left"
              >
                <div className="font-medium">Select Predefined Template</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Choose from templates like Hydration, Nutrition, and more
                </div>
              </button>
              <button
                type="button"
                onClick={() => setStep('create-custom')}
                className="px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition text-left"
              >
                <div className="font-medium">Create Custom Goal</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Create a new goal with your own details
                </div>
              </button>
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
          </div>
        </Modal.Footer>
      </Modal>
    );
  }

  // Render template selection screen
  if (step === 'select-template') {
    return (
      <Modal isOpen={isOpen} closeModal={closeModal}>
        <Modal.Title>
          Select Goal Template
        </Modal.Title>
        <Modal.Body>
          <div className="space-y-4 mt-4">
            {allTemplates.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition text-left flex items-center gap-3"
                  >
                    <div className="text-2xl flex-shrink-0">{template.icon}</div>
                    {template.color && (
                      <div className={`w-4 h-4 rounded-full ${template.color} flex-shrink-0`} />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No templates found. Create a custom goal instead.
              </p>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
              onClick={() => setStep('choice')}
            >
              Back
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
              onClick={closeModal}
            >
              Cancel
            </button>
          </div>
        </Modal.Footer>
      </Modal>
    );
  }

  // Render create custom goal form (existing form)
  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>
        {isEdit ? "Edit Goal" : `Add Goal${categoryName ? ` to ${categoryName}` : ""}`}
      </Modal.Title>
      <Modal.Body>
        <div className="space-y-4 mt-4">
          {!isEdit && step === 'create-custom' && allTemplates.length > 0 && (
            <button
              type="button"
              onClick={() => setStep('choice')}
              className="text-sm text-primary hover:underline mb-2"
            >
              ← Back to selection
            </button>
          )}
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
