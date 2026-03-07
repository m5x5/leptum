import { memo, useMemo } from 'react';
import { RoutineCompletion } from '../../utils/useRoutineCompletions';

interface RoutineHeatmapProps {
  completions: RoutineCompletion[];
  /** Number of months to show (default 12, or 3 when compact) */
  months?: number;
  /** When true, hide title and subtitle for embedding in cards */
  compact?: boolean;
}

function toUtcDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

const RoutineHeatmap = memo(function RoutineHeatmap({ completions, months, compact = false }: RoutineHeatmapProps) {
  const resolvedMonths = months ?? (compact ? 3 : 12);

  const heatmapData = useMemo(() => {
    // Group completions by UTC date
    const completionsByDate: { [key: string]: number } = {};
    for (const c of completions) {
      const key = toUtcDateKey(c.completedAt);
      completionsByDate[key] = (completionsByDate[key] || 0) + 1;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const rangeStart = new Date(today.getFullYear(), today.getMonth() - resolvedMonths, 1);
    rangeStart.setHours(0, 0, 0, 0);

    const firstMonday = new Date(rangeStart);
    const daysBackToMonday = (rangeStart.getDay() + 6) % 7;
    firstMonday.setDate(firstMonday.getDate() - daysBackToMonday);
    firstMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(today);
    lastSunday.setDate(lastSunday.getDate() + (7 - lastSunday.getDay()) % 7);
    lastSunday.setHours(23, 59, 59, 999);

    const getColorIntensity = (count: number) => {
      if (count < 0) return 'bg-muted/30';
      if (count === 0) return 'bg-muted/50';
      if (count === 1) return 'bg-green-300 dark:bg-green-900';
      if (count === 2) return 'bg-green-400 dark:bg-green-800';
      if (count === 3) return 'bg-green-500 dark:bg-green-700';
      return 'bg-green-600 dark:bg-green-600';
    };

    const weeks: Array<Array<{ className: string } | null>> = [];
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const rangeStartMs = rangeStart.getTime();
    const todayMs = today.getTime();
    const DAY_MS = 86400000;

    let totalCompletions = 0;
    let daysWithCompletions = 0;

    let weekStartMs = firstMonday.getTime();
    const lastSundayMs = lastSunday.getTime();
    while (weekStartMs <= lastSundayMs) {
      const week: Array<{ className: string } | null> = [];
      for (let dow = 0; dow < 7; dow++) {
        const dayMs = weekStartMs + dow * DAY_MS;
        const inRange = dayMs >= rangeStartMs && dayMs <= todayMs;
        if (!inRange) {
          week.push(null);
        } else {
          const key = toUtcDateKey(dayMs);
          const count = completionsByDate[key] || 0;
          const isEmpty = count < 1;
          week.push({ className: `box-border w-3 h-3 rounded-sm shrink-0 ${isEmpty ? 'border border-muted/55 ' : ''}${getColorIntensity(count)}` });
        }
      }
      weeks.push(week);
      weekStartMs += 7 * DAY_MS;
    }

    for (const count of Object.values(completionsByDate)) {
      totalCompletions += count;
      daysWithCompletions++;
    }

    const monthLabel = rangeStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ' – ' + today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return { weeks, dayLabels, monthLabel, totalCompletions, daysWithCompletions };
  }, [completions, resolvedMonths]);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Completion History</h3>
            <p className="text-sm text-muted-foreground">
              {heatmapData.totalCompletions} completions over {heatmapData.daysWithCompletions} days
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/30"></div>
              <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-900"></div>
              <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-800"></div>
              <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-700"></div>
              <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-600"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      )}

      <div className="w-full min-w-0 overflow-x-hidden flex justify-end">
        <div className="inline-flex flex-col gap-0.5 shrink-0">
          {heatmapData.dayLabels.map((label, rowIndex) => (
            <div key={label + rowIndex} className="flex items-center gap-0.5">
              <span className="w-6 text-[10px] text-muted-foreground shrink-0">{label}</span>
              <div className="flex gap-0.5">
                {heatmapData.weeks.map((week, colIndex) => {
                  const cell = week[rowIndex];
                  return (
                    <div
                      key={colIndex}
                      className={cell ? cell.className : 'box-border w-3 h-3 rounded-sm shrink-0 bg-muted/30'}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default RoutineHeatmap;
