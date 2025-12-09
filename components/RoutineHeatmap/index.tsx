import { useMemo } from 'react';
import { RoutineCompletion } from '../../utils/useRoutineCompletions';

interface RoutineHeatmapProps {
  completions: RoutineCompletion[];
  routineId?: string;
  months?: number; // Number of months to show, default 12
}

export default function RoutineHeatmap({ completions, routineId, months = 12 }: RoutineHeatmapProps) {
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

    // Generate calendar grid for the last N months
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);

    const weeks: Array<Array<{ date: Date; count: number; dateKey: string }>> = [];
    let currentWeek: Array<{ date: Date; count: number; dateKey: string }> = [];

    // Start from the first day of the start month
    const currentDate = new Date(startDate);

    // Add empty cells for days before the first day of the week
    const firstDayOfWeek = currentDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: new Date(0), count: 0, dateKey: '' });
    }

    // Generate all days
    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const count = completionsByDate[dateKey] || 0;

      currentWeek.push({
        date: new Date(currentDate),
        count,
        dateKey
      });

      if (currentDate.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add the last incomplete week if it exists
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return { weeks, completionsByDate };
  }, [completions, routineId, months]);

  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-muted/30';
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

  return (
    <div className="space-y-4">
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

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {/* Day labels */}
          <div className="flex gap-1 mb-1">
            <div className="w-6"></div>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="w-3 text-xs text-muted-foreground text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {heatmapData.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1 items-center">
              {/* Week number or month label */}
              <div className="w-6 text-xs text-muted-foreground">
                {weekIndex % 4 === 0 && week[0].date.getTime() > 0 ? (
                  week[0].date.toLocaleDateString('en-US', { month: 'short' })
                ) : ''}
              </div>

              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-3 h-3 rounded-sm ${
                    day.dateKey ? getColorIntensity(day.count) : 'bg-transparent'
                  }`}
                  title={
                    day.dateKey
                      ? `${formatDate(day.date)}: ${day.count} completion${day.count !== 1 ? 's' : ''}`
                      : ''
                  }
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
