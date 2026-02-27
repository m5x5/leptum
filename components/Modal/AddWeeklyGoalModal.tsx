import { useState } from 'react';
import { WeeklyGoalItem } from '../../utils/useWeeklyGoals';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface Goal {
  id: string;
  name: string;
  color?: string;
  typeId?: string;
}

interface GoalType {
  id: string;
  name: string;
}

interface AddWeeklyGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (goalItem: WeeklyGoalItem) => void;
  availableGoals: Goal[] | null;
  goalTypes: GoalType[] | null;
  currentGoalIds: string[];
}

export function AddWeeklyGoalModal({
  isOpen,
  onClose,
  onAdd,
  availableGoals,
  goalTypes,
  currentGoalIds
}: AddWeeklyGoalModalProps) {
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [targetHours, setTargetHours] = useState('');
  const [targetMinutes, setTargetMinutes] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGoalId) return;

    const hours = parseInt(targetHours) || 0;
    const mins = parseInt(targetMinutes) || 0;
    const totalMinutes = hours * 60 + mins;

    const goalItem: WeeklyGoalItem = {
      goalId: selectedGoalId,
      ...(totalMinutes > 0 && { targetMinutes: totalMinutes }),
      ...(note.trim() && { note: note.trim() })
    };

    onAdd(goalItem);
    handleClose();
  };

  const handleClose = () => {
    setSelectedGoalId('');
    setTargetHours('');
    setTargetMinutes('');
    setNote('');
    onClose();
  };

  const getGoalsByType = (): { grouped: Map<string, Goal[]>; ungrouped: Goal[] } => {
    if (!availableGoals) return { grouped: new Map(), ungrouped: [] };

    const grouped = new Map<string, Goal[]>();
    const ungrouped: Goal[] = [];

    availableGoals.forEach(goal => {
      if (currentGoalIds.includes(goal.id)) return;

      if (goal.typeId) {
        if (!grouped.has(goal.typeId)) {
          grouped.set(goal.typeId, []);
        }
        grouped.get(goal.typeId)!.push(goal);
      } else {
        ungrouped.push(goal);
      }
    });

    return { grouped, ungrouped };
  };

  const { grouped, ungrouped } = getGoalsByType();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium leading-6 text-foreground">
            Add Goal to Week
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="goal-select"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Select Goal
            </label>
            <select
              id="goal-select"
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Choose a goal...</option>

              {grouped.size > 0 &&
                Array.from(grouped.entries()).map(([typeId, goals]: [string, Goal[]]) => {
                  const type = goalTypes?.find((t: GoalType) => t.id === typeId);
                  return (
                    <optgroup key={typeId} label={type?.name || 'Unknown Type'}>
                      {goals.map((goal: Goal) => (
                        <option key={goal.id} value={goal.id}>
                          {goal.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}

              {ungrouped.length > 0 && (
                <optgroup label="Uncategorized">
                  {ungrouped.map((goal: Goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Time Target (optional)
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Hours"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                />
                <div className="text-xs text-muted-foreground mt-1">Hours</div>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Minutes"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(e.target.value)}
                />
                <div className="text-xs text-muted-foreground mt-1">Minutes</div>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="note"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Note (optional)
            </label>
            <Input
              id="note"
              type="text"
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedGoalId}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Goal
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
