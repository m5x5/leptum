import { useMemo } from 'react';
import { RoutineCompletion } from '../../utils/useRoutineCompletions';

interface RoutineHeatmapProps {
  completions: RoutineCompletion[];
  routineId?: string;
  /** Number of months to show (default 12) */
  months?: number;
  /** When true, hide title and subtitle for embedding in cards */
  compact?: boolean;
}

export default function RoutineHeatmap({ completions, routineId, months = 12, compact = false }: RoutineHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Filter completions by routine if specified
    const filteredCompletions = routineId
      ? completions.filter(c => c.routineId === routineId)
      : completions;

    // Group completions by date
    const completionsByDate: { [key: string]: number } = {};
    filteredCompletions.forEach(completion => {
      const date = new Date(completion.completedAt);
      const dateKey = date.toISOString().split('T')[0];
      completionsByDate[dateKey] = (completionsByDate[dateKey] || 0) + 1;
    });

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const rangeStart = new Date(today.getFullYear(), today.getMonth() - months, 1);
    rangeStart.setHours(0, 0, 0, 0);

    // Week = Mon–Sun. Monday on or before rangeStart, Sunday on or after today
    const firstMonday = new Date(rangeStart);
    const daysBackToMonday = (rangeStart.getDay() + 6) % 7;
    firstMonday.setDate(firstMonday.getDate() - daysBackToMonday);
    firstMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(today);
    lastSunday.setDate(lastSunday.getDate() + (7 - lastSunday.getDay()) % 7);
    lastSunday.setHours(23, 59, 59, 999);

    // Build columns: each column is one week (7 rows: Mon..Sun)
    const weeks: Array<Array<{ date: Date; count: number; dateKey: string; inRange: boolean } | null>> = [];
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    let weekStart = new Date(firstMonday);
    while (weekStart <= lastSunday) {
      const week: Array<{ date: Date; count: number; dateKey: string; inRange: boolean } | null> = [];
      for (let dow = 0; dow < 7; dow++) {
        const date = new Date(weekStart.getTime());
        date.setDate(date.getDate() + dow);
        const dateKey = date.toISOString().split('T')[0];
        const inRange = date >= rangeStart && date <= today;
        if (!inRange) {
          week.push(null);
        } else {
          const count = date <= today ? (completionsByDate[dateKey] || 0) : -1;
          week.push({ date: new Date(date), count, dateKey, inRange: true });
        }
      }
      weeks.push(week);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    const monthLabel = rangeStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ' – ' + today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return { weeks, dayLabels, monthLabel, completionsByDate };
  }, [completions, routineId, months]);

  const getColorIntensity = (count: number) => {
    if (count < 0) return 'bg-muted/30'; // future day
    if (count === 0) return 'bg-muted/50';
    if (count === 1) return 'bg-green-300 dark:bg-green-900';
    if (count === 2) return 'bg-green-400 dark:bg-green-800';
    if (count === 3) return 'bg-green-500 dark:bg-green-700';
    return 'bg-green-600 dark:bg-green-600';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalCompletions = Object.values(heatmapData.completionsByDate).reduce((sum, count) => sum + count, 0);
  const daysWithCompletions = Object.keys(heatmapData.completionsByDate).length;

  const getCellClass = (cell: { count: number } | null) => {
    if (cell === null) return 'bg-muted/30'; // outside range: subtle fill so row is fully filled
    return getColorIntensity(cell.count);
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Completion History</h3>
            <p className="text-sm text-muted-foreground">
              {totalCompletions} completions over {daysWithCompletions} days
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
          {/* Rows: each row = one day of week (M–S), each column = a week; no column numbers */}
          {heatmapData.dayLabels.map((label, rowIndex) => (
            <div key={label + rowIndex} className="flex items-center gap-0.5">
              <span className="w-6 text-[10px] text-muted-foreground shrink-0">{label}</span>
              <div className="flex gap-0.5">
                {heatmapData.weeks.map((week, colIndex) => {
                  const cell = week[rowIndex];
                  const isEmpty = !cell || cell.count < 1;
                  return (
                    <div
                      key={colIndex}
                      className={`box-border w-3 h-3 rounded-sm shrink-0 ${isEmpty ? 'border border-muted/55' : ''} ${getCellClass(cell)}`}
                      title={
                        cell?.dateKey
                          ? cell.count >= 0
                            ? `${formatDate(cell.date)}: ${cell.count} completion${cell.count !== 1 ? 's' : ''}`
                            : `${formatDate(cell.date)} (future)`
                          : undefined
                      }
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
}
