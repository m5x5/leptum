import { useState, useEffect } from 'react';
import { Goal } from '../../utils/useGoals';
import { GOAL_TEMPLATES_WITH_TRACKING, GoalTemplateWithTracking, isHydrationGoal, isNutritionGoal } from '../../utils/goalTemplatesWithTracking';
import { applyTemplateToGoal } from '../../utils/migrateGoalToTemplate';
import { remoteStorageClient } from '../../lib/remoteStorage';
import { Routine } from '../../components/Job/api';
import Modal from '../Modal';

interface TemplateSelectorProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onTemplateApplied: () => void;
}

export function TemplateSelector({ goal, isOpen, onClose, onTemplateApplied }: TemplateSelectorProps) {
  const [applying, setApplying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('');

  // Load routines when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadRoutines = async () => {
        const loadedRoutines = await remoteStorageClient.getRoutines();
        setRoutines(loadedRoutines as Routine[]);
        
        // Auto-select routine if one is already linked to this goal
        const linkedRoutine = (loadedRoutines as Routine[]).find(
          r => r.goalIds?.includes(goal.id)
        );
        if (linkedRoutine) {
          setSelectedRoutineId(linkedRoutine.id);
        }
      };
      loadRoutines();
    }
  }, [isOpen, goal.id]);

  const handleApplyTemplate = async (templateId: string) => {
    try {
      setApplying(true);
      // Pass selected routine ID if user chose one
      await applyTemplateToGoal(goal.id, templateId, selectedRoutineId || undefined);
      onTemplateApplied();
      onClose();
    } catch (error) {
      console.error('Failed to apply template:', error);
      alert('Failed to apply template. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // Check if this goal looks like a hydration or nutrition goal
  const isHydration = isHydrationGoal(goal.name);
  const isNutrition = isNutritionGoal(goal.name);
  const suggestedTemplate = isHydration ? 'stay-hydrated' : (isNutrition ? 'track-nutrition' : null);

  return (
    <Modal isOpen={isOpen} closeModal={onClose}>
      <Modal.Title>Select Template for &quot;{goal.name}&quot;</Modal.Title>
      <Modal.Body>
        <div className="space-y-4 mt-4">
          {suggestedTemplate && (
            <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground mb-3">
                💡 This looks like a {isHydration ? 'hydration' : 'nutrition'} goal! We suggest:
              </p>
              
              {/* Routine selection for suggested template */}
              {routines.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Link your existing {isHydration ? 'hydration' : 'meal'} routine:
                  </label>
                  <select
                    value={selectedRoutineId}
                    onChange={(e) => setSelectedRoutineId(e.target.value)}
                    className="w-full p-2 text-sm bg-card border border-border text-foreground rounded-lg focus:border-primary focus:outline-none"
                  >
                    <option value="">Create new routine from template</option>
                    {routines.map((routine) => (
                      <option key={routine.id} value={routine.id}>
                        {routine.name} {routine.cron ? `(${routine.cron})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedRoutineId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ✓ Will migrate your routine completion history
                    </p>
                  )}
                </div>
              )}
              
              {GOAL_TEMPLATES_WITH_TRACKING
                .filter(t => t.id === suggestedTemplate)
                .map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template.id)}
                    disabled={applying}
                    className="w-full text-left p-3 bg-card border border-border rounded-lg hover:border-primary transition disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        {(template.routineConfig || template.routineConfigs) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Includes: Routine reminders + Visual tracking
                            {template.routineConfigs && ` (${template.routineConfigs.length} routines)`}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Routine Selection - Show if templates need routines */}
          {GOAL_TEMPLATES_WITH_TRACKING.some(t => t.routineConfig || t.routineConfigs) && (
            <div className="mb-4 p-4 bg-muted/50 border border-border rounded-lg">
              <label className="block text-sm font-medium text-foreground mb-2">
                Routine Setup
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                {GOAL_TEMPLATES_WITH_TRACKING.find(t => t.id === suggestedTemplate)?.routineConfigs
                  ? 'This template will create separate reminder routines for each meal type (Breakfast, Lunch, Dinner, Snack).'
                  : 'This template includes routine reminders. You can link an existing routine or create a new one.'}
              </p>
              {routines.length > 0 && (
                <select
                  value={selectedRoutineId}
                  onChange={(e) => setSelectedRoutineId(e.target.value)}
                  className="w-full p-3 bg-card border border-border text-foreground rounded-lg focus:border-primary focus:outline-none mb-2"
                >
                  <option value="">Create new routine(s) from template</option>
                  {routines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name} {routine.cron ? `(${routine.cron})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedRoutineId ? (
                <p className="text-xs text-primary mt-1">
                  ✓ Will link existing routine and migrate completion history
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ Will create new routine(s) with reminders based on the template
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Available Templates</h3>
            <div className="space-y-2">
              {GOAL_TEMPLATES_WITH_TRACKING.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template.id)}
                  disabled={applying || template.id === goal.templateId}
                  className={`w-full text-left p-3 bg-card border rounded-lg transition ${
                    template.id === goal.templateId
                      ? 'border-primary bg-primary/5 opacity-60 cursor-not-allowed'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        {template.id === goal.templateId && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      {(template.routineConfig || template.routineConfigs) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ✓ Routine reminders • ✓ Visual tracking
                          {template.routineConfigs && ` (${template.routineConfigs.length} routines)`}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {applying && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Applying template...</p>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
