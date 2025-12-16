import { useState, useEffect } from "react";

interface ActivitySummary {
  activity: string;
  totalDuration: number;
  percentage: number;
  color: string;
  startTime?: number;
}

interface Impact {
  activity: string;
  date: number;
  goalId?: string;
  [key: string]: any;
}

interface LiveSummaryBarProps {
  dayImpacts: Impact[];
  isTodayFlag: boolean;
  getDurationInMs: (startTime: number, endTime: number) => number;
  getActivityColor: (impact: Impact) => string;
}

export function LiveSummaryBar({
  dayImpacts,
  isTodayFlag,
  getDurationInMs,
  getActivityColor,
}: LiveSummaryBarProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Only update if this is today
    if (!isTodayFlag) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isTodayFlag]);

  const calculateDaySummary = (): ActivitySummary[] => {
    const activityDurations: { [key: string]: number } = {};
    let totalDayDuration = 0;

    // dayImpacts are sorted in descending order (most recent first)
    for (let i = dayImpacts.length - 1; i >= 0; i--) {
      const current = dayImpacts[i];
      let endTime: number;

      if (i === 0) {
        // This is the most recent activity
        if (isTodayFlag) {
          // For today's most recent activity, duration goes until now
          endTime = currentTime;
        } else {
          // For past days, duration goes until end of day
          const dayEnd = new Date(current.date);
          dayEnd.setHours(24, 0, 0, 0);
          endTime = dayEnd.getTime();
        }
      } else {
        // Duration goes until the next activity
        endTime = dayImpacts[i - 1].date;
      }

      const duration = getDurationInMs(current.date, endTime);

      if (!activityDurations[current.activity]) {
        activityDurations[current.activity] = 0;
      }
      activityDurations[current.activity] += duration;
      totalDayDuration += duration;
    }

    // Always use 24 hours for percentage calculation
    const fullDayInMs = 24 * 60 * 60 * 1000;

    // Convert to summary array with percentages
    const summaries: ActivitySummary[] = Object.entries(activityDurations).map(
      ([activity, duration]) => {
        const impact = dayImpacts.find(i => i.activity === activity);
        return {
          activity,
          totalDuration: duration,
          percentage: (duration / fullDayInMs) * 100,
          color: impact ? getActivityColor(impact) : "bg-gray-400",
          startTime: impact?.date || 0,
        };
      }
    );

    // Sort by start time (earliest first)
    summaries.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

    return summaries;
  };

  const daySummary = calculateDaySummary();
  const totalPercentageFilled = daySummary.reduce((sum, s) => sum + s.percentage, 0);
  const emptyPercentage = isTodayFlag ? Math.max(0, 100 - totalPercentageFilled) : 0;

  return (
    <div className="flex h-8 rounded-lg overflow-hidden border border-border">
      {daySummary.map((summary, idx) => (
        <div
          key={`${summary.activity}-${idx}`}
          className={`${summary.color} flex items-center justify-center text-xs text-white font-medium border-r border-background/30`}
          style={{
            width: `${summary.percentage}%`,
            borderRightWidth: idx === daySummary.length - 1 && emptyPercentage === 0 ? '0' : '2px'
          }}
          title={`${summary.activity}: ${summary.percentage.toFixed(1)}%`}
        >
          {summary.percentage > 8 && (
            <span className="px-1">
              {summary.percentage.toFixed(0)}%
            </span>
          )}
        </div>
      ))}
      {emptyPercentage > 0 && (
        <div
          className="bg-muted/30 flex items-center justify-center"
          style={{ width: `${emptyPercentage}%` }}
          title="Future time"
        ></div>
      )}
    </div>
  );
}
