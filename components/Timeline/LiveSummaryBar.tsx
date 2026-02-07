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
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ activity: string; time: string } | null>(null);

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

  // Calculate current time position for the red line indicator
  const getCurrentTimePercent = () => {
    if (!isTodayFlag || dayImpacts.length === 0) return null;

    // Get day start from the earliest activity
    const earliestActivity = dayImpacts[dayImpacts.length - 1];
    const dayStart = new Date(earliestActivity.date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(24, 0, 0, 0);

    const percent = ((currentTime - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())) * 100;
    return percent >= 0 && percent <= 100 ? percent : null;
  };

  const currentTimePercent = getCurrentTimePercent();

  // Handle mouse move over the bar
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;

    setHoverPercent(percent);

    // Calculate the time at this position
    if (dayImpacts.length === 0) {
      setHoverInfo(null);
      return;
    }

    const earliestActivity = dayImpacts[dayImpacts.length - 1];
    const dayStart = new Date(earliestActivity.date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(24, 0, 0, 0);

    const timeAtPosition = dayStart.getTime() + ((percent / 100) * (dayEnd.getTime() - dayStart.getTime()));

    // Find which activity this time falls into
    let activityAtPosition = "No activity";

    // dayImpacts are sorted newest first, so we iterate oldest to newest
    for (let i = dayImpacts.length - 1; i >= 0; i--) {
      const current = dayImpacts[i];
      let endTime: number;

      if (i === 0) {
        // Most recent activity extends to now (if today) or end of day
        endTime = isTodayFlag ? currentTime : dayEnd.getTime();
      } else {
        endTime = dayImpacts[i - 1].date;
      }

      if (timeAtPosition >= current.date && timeAtPosition <= endTime) {
        activityAtPosition = current.activity;
        break;
      }
    }

    // Format the time
    const date = new Date(timeAtPosition);
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    setHoverInfo({ activity: activityAtPosition, time: timeStr });
  };

  const handleMouseLeave = () => {
    setHoverPercent(null);
    setHoverInfo(null);
  };

  return (
    <div className="relative">
      <div
        className="relative flex h-8 rounded-lg overflow-hidden border border-border"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
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
        {/* Current time indicator - red line */}
        {currentTimePercent !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${currentTimePercent}%` }}
            title={`Current time`}
          />
        )}
        {/* Hover indicator line */}
        {hoverPercent !== null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/40 z-20 pointer-events-none"
            style={{ left: `${hoverPercent}%` }}
          />
        )}
      </div>
      {/* Hover tooltip */}
      {hoverPercent !== null && hoverInfo && (
        <div
          className="absolute top-full mt-1 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border whitespace-nowrap z-30 pointer-events-none"
          style={{ left: `${hoverPercent}%` }}
        >
          <div className="font-semibold">{hoverInfo.activity}</div>
          <div className="text-muted-foreground">{hoverInfo.time}</div>
        </div>
      )}
    </div>
  );
}
