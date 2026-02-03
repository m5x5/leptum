import { PlusIcon } from "@heroicons/react/solid";
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
    addGoal,
    updateGoal,
    completeGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    reload: reloadGoals
  } = useGoals();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  
  // Reload goals when updated (for template application)
  useEffect(() => {
    const handleGoalUpdate = () => {
      reloadGoals();
    };
    window.addEventListener('goalUpdated', handleGoalUpdate);
    return () => window.removeEventListener('goalUpdated', handleGoalUpdate);
  }, [reloadGoals]);

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
              // Small delay between saves to prevent overwhelming RemoteStorage sync
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

  const handleEditGoal = (goalId: string, goal: Goal): void => {
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
      setEditingGoal(null);
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
          {goalsForThisType.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onDelete={deleteGoal}
              onEdit={handleEditGoal}
              onComplete={completeGoal}
              onAddMilestone={handleAddMilestone}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onCompleteMilestone={handleCompleteMilestone}
              onSelectTemplate={handleOpenTemplateSelector}
            />
          ))}
          {goalsForThisType.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">No goals yet in this category.</p>
              <button
                onClick={() => setShowTemplateGallery(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium text-sm"
              >
                Browse Goal Templates
              </button>
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
          initialDescription={editingGoal.description}
          initialTargetDate={editingGoal.targetDate}
          isEdit={true}
        />
      )}

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
