import { useMemo } from 'react';
import { Impact } from '../../utils/timeCalculations';

interface DailyActivityBarProps {
  dateKey: string;
  impacts: Impact[];
  goals: Array<{ id: string; name: string; color?: string }> | null;
}

interface ActivitySegment {
  activity: string;
  color: string;
  startTime: number;
  endTime: number;
  startPercent: number;
  widthPercent: number;
}

export function DailyActivityBar({ dateKey, impacts, goals }: DailyActivityBarProps) {
  const segments = useMemo(() => {
    // Filter impacts for this specific day
    const [year, month, day] = dateKey.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    const fullDayInMs = dayEnd - dayStart;

    const dayImpacts = impacts
      .filter(impact => {
        const impactDate = new Date(impact.date);
        return (
          impactDate.getFullYear() === year &&
          impactDate.getMonth() === month - 1 &&
          impactDate.getDate() === day
        );
      })
      .sort((a, b) => a.date - b.date); // Sort chronologically

    if (dayImpacts.length === 0) return [];

    const getActivityColor = (impact: Impact) => {
      if (impact.goalId && goals) {
        const goal = goals.find(g => g.id === impact.goalId);
        if (goal?.color) return goal.color;
      }
      return 'bg-gray-400';
    };

    const formatTime = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    // Build timeline segments with actual positions
    const segments: ActivitySegment[] = [];

    for (let i = 0; i < dayImpacts.length; i++) {
      const current = dayImpacts[i];
      let endTime: number;

      if (i === dayImpacts.length - 1) {
        // Last activity goes until end of day
        endTime = dayEnd;
      } else {
        // Duration goes until the next activity
        endTime = dayImpacts[i + 1].date;
      }

      const startPercent = ((current.date - dayStart) / fullDayInMs) * 100;
      const widthPercent = ((endTime - current.date) / fullDayInMs) * 100;

      segments.push({
        activity: current.activity,
        color: getActivityColor(current),
        startTime: current.date,
        endTime: endTime,
        startPercent,
        widthPercent,
      });
    }

    return segments;
  }, [dateKey, impacts, goals]);

  if (segments.length === 0) return null;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="mb-3">
      <div className="text-xs text-muted-foreground mb-1">Daily Activity</div>
      <div className="relative w-full rounded overflow-hidden border border-border bg-muted/20 flex flex-col h-[300px]">
        {segments.map((segment, idx) => (
          <div
            key={`${segment.activity}-${idx}`}
            className={`${segment.color} flex items-start justify-start text-xs text-white font-medium ${
              idx < segments.length - 1 ? 'border-b border-background/50' : ''
            }`}
            style={{
              height: `${segment.widthPercent}%`,
            }}
            title={`${segment.activity}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
          >
            {segment.widthPercent > 3 && (
              <span className="px-2 pt-1 truncate text-[10px] leading-tight">
                {segment.activity}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
