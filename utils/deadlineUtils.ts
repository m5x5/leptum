import { Goal, GoalMilestone } from './useGoals';

export interface DeadlineStatus {
  daysRemaining: number;
  isOverdue: boolean;
  isApproaching: boolean; // Within 7 days
  isUrgent: boolean; // Within 3 days
  label: string;
}

export function getDeadlineStatus(targetDate: number | undefined): DeadlineStatus | null {
  if (!targetDate) return null;

  const now = new Date();
  const target = new Date(targetDate);

  // Reset times to midnight for accurate day calculation
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining >= 0 && daysRemaining <= 3;
  const isApproaching = daysRemaining > 3 && daysRemaining <= 7;

  let label: string;
  if (isOverdue) {
    const overdueDays = Math.abs(daysRemaining);
    label = overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
  } else if (daysRemaining === 0) {
    label = 'Due today';
  } else if (daysRemaining === 1) {
    label = 'Due tomorrow';
  } else if (daysRemaining <= 7) {
    label = `${daysRemaining} days left`;
  } else if (daysRemaining <= 30) {
    const weeks = Math.floor(daysRemaining / 7);
    label = weeks === 1 ? '1 week left' : `${weeks} weeks left`;
  } else {
    const months = Math.floor(daysRemaining / 30);
    label = months === 1 ? '1 month left' : `${months} months left`;
  }

  return {
    daysRemaining,
    isOverdue,
    isApproaching,
    isUrgent,
    label
  };
}

export function formatDeadlineDate(targetDate: number | undefined): string {
  if (!targetDate) return '';

  const date = new Date(targetDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

export function dateToInputValue(timestamp: number | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

export function inputValueToTimestamp(value: string): number | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  date.setHours(23, 59, 59, 999); // Set to end of day
  return date.getTime();
}

export function getMilestoneProgress(milestones: GoalMilestone[] | undefined): {
  completed: number;
  total: number;
  percentage: number;
} {
  if (!milestones || milestones.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed = milestones.filter(m => m.completed).length;
  const total = milestones.length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

export function getNextMilestone(milestones: GoalMilestone[] | undefined): GoalMilestone | null {
  if (!milestones || milestones.length === 0) return null;

  // Sort by order and find first incomplete
  const sorted = [...milestones].sort((a, b) => a.order - b.order);
  return sorted.find(m => !m.completed) || null;
}

export function getUpcomingMilestones(milestones: GoalMilestone[] | undefined): GoalMilestone[] {
  if (!milestones || milestones.length === 0) return [];

  return milestones
    .filter(m => !m.completed && m.targetDate)
    .sort((a, b) => (a.targetDate || 0) - (b.targetDate || 0));
}

export function getOverdueMilestones(milestones: GoalMilestone[] | undefined): GoalMilestone[] {
  if (!milestones || milestones.length === 0) return [];

  const now = Date.now();
  return milestones.filter(m => !m.completed && m.targetDate && m.targetDate < now);
}

export function getGoalDeadlineStatusColor(status: DeadlineStatus | null): {
  text: string;
  bg: string;
  border: string;
} {
  if (!status) {
    return { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
  }

  if (status.isOverdue) {
    return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-800' };
  }

  if (status.isUrgent) {
    return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-800' };
  }

  if (status.isApproaching) {
    return { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-800' };
  }

  return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-800' };
}
