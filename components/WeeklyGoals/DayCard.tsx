import { useState } from 'react';
import { PlusIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/solid';
import { WeeklyGoalItem } from '../../utils/useWeeklyGoals';
import { formatMinutesToReadable, Impact } from '../../utils/timeCalculations';
import { DailyActivityBar } from './DailyActivityBar';
import { Input } from '../ui/input';

interface Goal {
  id: string;
  name: string;
  color?: string;
}

interface DayCardProps {
  day: string;
  dayLabel: string;
  goalItems: (string | WeeklyGoalItem)[];
  availableGoals: Goal[] | null;
  timeBreakdown?: { [goalId: string]: number }; // Minutes tracked for this day per goal
  onAddGoal: () => void;
  onRemoveGoal: (index: number) => void;
  onEditGoal?: (index: number, item: string | WeeklyGoalItem) => void;
  dateKey?: string; // Date in YYYY-MM-DD format
  impacts?: Impact[]; // All impacts for activity bar
  onEditDay?: () => void; // Callback to open timeline slide-over
}

export function DayCard({
  day,
  dayLabel,
  goalItems,
  availableGoals,
  timeBreakdown = {},
  onAddGoal,
  onRemoveGoal,
  onEditGoal,
  dateKey,
  impacts = [],
  onEditDay
}: DayCardProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleEditClick = (index: number, item: string | WeeklyGoalItem) => {
    if (typeof item === 'string') {
      setEditingIndex(index);
      setEditText(item);
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && onEditGoal) {
      onEditGoal(editingIndex, editText);
      setEditingIndex(null);
      setEditText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditText('');
    }
  };

  const getGoalInfo = (item: string | WeeklyGoalItem) => {
    if (typeof item === 'string') {
      return {
        isLegacy: true,
        displayName: item,
        color: 'gray',
        goalId: null,
        targetMinutes: null,
        note: null
      };
    } else {
      const goal = availableGoals?.find(g => g.id === item.goalId);
      return {
        isLegacy: false,
        displayName: goal?.name || 'Unknown Goal',
        color: goal?.color || 'gray',
        goalId: item.goalId,
        targetMinutes: item.targetMinutes,
        note: item.note
      };
    }
  };

  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <div className="flex flex-row justify-between items-center mb-3">
        <h2 className="text-lg text-foreground font-medium">{dayLabel}</h2>
        <PlusIcon
          className="w-5 cursor-pointer text-muted-foreground hover:text-primary transition"
          onClick={onAddGoal}
        />
      </div>

      {/* Daily Activity Bar - clickable to open timeline */}
      {dateKey && impacts.length > 0 && onEditDay && (
        <div onClick={onEditDay} className="cursor-pointer">
          <DailyActivityBar
            dateKey={dateKey}
            impacts={impacts}
            goals={availableGoals}
          />
        </div>
      )}
      {dateKey && impacts.length > 0 && !onEditDay && (
        <DailyActivityBar
          dateKey={dateKey}
          impacts={impacts}
          goals={availableGoals}
        />
      )}

      <div className="flex flex-col gap-2">
        {goalItems.map((item, index) => {
          const goalInfo = getGoalInfo(item);
          const trackedMinutes = goalInfo.goalId ? timeBreakdown[goalInfo.goalId] || 0 : 0;
          const isCompleted = goalInfo.targetMinutes && trackedMinutes >= goalInfo.targetMinutes;
          const completionPercentage = goalInfo.targetMinutes 
            ? Math.round((trackedMinutes / goalInfo.targetMinutes) * 100) 
            : 0;

          return (
            <div
              key={index}
              className={`group flex flex-col gap-1 p-2 rounded transition ${
                isCompleted 
                  ? 'bg-green-500/10 border-2 border-green-500 hover:border-green-600' 
                  : 'bg-background border border-border hover:border-primary'
              }`}
            >
              {editingIndex === index ? (
                <Input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={handleSaveEdit}
                  autoFocus
                  className="flex-1 bg-transparent"
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 border border-black"
                        style={{ backgroundColor: goalInfo.color }}
                      />
                      <span
                        className="flex-1 text-sm text-foreground cursor-pointer"
                        onClick={() => handleEditClick(index, item)}
                      >
                        {goalInfo.displayName}
                      </span>
                      <TrashIcon
                        className="w-4 h-4 text-muted-foreground hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                        onClick={() => onRemoveGoal(index)}
                      />
                    </div>
                  </div>

                  {!goalInfo.isLegacy && (
                    <div className="ml-5 space-y-1">
                      {trackedMinutes > 0 && (
                        <div className={`text-xs flex items-center gap-1 ${isCompleted ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}`}>
                          {isCompleted && (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          )}
                          <span>
                            Tracked: {formatMinutesToReadable(trackedMinutes)}
                            {goalInfo.targetMinutes && (
                              <span className="ml-1">
                                / {formatMinutesToReadable(goalInfo.targetMinutes)} target
                                <span className="ml-1">
                                  ({completionPercentage}%)
                                </span>
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {goalInfo.targetMinutes && trackedMinutes === 0 && (
                        <div className="text-xs text-muted-foreground">
                          Target: {formatMinutesToReadable(goalInfo.targetMinutes)}
                        </div>
                      )}

                      {trackedMinutes > 0 && goalInfo.targetMinutes && (
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isCompleted ? 'shadow-[0_0_8px_rgba(34,197,94,0.5)]' : ''}`}
                            style={{
                              width: `${Math.min((trackedMinutes / goalInfo.targetMinutes) * 100, 100)}%`,
                              backgroundColor: isCompleted ? '#22c55e' : goalInfo.color
                            }}
                          />
                        </div>
                      )}

                      {goalInfo.note && (
                        <div className="text-xs text-muted-foreground italic">
                          {goalInfo.note}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {goalItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No goals yet.</p>
        )}
      </div>
    </div>
  );
}
