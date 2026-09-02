import { useState, useEffect, useRef, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "../ui/sheet";
import { Input } from "../ui/input";
import { RichTextEditor } from "../ui/rich-text-editor";
import { Button } from "../ui/button";
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

const EMPTY_MILESTONES: Array<{ name: string; order: number; daysOffset?: number }> = [];

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

interface GoalSheetShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}

function GoalSheetShell({ isOpen, onClose, title, children, footer }: GoalSheetShellProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        <SheetFooter className="border-t border-border px-6 py-4">{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const AddGoalModal = ({
  onAdd,
  isOpen,
  onHide,
  categoryName,
  initialName = "",
  initialColor = "bg-blue-500",
  initialDescription = "",
  initialTargetDate,
  initialMilestones,
  isEdit = false,
}: AddGoalModalProps) => {
  // Determine initial step: skip choice if editing, or if initialName is already set (from template)
  const allTemplates = [...GOAL_TEMPLATES_WITH_TRACKING, ...GOAL_TEMPLATES];
  const stableMilestones = initialMilestones ?? EMPTY_MILESTONES;
  const shouldShowChoice = !isEdit && !initialName && allTemplates.length > 0;
  const [step, setStep] = useState<ModalStep>(shouldShowChoice ? 'choice' : 'create-custom');
  const [goalName, setGoalName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [description, setDescription] = useState(initialDescription);
  const [targetDate, setTargetDate] = useState(dateToInputValue(initialTargetDate));
  const baseDateRef = useRef(0);
  const [milestones, setMilestones] = useState<Array<{ name: string; order: number; targetDate?: number }>>(
    stableMilestones.map((m, idx) => {
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
      if (!initialTargetDate && stableMilestones.length > 0) {
        queueMicrotask(() => {
          setMilestones(stableMilestones.map((m, idx) => {
            const baseDate = baseDateRef.current;
            const targetDate = m.daysOffset ? baseDate + (m.daysOffset * 24 * 60 * 60 * 1000) : undefined;
            return { name: m.name, order: m.order ?? idx, targetDate };
          }));
        });
      }
    }
  }, [initialTargetDate, stableMilestones]);
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [showMilestones, setShowMilestones] = useState(stableMilestones.length > 0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  // Sync form state only when modal opens (isOpen transitions to true)
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (!isOpen) {
      if (wasOpen) {
        // Modal just closed — reset step after animation
        const shouldShowChoice = !isEdit && !initialName && allTemplates.length > 0;
        setTimeout(() => setStep(shouldShowChoice ? 'choice' : 'create-custom'), 200);
      }
      return;
    }

    if (!wasOpen) {
      // Modal just opened — sync form state from props
      setGoalName(initialName);
      setSelectedColor(initialColor);
      setDescription(initialDescription);
      setTargetDate(dateToInputValue(initialTargetDate));

      if (baseDateRef.current === 0) baseDateRef.current = Date.now();
      const baseDate = initialTargetDate ?? baseDateRef.current;
      const milestonesData = stableMilestones.map((m, idx) => {
        const targetDate = m.daysOffset ? baseDate + (m.daysOffset * 24 * 60 * 60 * 1000) : undefined;
        return { name: m.name, order: m.order ?? idx, targetDate };
      });
      setMilestones(milestonesData);
      setShowMilestones(stableMilestones.length > 0);

      if (initialName) {
        const matchingTemplate = GOAL_TEMPLATES_WITH_TRACKING.find(t => t.name === initialName);
        setSelectedTemplateId(matchingTemplate ? matchingTemplate.id : undefined);
      } else {
        setSelectedTemplateId(undefined);
      }

      const shouldShowChoiceOnOpen = !isEdit && !initialName && allTemplates.length > 0;
      setStep(shouldShowChoiceOnOpen ? 'choice' : 'create-custom');
    }
  }, [isOpen, allTemplates.length, initialColor, initialDescription, initialName, initialTargetDate, isEdit, stableMilestones]);

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
      <GoalSheetShell
        isOpen={isOpen}
        onClose={closeModal}
        title={`Add Goal${categoryName ? ` to ${categoryName}` : ""}`}
        footer={
          <div className="flex w-full gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Would you like to select a predefined goal template or create a custom one?
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep('select-template')}
              className="min-h-[44px] px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-control transition text-left"
            >
              <div className="font-medium">Select Predefined Template</div>
              <div className="text-sm text-muted-foreground mt-1">
                Choose from templates like Hydration, Nutrition, and more
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStep('create-custom')}
              className="min-h-[44px] px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-control transition text-left"
            >
              <div className="font-medium">Create Custom Goal</div>
              <div className="text-sm text-muted-foreground mt-1">
                Create a new goal with your own details
              </div>
            </button>
          </div>
        </div>
      </GoalSheetShell>
    );
  }

  // Render template selection screen
  if (step === 'select-template') {
    return (
      <GoalSheetShell
        isOpen={isOpen}
        onClose={closeModal}
        title="Select Goal Template"
        footer={
          <div className="flex w-full gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep('choice')}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {allTemplates.length > 0 ? (
            <div className="space-y-2">
              {allTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full min-h-[44px] px-4 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-control transition text-left flex items-center gap-3"
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
      </GoalSheetShell>
    );
  }

  // Render create custom goal form (existing form)
  return (
    <GoalSheetShell
      isOpen={isOpen}
      onClose={closeModal}
      title={isEdit ? "Edit Goal" : `Add Goal${categoryName ? ` to ${categoryName}` : ""}`}
      footer={
        <div className="flex w-full gap-2 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={closeModal}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
          >
            {isEdit ? "Save Changes" : "Add Goal"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
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
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-full min-w-0 min-h-[44px] h-10 rounded-control ${color.value} hover:opacity-80 transition ${
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
                  className="min-h-[44px] flex items-center px-2 text-xs text-primary hover:underline"
                >
                  + Add milestones
                </button>
              )}
            </div>

            {showMilestones && (
              <div className="space-y-2">
                {milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-control">
                    <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                    <span className="flex-1 text-sm">{milestone.name}</span>
                    <Button
                      type="button"
                      variant="ghost-destructive"
                      size="icon"
                      onClick={() => removeMilestone(index)}
                      title="Remove milestone"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
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
                  <Button
                    type="button"
                    size="sm"
                    onClick={addMilestone}
                  >
                    Add
                  </Button>
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
    </GoalSheetShell>
  );
};

export default AddGoalModal;
