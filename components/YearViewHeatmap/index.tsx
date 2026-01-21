import { useMemo } from 'react';
import { RoutineCompletion } from '../../utils/useRoutineCompletions';

interface YearViewHeatmapProps {
  completions: RoutineCompletion[];
  routineId: string;
  routineName: string;
}

export default function YearViewHeatmap({ completions, routineId, routineName }: YearViewHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Filter completions for this routine
    const routineCompletions = completions.filter(c => c.routineId === routineId);

    // Group completions by date
    const completionsByDate: { [key: string]: number } = {};
    routineCompletions.forEach(completion => {
      const date = new Date(completion.completedAt);
      const dateKey = date.toISOString().split('T')[0];
      completionsByDate[dateKey] = (completionsByDate[dateKey] || 0) + 1;
    });

    // Generate calendar grid for the current year
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1); // January 1st of current year
    const yearEnd = new Date(today.getFullYear(), 11, 31); // December 31st of current year

    const weeks: Array<Array<{ date: Date; count: number; dateKey: string }>> = [];
    let currentWeek: Array<{ date: Date; count: number; dateKey: string }> = [];

    // Start from the first day of the year
    const currentDate = new Date(yearStart);

    // Add empty cells for days before the first day of the week
    const firstDayOfWeek = currentDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: new Date(0), count: 0, dateKey: '' });
    }

    // Generate all days of the year
    while (currentDate <= yearEnd) {
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
      // Fill remaining days of the week with empty cells
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), count: 0, dateKey: '' });
      }
      weeks.push(currentWeek);
    }

    return { weeks, completionsByDate, yearStart, yearEnd };
  }, [completions, routineId]);

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
    <div className="flex-shrink-0 w-full md:w-[600px] space-y-3 bg-muted/20 rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{routineName}</h3>
          <p className="text-xs text-muted-foreground">
            {totalCompletions} completion{totalCompletions !== 1 ? 's' : ''} over {daysWithCompletions} day{daysWithCompletions !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* Day labels */}
          <div className="flex gap-1 mb-1">
            <div className="w-8 flex-shrink-0"></div>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="w-3 text-xs text-muted-foreground text-center flex-shrink-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {heatmapData.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1 items-center">
              {/* Month label - show at start of each month */}
              <div className="w-8 text-xs text-muted-foreground flex-shrink-0">
                {week.find(day => day.dateKey && new Date(day.dateKey).getDate() === 1) ? (
                  new Date(week.find(day => day.dateKey)!.dateKey).toLocaleDateString('en-US', { month: 'short' })
                ) : ''}
              </div>

              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-3 h-3 rounded-sm flex-shrink-0 ${
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

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
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
  );
}
