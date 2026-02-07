import { useState } from 'react';
import { CheckCircleIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/solid';
import { GoalMilestone } from '../../utils/useGoals';
import { DeadlineIndicator } from './DeadlineIndicator';
import { getMilestoneProgress, getDeadlineStatus, dateToInputValue, inputValueToTimestamp } from '../../utils/deadlineUtils';
import { Input } from '../ui/input';

interface MilestoneListProps {
  milestones: GoalMilestone[];
  onComplete: (milestoneId: string) => void;
  onDelete: (milestoneId: string) => void;
  onUpdate: (milestoneId: string, updates: Partial<GoalMilestone>) => void;
  onAdd: (milestone: Omit<GoalMilestone, 'id' | 'order'>) => void;
  readOnly?: boolean;
}

export function MilestoneList({
  milestones,
  onComplete,
  onDelete,
  onUpdate,
  onAdd,
  readOnly = false
}: MilestoneListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');

  const progress = getMilestoneProgress(milestones);
  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);

  const handleAddMilestone = () => {
    if (!newMilestoneName.trim()) return;

    onAdd({
      name: newMilestoneName.trim(),
      targetDate: inputValueToTimestamp(newMilestoneDate),
      completed: false
    });

    setNewMilestoneName('');
    setNewMilestoneDate('');
    setIsAdding(false);
  };

  const handleStartEdit = (milestone: GoalMilestone) => {
    setEditingId(milestone.id);
    setEditName(milestone.name);
    setEditDate(dateToInputValue(milestone.targetDate));
  };

  const handleSaveEdit = (milestoneId: string) => {
    onUpdate(milestoneId, {
      name: editName.trim(),
      targetDate: inputValueToTimestamp(editDate)
    });
    setEditingId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress.completed}/{progress.total} milestones ({progress.percentage}%)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Milestone items */}
      <div className="space-y-2">
        {sortedMilestones.map((milestone) => {
          const isEditing = editingId === milestone.id;
          const status = getDeadlineStatus(milestone.targetDate);

          return (
            <div
              key={milestone.id}
              className={`flex items-center gap-3 p-2 rounded-lg border ${
                milestone.completed
                  ? 'bg-muted/50 border-border'
                  : status?.isOverdue
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-card border-border'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => !milestone.completed && onComplete(milestone.id)}
                disabled={milestone.completed || readOnly}
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  milestone.completed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground hover:border-primary'
                } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {milestone.completed && <CheckCircleIcon className="w-4 h-4" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {isEditing && !readOnly ? (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, () => handleSaveEdit(milestone.id))}
                      className="text-sm"
                      autoFocus
                    />
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, () => handleSaveEdit(milestone.id))}
                      className="text-sm w-36"
                    />
                    <button
                      onClick={() => handleSaveEdit(milestone.id)}
                      className="min-h-[44px] px-2 py-1 bg-primary text-primary-foreground rounded text-xs"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {milestone.name}
                    </span>
                    {!milestone.completed && milestone.targetDate && (
                      <DeadlineIndicator targetDate={milestone.targetDate} compact showDate={false} />
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {!readOnly && !isEditing && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleStartEdit(milestone)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1 text-muted-foreground hover:text-foreground"
                    title="Edit milestone"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(milestone.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1 text-muted-foreground hover:text-red-500"
                    title="Delete milestone"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add milestone form */}
      {!readOnly && (
        <>
          {isAdding ? (
            <div className="flex gap-2 p-2 bg-muted/50 rounded-lg">
              <Input
                type="text"
                value={newMilestoneName}
                onChange={(e) => setNewMilestoneName(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, handleAddMilestone)}
                placeholder="Milestone name..."
                className="text-sm"
                autoFocus
              />
              <Input
                type="date"
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, handleAddMilestone)}
                className="text-sm w-36"
              />
              <button
                onClick={handleAddMilestone}
                disabled={!newMilestoneName.trim()}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 bg-muted text-foreground rounded text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <PlusIcon className="w-4 h-4" />
              Add milestone
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default MilestoneList;
