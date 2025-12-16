import { useEffect, useState, useMemo } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';
import {
  Impact,
  DayOfWeek,
  getImpactsInRange,
  calculateImpactDuration,
  getDayOfWeek,
  msToMinutes,
  splitMidnightActivity,
  getWeekDateRange,
  isToday,
  isSameDay
} from './timeCalculations';

export interface ActivityInfo {
  activityName: string;
  startTime: number;
  durationMinutes: number;
  day: DayOfWeek;
}

export interface DailyBreakdown {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface GoalTimeBreakdown {
  goalId: string;
  goalName: string;
  goalColor: string;
  totalMinutes: number;
  dailyBreakdown: DailyBreakdown;
  activities: ActivityInfo[];
}

export interface UncategorizedTimeBreakdown {
  totalMinutes: number;
  dailyBreakdown: DailyBreakdown;
  activities: ActivityInfo[];
}

interface Goal {
  id: string;
  name: string;
  color?: string;
}

export function useWeeklyGoalTimeTracking(weekStart: string, goals: Goal[] | null) {
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadImpacts();

    const handleChange = (event: any) => {
      if (event.relativePath === 'impacts') {
        loadImpacts();
      }
    };

    remoteStorageClient.onChange(handleChange);
  }, [weekStart]);

  const loadImpacts = async () => {
    try {
      setIsLoading(true);
      const allImpacts = await remoteStorageClient.getImpacts();
      setImpacts(allImpacts || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load impacts:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const { goalTimeBreakdowns, uncategorizedTime, totalTrackedMinutes } = useMemo(() => {
    if (!impacts.length) {
      return {
        goalTimeBreakdowns: [],
        uncategorizedTime: {
          totalMinutes: 0,
          dailyBreakdown: {
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0
          },
          activities: []
        },
        totalTrackedMinutes: 0
      };
    }

    // Get impacts for the week
    const { startDate, endDate } = getWeekDateRange(weekStart);
    const weekImpacts = getImpactsInRange(impacts, startDate, endDate);

    // Sort impacts chronologically (oldest first for duration calculation)
    const sortedImpacts = [...weekImpacts].sort((a, b) => a.date - b.date);

    // Group impacts by goalId
    const impactsByGoal = new Map<string, Impact[]>();
    const uncategorizedImpacts: Impact[] = [];

    sortedImpacts.forEach(impact => {
      if (impact.goalId) {
        if (!impactsByGoal.has(impact.goalId)) {
          impactsByGoal.set(impact.goalId, []);
        }
        impactsByGoal.get(impact.goalId)!.push(impact);
      } else {
        uncategorizedImpacts.push(impact);
      }
    });

    // Calculate time breakdowns for each goal
    const goalBreakdowns: GoalTimeBreakdown[] = [];

    impactsByGoal.forEach((goalImpacts, goalId) => {
      const goal = goals?.find(g => g.id === goalId);
      const goalName = goal?.name || 'Unknown Goal';
      const goalColor = goal?.color || 'gray';

      const dailyBreakdown: DailyBreakdown = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0
      };

      const activities: ActivityInfo[] = [];
      let totalMinutes = 0;

      // Calculate duration for each impact
      goalImpacts.forEach((impact) => {
        // Find the next impact across ALL impacts (not just for this goal)
        // This ensures we stop counting when another activity starts, even if it's a different goal
        const impactIndex = sortedImpacts.findIndex(i => i === impact);
        const nextImpact = impactIndex < sortedImpacts.length - 1 ? sortedImpacts[impactIndex + 1] : null;

        // Check if impact spans midnight
        const daySegments = splitMidnightActivity(impact, nextImpact);

        daySegments.forEach(segment => {
          dailyBreakdown[segment.day] += segment.durationMinutes;
          totalMinutes += segment.durationMinutes;
        });

        // Add activity info (use primary day for activity listing)
        const primaryDay = getDayOfWeek(impact.date);
        const durationMs = calculateImpactDuration(impact, nextImpact, isToday(impact.date));

        activities.push({
          activityName: impact.activity,
          startTime: impact.date,
          durationMinutes: msToMinutes(durationMs),
          day: primaryDay
        });
      });

      goalBreakdowns.push({
        goalId,
        goalName,
        goalColor,
        totalMinutes,
        dailyBreakdown,
        activities
      });
    });

    // Calculate uncategorized time
    const uncategorizedDailyBreakdown: DailyBreakdown = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0
    };

    const uncategorizedActivities: ActivityInfo[] = [];
    let uncategorizedTotalMinutes = 0;

    uncategorizedImpacts.forEach((impact, index) => {
      // Find the next impact across ALL impacts (not just uncategorized)
      const impactIndex = sortedImpacts.findIndex(i => i === impact);
      const nextImpact = impactIndex < sortedImpacts.length - 1 ? sortedImpacts[impactIndex + 1] : null;

      const daySegments = splitMidnightActivity(impact, nextImpact);

      daySegments.forEach(segment => {
        uncategorizedDailyBreakdown[segment.day] += segment.durationMinutes;
        uncategorizedTotalMinutes += segment.durationMinutes;
      });

      const primaryDay = getDayOfWeek(impact.date);
      const durationMs = calculateImpactDuration(impact, nextImpact, isToday(impact.date));

      uncategorizedActivities.push({
        activityName: impact.activity,
        startTime: impact.date,
        durationMinutes: msToMinutes(durationMs),
        day: primaryDay
      });
    });

    // Calculate total tracked minutes
    const total = goalBreakdowns.reduce((sum, g) => sum + g.totalMinutes, 0) + uncategorizedTotalMinutes;

    // Sort goal breakdowns by total time (descending)
    goalBreakdowns.sort((a, b) => b.totalMinutes - a.totalMinutes);

    return {
      goalTimeBreakdowns: goalBreakdowns,
      uncategorizedTime: {
        totalMinutes: uncategorizedTotalMinutes,
        dailyBreakdown: uncategorizedDailyBreakdown,
        activities: uncategorizedActivities
      },
      totalTrackedMinutes: total
    };
  }, [impacts, weekStart, goals]);

  return {
    goalTimeBreakdowns,
    uncategorizedTime,
    totalTrackedMinutes,
    isLoading,
    error,
    refreshData: loadImpacts
  };
}
