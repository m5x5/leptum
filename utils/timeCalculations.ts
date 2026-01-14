export interface Impact {
  activity: string;
  date: number;
  goalId?: string;
  [key: string]: any;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * Get impacts within a specific date range
 */
export function getImpactsInRange(
  impacts: Impact[],
  startDate: Date,
  endDate: Date
): Impact[] {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  return impacts.filter(impact =>
    impact.date >= startTime && impact.date < endTime
  );
}

/**
 * Check if a timestamp is today
 */
export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if two timestamps are on the same day
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

/**
 * Calculate duration for an impact in milliseconds
 * Reuses logic from timeline.tsx (lines 208-221)
 */
export function calculateImpactDuration(
  impact: Impact,
  nextImpact: Impact | null,
  currentActivityIsToday: boolean
): number {
  if (nextImpact && isSameDay(impact.date, nextImpact.date)) {
    // Next impact is on the same day
    return nextImpact.date - impact.date;
  } else if (currentActivityIsToday && !nextImpact) {
    // Last activity of today - use current time
    return Date.now() - impact.date;
  } else {
    // Last activity of a past day - use end of day
    const endOfDay = new Date(impact.date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() - impact.date;
  }
}

/**
 * Get day of week from timestamp
 */
export function getDayOfWeek(timestamp: number): DayOfWeek {
  const date = new Date(timestamp);
  const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, ...

  const days: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];

  return days[dayIndex];
}

/**
 * Format minutes to readable string (e.g., "8h 30m")
 */
export function formatMinutesToReadable(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Convert milliseconds to minutes
 */
export function msToMinutes(ms: number): number {
  return Math.floor(ms / (1000 * 60));
}

/**
 * Calculate percentage of 24 hours
 */
export function calculateDayPercentage(minutes: number): number {
  const minutesInDay = 24 * 60;
  return Math.min((minutes / minutesInDay) * 100, 100);
}

/**
 * Split an impact that spans midnight into multiple day entries
 * Returns array of { day: DayOfWeek, durationMinutes: number }
 */
export function splitMidnightActivity(
  impact: Impact,
  nextImpact: Impact | null
): Array<{ day: DayOfWeek; durationMinutes: number }> {
  const result: Array<{ day: DayOfWeek; durationMinutes: number }> = [];

  // If same day or next impact is null, no splitting needed
  if (!nextImpact || isSameDay(impact.date, nextImpact.date)) {
    const duration = calculateImpactDuration(impact, nextImpact, isToday(impact.date));
    return [{
      day: getDayOfWeek(impact.date),
      durationMinutes: msToMinutes(duration)
    }];
  }

  // Activity spans multiple days
  let currentDate = new Date(impact.date);
  const endDate = new Date(nextImpact.date);

  while (currentDate < endDate) {
    const startOfSegment = currentDate.getTime();
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if this is the last segment
    const isLastSegment = endOfDay >= endDate;
    const endOfSegment = isLastSegment ? endDate.getTime() : endOfDay.getTime();

    const durationMs = endOfSegment - startOfSegment;

    result.push({
      day: getDayOfWeek(startOfSegment),
      durationMinutes: msToMinutes(durationMs)
    });

    if (isLastSegment) break;

    // Move to next day
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return result;
}

/**
 * Get start and end dates for a week (Monday to Sunday)
 */
export function getWeekDateRange(weekStart: string): { startDate: Date; endDate: Date } {
  // Parse the date string manually to avoid timezone issues
  const [year, month, day] = weekStart.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  endDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}
