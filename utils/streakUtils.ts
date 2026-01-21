import { RoutineCompletion } from './useRoutineCompletions';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null; // ISO date string
}

/**
 * Calculates streak information from routine completions
 * A streak is consecutive days with at least one completion
 */
export function calculateStreaks(completions: RoutineCompletion[]): StreakInfo {
  if (completions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletionDate: null,
    };
  }

  // Group completions by date (ISO date string YYYY-MM-DD)
  const completionsByDate = new Map<string, number>();

  completions.forEach(completion => {
    const date = new Date(completion.completedAt);
    const dateStr = date.toISOString().split('T')[0];
    completionsByDate.set(dateStr, (completionsByDate.get(dateStr) || 0) + 1);
  });

  // Sort dates in descending order (most recent first)
  const sortedDates = Array.from(completionsByDate.keys()).sort((a, b) => b.localeCompare(a));

  if (sortedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletionDate: null,
    };
  }

  const lastCompletionDate = sortedDates[0];

  // Calculate current streak (consecutive days from today or yesterday)
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Start counting from today or yesterday if there's a completion
  let checkDate: Date;
  if (completionsByDate.has(todayStr)) {
    checkDate = new Date(today);
    currentStreak = 1;
  } else if (completionsByDate.has(yesterdayStr)) {
    checkDate = new Date(yesterday);
    currentStreak = 1;
  } else {
    // Streak is broken
    checkDate = new Date(today);
    currentStreak = 0;
  }

  // Count backwards for current streak
  if (currentStreak > 0) {
    checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
      const checkDateStr = checkDate.toISOString().split('T')[0];
      if (completionsByDate.has(checkDateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak (scan all dates)
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  // Sort dates chronologically for longest streak calculation
  const chronologicalDates = [...sortedDates].sort((a, b) => a.localeCompare(b));

  chronologicalDates.forEach(dateStr => {
    const currentDate = new Date(dateStr);

    if (prevDate === null) {
      tempStreak = 1;
    } else {
      // Check if this date is consecutive (next day)
      const expectedNext = new Date(prevDate);
      expectedNext.setDate(expectedNext.getDate() + 1);
      const expectedNextStr = expectedNext.toISOString().split('T')[0];

      if (dateStr === expectedNextStr) {
        tempStreak++;
      } else {
        // Streak broken, start new streak
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    prevDate = currentDate;
  });

  // Don't forget the last streak
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    lastCompletionDate,
  };
}
