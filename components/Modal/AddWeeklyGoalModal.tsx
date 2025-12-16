import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XIcon } from '@heroicons/react/solid';
import { WeeklyGoalItem } from '../../utils/useWeeklyGoals';

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
  currentGoalIds: string[]; // Goals already added for this day
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
      // Skip goals already added to this day
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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border border-border">
                <div className="flex justify-between items-start mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-foreground"
                  >
                    Add Goal to Week
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

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
                        <input
                          type="number"
                          min="0"
                          max="23"
                          placeholder="Hours"
                          value={targetHours}
                          onChange={(e) => setTargetHours(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="text-xs text-muted-foreground mt-1">Hours</div>
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          placeholder="Minutes"
                          value={targetMinutes}
                          onChange={(e) => setTargetMinutes(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                    <input
                      id="note"
                      type="text"
                      placeholder="Add a note..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
