import { useState } from 'react';
import { TrashIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@heroicons/react/outline';
import { Goal, GoalMilestone } from '../../utils/useGoals';
import { DeadlineIndicator } from './DeadlineIndicator';
import { MilestoneList } from './MilestoneList';
import { getMilestoneProgress } from '../../utils/deadlineUtils';

interface GoalItemProps {
  goal: Goal;
  onDelete: (id: string) => void;
  onEdit: (id: string, goal: Goal) => void;
  onComplete: (id: string) => void;
  onAddMilestone: (goalId: string, milestone: Omit<GoalMilestone, 'id' | 'order'>) => void;
  onUpdateMilestone: (goalId: string, milestoneId: string, updates: Partial<GoalMilestone>) => void;
  onDeleteMilestone: (goalId: string, milestoneId: string) => void;
  onCompleteMilestone: (goalId: string, milestoneId: string) => void;
}

export function GoalItem({
  goal,
  onDelete,
  onEdit,
  onComplete,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onCompleteMilestone
}: GoalItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMilestones = goal.milestones && goal.milestones.length > 0;
  const progress = getMilestoneProgress(goal.milestones);
  const isCompleted = goal.status === 'completed';

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${isCompleted ? 'opacity-60' : ''}`}>
      {/* Main content row */}
      <div className="p-3 flex items-center gap-3">
        {/* Completion checkbox */}
        <button
          onClick={() => !isCompleted && onComplete(goal.id)}
          disabled={isCompleted}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground hover:border-primary cursor-pointer'
          }`}
          title={isCompleted ? 'Completed' : 'Mark as complete'}
        >
          {isCompleted && <CheckIcon className="w-3 h-3" />}
        </button>

        {/* Color indicator */}
        {goal.color && (
          <div className={`w-3 h-3 rounded-full ${goal.color} flex-shrink-0`}></div>
        )}

        {/* Goal name and info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onEdit(goal.id, goal)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-lg font-bold text-foreground hover:text-primary transition ${isCompleted ? 'line-through' : ''}`}>
              {goal.name}
            </h3>
            {!isCompleted && goal.targetDate && (
              <DeadlineIndicator targetDate={goal.targetDate} compact />
            )}
          </div>
          {goal.description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {goal.description}
            </p>
          )}
        </div>

        {/* Milestone progress indicator */}
        {hasMilestones && (
          <div className="flex-shrink-0 text-xs text-muted-foreground">
            {progress.completed}/{progress.total}
          </div>
        )}

        {/* Expand/collapse button */}
        {(hasMilestones || goal.description) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-muted-foreground hover:text-foreground"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Delete button */}
        <div className="bg-muted p-1 rounded-xl flex-shrink-0">
          <TrashIcon
            className="w-5 h-5 text-muted-foreground hover:text-red-500 transition cursor-pointer"
            onClick={() => onDelete(goal.id)}
          />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border space-y-4">
          {/* Full description */}
          {goal.description && (
            <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
              {goal.description}
            </p>
          )}

          {/* Milestones */}
          <div className="mt-3">
            <MilestoneList
              milestones={goal.milestones || []}
              onComplete={(milestoneId) => onCompleteMilestone(goal.id, milestoneId)}
              onDelete={(milestoneId) => onDeleteMilestone(goal.id, milestoneId)}
              onUpdate={(milestoneId, updates) => onUpdateMilestone(goal.id, milestoneId, updates)}
              onAdd={(milestone) => onAddMilestone(goal.id, milestone)}
              readOnly={isCompleted}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalItem;
