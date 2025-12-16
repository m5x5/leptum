import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';
import { WeeklyGoal } from '../../utils/useWeeklyGoals';
import {
  GoalTimeBreakdown,
  UncategorizedTimeBreakdown,
  useWeeklyGoalTimeTracking
} from '../../utils/useWeeklyGoalTimeTracking';
import { formatMinutesToReadable } from '../../utils/timeCalculations';

interface Goal {
  id: string;
  name: string;
  color?: string;
}

interface WeeklyGoalTimeTrackingProps {
  weekStart: string;
  weeklyGoal: WeeklyGoal;
  goals: Goal[] | null;
}

export function WeeklyGoalTimeTracking({
  weekStart,
  weeklyGoal,
  goals
}: WeeklyGoalTimeTrackingProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const { goalTimeBreakdowns, uncategorizedTime, totalTrackedMinutes, isLoading, error } =
    useWeeklyGoalTimeTracking(weekStart, goals);

  const toggleGoalExpansion = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="mb-6 p-4 bg-card border border-border rounded-lg">
        <div className="text-muted-foreground">Loading time tracking data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 bg-card border border-border rounded-lg">
        <div className="text-red-500">Failed to load time tracking data</div>
      </div>
    );
  }

  if (totalTrackedMinutes === 0) {
    return (
      <div className="mb-6 p-4 bg-card border border-border rounded-lg">
        <div className="text-muted-foreground">No time tracked this week</div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-card border border-border rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex justify-between items-center hover:bg-background/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-foreground">
            Weekly Time Summary
          </h3>
          <span className="text-sm text-muted-foreground">
            Total: {formatMinutesToReadable(totalTrackedMinutes)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {goalTimeBreakdowns.map(breakdown => (
            <GoalTimeCard
              key={breakdown.goalId}
              breakdown={breakdown}
              isExpanded={expandedGoals.has(breakdown.goalId)}
              onToggle={() => toggleGoalExpansion(breakdown.goalId)}
            />
          ))}

          {uncategorizedTime.totalMinutes > 0 && (
            <UncategorizedTimeCard
              breakdown={uncategorizedTime}
              isExpanded={expandedGoals.has('uncategorized')}
              onToggle={() => toggleGoalExpansion('uncategorized')}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface GoalTimeCardProps {
  breakdown: GoalTimeBreakdown;
  isExpanded: boolean;
  onToggle: () => void;
}

function GoalTimeCard({ breakdown, isExpanded, onToggle }: GoalTimeCardProps) {
  const days: Array<keyof typeof breakdown.dailyBreakdown> = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ];

  const dayLabels = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun'
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex justify-between items-center hover:bg-background/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: breakdown.goalColor }}
          />
          <span className="text-foreground font-medium">{breakdown.goalName}</span>
          <span className="text-sm text-muted-foreground">
            {formatMinutesToReadable(breakdown.totalMinutes)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-7 gap-1 text-xs">
            {days.map(day => {
              const minutes = breakdown.dailyBreakdown[day];
              return (
                <div
                  key={day}
                  className="text-center p-1 bg-background rounded"
                >
                  <div className="text-muted-foreground">{dayLabels[day]}</div>
                  <div className="text-foreground font-medium">
                    {minutes > 0 ? formatMinutesToReadable(minutes) : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          {breakdown.activities.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-muted-foreground">Activities:</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {breakdown.activities.map((activity, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 bg-background rounded flex justify-between"
                  >
                    <span className="text-foreground">{activity.activityName}</span>
                    <span className="text-muted-foreground">
                      {formatMinutesToReadable(activity.durationMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface UncategorizedTimeCardProps {
  breakdown: UncategorizedTimeBreakdown;
  isExpanded: boolean;
  onToggle: () => void;
}

function UncategorizedTimeCard({
  breakdown,
  isExpanded,
  onToggle
}: UncategorizedTimeCardProps) {
  const days: Array<keyof typeof breakdown.dailyBreakdown> = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ];

  const dayLabels = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun'
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex justify-between items-center hover:bg-background/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-foreground font-medium">Uncategorized</span>
          <span className="text-sm text-muted-foreground">
            {formatMinutesToReadable(breakdown.totalMinutes)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-7 gap-1 text-xs">
            {days.map(day => {
              const minutes = breakdown.dailyBreakdown[day];
              return (
                <div
                  key={day}
                  className="text-center p-1 bg-background rounded"
                >
                  <div className="text-muted-foreground">{dayLabels[day]}</div>
                  <div className="text-foreground font-medium">
                    {minutes > 0 ? formatMinutesToReadable(minutes) : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          {breakdown.activities.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-muted-foreground">Activities:</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {breakdown.activities.map((activity, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 bg-background rounded flex justify-between"
                  >
                    <span className="text-foreground">{activity.activityName}</span>
                    <span className="text-muted-foreground">
                      {formatMinutesToReadable(activity.durationMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
