import { useState } from 'react';
import { ExclamationIcon, XIcon } from '@heroicons/react/solid';
import { WeeklyGoal, WeeklyGoalItem } from '../../utils/useWeeklyGoals';

interface Goal {
  id: string;
  name: string;
  color?: string;
}

interface MigrationBannerProps {
  weeklyGoal: WeeklyGoal;
  availableGoals: Goal[] | null;
  onMigrate: (migratedWeeklyGoal: WeeklyGoal) => void;
}

export function MigrationBanner({
  weeklyGoal,
  availableGoals,
  onMigrate
}: MigrationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const hasLegacyData = () => {
    const days = Object.keys(weeklyGoal.goals) as Array<keyof typeof weeklyGoal.goals>;
    return days.some(day =>
      weeklyGoal.goals[day].some(item => typeof item === 'string')
    );
  };

  const handleMigrate = () => {
    if (!availableGoals) {
      alert('Cannot migrate: Goals not loaded');
      return;
    }

    const migratedGoals = { ...weeklyGoal.goals };
    const days = Object.keys(migratedGoals) as Array<keyof typeof migratedGoals>;

    days.forEach(day => {
      migratedGoals[day] = migratedGoals[day].map(item => {
        if (typeof item === 'string') {
          const matchedGoal = findMatchingGoal(item, availableGoals);
          if (matchedGoal) {
            return {
              goalId: matchedGoal.id
            } as WeeklyGoalItem;
          }
          return item;
        }
        return item;
      });
    });

    const migratedWeeklyGoal: WeeklyGoal = {
      ...weeklyGoal,
      version: 2,
      goals: migratedGoals,
      legacyGoals: { ...weeklyGoal.goals }
    };

    onMigrate(migratedWeeklyGoal);
  };

  const findMatchingGoal = (text: string, goals: Goal[]): Goal | null => {
    const normalizedText = text.toLowerCase().trim();

    const exactMatch = goals.find(
      goal => goal.name.toLowerCase().trim() === normalizedText
    );
    if (exactMatch) return exactMatch;

    const partialMatch = goals.find(goal =>
      goal.name.toLowerCase().includes(normalizedText) ||
      normalizedText.includes(goal.name.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    return null;
  };

  if (!hasLegacyData() || isDismissed) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div className="flex items-start gap-3">
        <ExclamationIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Upgrade to Goal-Based Tracking
          </h4>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
            You have text-based weekly goals. Migrate to the new format to enable time
            tracking and progress monitoring.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleMigrate}
              className="px-3 py-1.5 text-xs font-medium bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600 transition"
            >
              Migrate Now
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="px-3 py-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200 transition"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            We&apos;ll try to match your text goals to existing goals. Your original data will be
            preserved.
          </p>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-yellow-600 dark:text-yellow-500 hover:text-yellow-800 dark:hover:text-yellow-300 transition flex-shrink-0"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
