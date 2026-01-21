import React from 'react';
import { StreakInfo } from '../utils/streakUtils';

interface StreakBadgeProps {
  streakInfo: StreakInfo;
  className?: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streakInfo, className = '' }) => {
  const { currentStreak, longestStreak } = streakInfo;

  if (currentStreak === 0 && longestStreak === 0) {
    return null;
  }

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      {currentStreak > 0 && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md text-xs font-medium border border-orange-500/20">
          <span className="text-sm">🔥</span>
          <span>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
        </div>
      )}
      {longestStreak > 0 && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md text-xs font-medium border border-yellow-500/20">
          <span className="text-sm">🏆</span>
          <span>Best: {longestStreak}</span>
        </div>
      )}
    </div>
  );
};
