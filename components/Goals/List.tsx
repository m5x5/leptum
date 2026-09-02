import { PlusIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";
import { useState, useEffect } from "react";
import { useGoals, Goal, GoalMilestone } from "../../utils/useGoals";
import GoalItem from "./GoalItem";
import AddGoalModal from "../Modal/AddGoalModal";
import GoalTemplateGallery from "./GoalTemplateGallery";
import { GoalTemplate } from "../../utils/goalTemplates";
import Modal from "../Modal";
import { TemplateSelector } from "./TemplateSelector";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { getTemplateById, createRoutineFromTemplate, createRoutinesFromTemplate } from "../../utils/goalTemplatesWithTracking";
import { Routine } from "../Job/api";
import { Button } from "../ui/button";

interface IProps {
  name: string;
  stored: Boolean;
  children?: JSX.Element[] | JSX.Element;
  remove: (name: string) => void;
  id: string;
  items: Goal[];
}

export default function GoalList({ name = "", children, id, items }: IProps) {
  const {
    deleteGoal,
    archiveGoal,
    unarchiveGoal,
    addGoal,
    updateGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    isLoading,
    reload: reloadGoals
  } = useGoals();
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  
  // Note: useGoals() already listens for 'goalUpdated' events internally

  const handleAddGoal = async (goalName: string, color: string, options?: { description?: string; targetDate?: number; milestones?: Omit<GoalMilestone, 'id'>[]; templateId?: string }): Promise<void> => {
    const newGoal = await addGoal(goalName, id, color, options);
    
    // If a template with tracking was used, create the associated routines
    if (newGoal && options?.templateId) {
      const template = getTemplateById(options.templateId);
      if (template) {
        try {
          const allRoutines = await remoteStorageClient.getRoutines() as Routine[];
          
          if (template.routineConfigs && template.routineConfigs.length > 0) {
            // Multiple routines (e.g., nutrition with breakfast, lunch, dinner, snack)
            const newRoutines = createRoutinesFromTemplate(template, newGoal.id, allRoutines.length);
            // Save routines sequentially with delays to prevent "maximum debt" errors
            for (let i = 0; i < newRoutines.length; i++) {
              await remoteStorageClient.saveRoutine(newRoutines[i]);
              // Small delay between saves to avoid overwhelming storage writes
              if (i < newRoutines.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
          } else if (template.routineConfig) {
            // Single routine (e.g., hydration)
            const routine = createRoutineFromTemplate(template, newGoal.id, allRoutines.length);
            if (routine) {
              await remoteStorageClient.saveRoutine(routine);
            }
          }
        } catch (error) {
          console.error("Failed to create routines from template:", error);
        }
      }
    }
  };

  const handleSelectTemplate = (template: GoalTemplate | null) => {
    setShowTemplateGallery(false);
    if (template === null) {
      // User chose "Create Custom Goal"
      setSelectedTemplate(null);
      setShowAddModal(true);
    } else {
      // User selected a template
      setSelectedTemplate(template);
      setShowAddModal(true);
    }
  };

  const handleEditGoal = (_goalId: string, goal: Goal): void => {
    setEditingGoal(goal);
    setShowEditModal(true);
  };

  const handleOpenTemplateSelector = (goal: Goal) => {
    setEditingGoal(goal);
    setShowTemplateSelector(true);
  };

  const handleTemplateApplied = () => {
    reloadGoals();
    setShowTemplateSelector(false);
    setEditingGoal(null);
  };

  const handleSaveEdit = (goalName: string, color: string, options?: { description?: string; targetDate?: number }): void => {
    if (editingGoal) {
      updateGoal(goalName, editingGoal.id, color, {
        description: options?.description,
        targetDate: options?.targetDate ?? null
      });
    }
  };

  const handleAddMilestone = async (goalId: string, milestone: Omit<GoalMilestone, 'id' | 'order'>) => {
    await addMilestone(goalId, milestone);
  };

  const handleUpdateMilestone = async (goalId: string, milestoneId: string, updates: Partial<GoalMilestone>) => {
    await updateMilestone(goalId, milestoneId, updates);
  };

  const handleDeleteMilestone = async (goalId: string, milestoneId: string) => {
    await deleteMilestone(goalId, milestoneId);
  };

  const handleCompleteMilestone = async (goalId: string, milestoneId: string) => {
    await completeMilestone(goalId, milestoneId);
  };

  const allGoalsForType = (items || []).filter(g => {
    const hasName = typeof g?.name === "string" && g.name.trim().length > 0;
    if (!hasName && process.env.NODE_ENV !== "production") {
      console.warn("[GoalList] Hiding goal with empty name:", g?.id, g);
    }
    return hasName;
  });
  const goalsForThisType = allGoalsForType.filter(g => g.status !== 'archived');
  const archivedGoals = allGoalsForType.filter(g => g.status === 'archived');

  if (!name || name.trim().length === 0) return null;

  return (
    <>
      <div className="p-4 bg-card border border-border rounded-control">
        <div className="flex flex-row justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">{name}</h2>
          <div className="flex-row flex items-center text-muted-foreground gap-2">
            {children}
            {archivedGoals.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchived(v => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs hover:text-foreground transition-colors"
                aria-pressed={showArchived}
              >
                {showArchived ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                {archivedGoals.length} archived
              </button>
            )}
            <PlusIcon className="w-5 cursor-pointer" onClick={() => setShowAddModal(true)} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {goalsForThisType.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onDelete={deleteGoal}
              onEdit={handleEditGoal}
              onArchive={archiveGoal}
              onUnarchive={unarchiveGoal}
              onAddMilestone={handleAddMilestone}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onCompleteMilestone={handleCompleteMilestone}
              onSelectTemplate={handleOpenTemplateSelector}
            />
          ))}
          {goalsForThisType.length === 0 && archivedGoals.length === 0 && !isLoading && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">No goals yet in this category.</p>
              <Button onClick={() => setShowTemplateGallery(true)}>
                Browse Goal Templates
              </Button>

            </div>
          )}
          {archivedGoals.length > 0 && showArchived && (
            <div className="flex flex-col gap-2 mt-2 opacity-60">
              {archivedGoals.map((goal) => (
                <GoalItem
                  key={goal.id}
                  goal={goal}
                  onDelete={deleteGoal}
                  onEdit={handleEditGoal}
                  onArchive={archiveGoal}
                  onUnarchive={unarchiveGoal}
                  onAddMilestone={handleAddMilestone}
                  onUpdateMilestone={handleUpdateMilestone}
                  onDeleteMilestone={handleDeleteMilestone}
                  onCompleteMilestone={handleCompleteMilestone}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddGoalModal
        isOpen={showAddModal}
        onHide={() => {
          setShowAddModal(false);
          setSelectedTemplate(null);
        }}
        onAdd={handleAddGoal}
        categoryName={name}
        initialName={selectedTemplate?.name}
        initialColor={selectedTemplate?.color}
        initialDescription={selectedTemplate?.description}
        initialMilestones={selectedTemplate?.milestones}
      />

      <AddGoalModal
        isOpen={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          // Delay clearing editingGoal so Radix Dialog can finish its close animation
          // without props changing underneath it
          setTimeout(() => setEditingGoal(null), 200);
        }}
        onAdd={handleSaveEdit}
        categoryName={name}
        initialName={editingGoal?.name ?? ""}
        initialColor={editingGoal?.color || "bg-blue-500"}
        initialDescription={editingGoal?.description}
        initialTargetDate={editingGoal?.targetDate}
        isEdit={true}
      />

      <Modal isOpen={showTemplateGallery} closeModal={() => setShowTemplateGallery(false)}>
        <Modal.Title>Choose a Goal Template</Modal.Title>
        <Modal.Body>
          <GoalTemplateGallery onSelectTemplate={handleSelectTemplate} categoryName={name} />
        </Modal.Body>
      </Modal>

      {editingGoal && (
        <TemplateSelector
          goal={editingGoal}
          isOpen={showTemplateSelector}
          onClose={() => {
            setShowTemplateSelector(false);
            setEditingGoal(null);
          }}
          onTemplateApplied={handleTemplateApplied}
        />
      )}
    </>
  );
}
