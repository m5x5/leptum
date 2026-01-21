import { ClockIcon, ExclamationCircleIcon } from '@heroicons/react/solid';
import { getDeadlineStatus, getGoalDeadlineStatusColor, formatDeadlineDate, DeadlineStatus } from '../../utils/deadlineUtils';

interface DeadlineIndicatorProps {
  targetDate?: number;
  compact?: boolean;
  showDate?: boolean;
}

export function DeadlineIndicator({ targetDate, compact = false, showDate = true }: DeadlineIndicatorProps) {
  if (!targetDate) return null;

  const status = getDeadlineStatus(targetDate);
  if (!status) return null;

  const colors = getGoalDeadlineStatusColor(status);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${colors.text}`}>
        {status.isOverdue ? (
          <ExclamationCircleIcon className="w-3.5 h-3.5" />
        ) : (
          <ClockIcon className="w-3.5 h-3.5" />
        )}
        <span>{status.label}</span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
      {status.isOverdue ? (
        <ExclamationCircleIcon className="w-4 h-4" />
      ) : (
        <ClockIcon className="w-4 h-4" />
      )}
      <span>{status.label}</span>
      {showDate && (
        <span className="opacity-75">({formatDeadlineDate(targetDate)})</span>
      )}
    </div>
  );
}

interface DeadlineCountdownProps {
  targetDate?: number;
  className?: string;
}

export function DeadlineCountdown({ targetDate, className = '' }: DeadlineCountdownProps) {
  if (!targetDate) return null;

  const status = getDeadlineStatus(targetDate);
  if (!status) return null;

  const colors = getGoalDeadlineStatusColor(status);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`text-3xl font-bold ${colors.text}`}>
        {status.isOverdue ? `-${Math.abs(status.daysRemaining)}` : status.daysRemaining}
      </div>
      <div className={`text-xs uppercase tracking-wider ${colors.text}`}>
        {Math.abs(status.daysRemaining) === 1 ? 'day' : 'days'}
      </div>
      <div className={`text-xs mt-1 ${status.isOverdue ? colors.text : 'text-muted-foreground'}`}>
        {status.isOverdue ? 'overdue' : 'remaining'}
      </div>
    </div>
  );
}

export default DeadlineIndicator;
