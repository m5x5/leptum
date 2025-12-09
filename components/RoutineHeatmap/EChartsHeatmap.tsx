import { useMemo, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import { RoutineCompletion } from '../../utils/useRoutineCompletions';

interface EChartsHeatmapProps {
  completions: RoutineCompletion[];
  routineId?: string;
  months?: number;
}

export default function EChartsHeatmap({ completions, routineId, months = 12 }: EChartsHeatmapProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isDark = mounted && (theme === 'dark' || (theme === 'system' && systemTheme === 'dark'));

  const option = useMemo(() => {
    // Filter completions by routine if specified
    const filteredCompletions = routineId
      ? completions.filter(c => c.routineId === routineId)
      : completions;

    // Group completions by date and count them
    const completionsByDate: { [key: string]: number } = {};
    filteredCompletions.forEach(completion => {
      const date = new Date(completion.completedAt);
      const dateKey = date.toISOString().split('T')[0];
      completionsByDate[dateKey] = (completionsByDate[dateKey] || 0) + 1;
    });

    // Convert to array format for ECharts [[date, count], ...]
    const data = Object.entries(completionsByDate).map(([date, count]) => [date, count]);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    const displayMonths = isMobile ? 1 : months;
    startDate.setMonth(startDate.getMonth() - displayMonths);

    // Calculate max value for color scale
    const maxValue = Math.max(...Object.values(completionsByDate), 1);

    // Color schemes for light and dark mode
    const colors = isDark
      ? ['#0d1117', '#0e4429', '#006d32', '#26a641', '#39d353'] // Dark mode - darker greens
      : ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']; // Light mode - GitHub greens

    const textColor = isDark ? '#c9d1d9' : '#24292f';
    const bgColor = isDark ? '#020817' : '#ffffff'; // Use actual background color from CSS variables
    const borderColor = bgColor; // Borders match background
    const splitLineColor = bgColor; // Split lines also match background
    const emptyCellColor = isDark ? '#0e1621' : '#ebedf0';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: isDark ? '#161b22' : '#ffffff',
        borderColor: isDark ? '#30363d' : '#d0d7de',
        textStyle: {
          color: textColor
        },
        formatter: (params: any) => {
          const date = new Date(params.value[0]);
          const count = params.value[1];
          return `${date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}<br/>Completions: ${count}`;
        }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        show: false,
        inRange: {
          color: colors
        }
      },
      calendar: {
        top: 20,
        left: 40,
        right: 40,
        cellSize: ['auto', 14],
        range: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
        itemStyle: {
          borderWidth: 2,
          borderColor: borderColor,
          borderRadius: 2,
          color: emptyCellColor
        },
        yearLabel: {
          show: false
        },
        monthLabel: {
          nameMap: 'en',
          fontSize: 12,
          color: textColor
        },
        dayLabel: {
          nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          fontSize: 12,
          color: textColor
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: splitLineColor,
            width: 1,
            type: 'solid'
          }
        }
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: data,
          label: {
            show: false
          },
          itemStyle: {
            borderColor: borderColor,
            borderWidth: 1,
            borderRadius: 2
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
            }
          }
        }
      ]
    };
  }, [completions, routineId, months, isDark, isMobile]);

  const totalCompletions = completions.filter(c => !routineId || c.routineId === routineId).length;
  const uniqueDays = new Set(
    completions
      .filter(c => !routineId || c.routineId === routineId)
      .map(c => new Date(c.completedAt).toISOString().split('T')[0])
  ).size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Completion History</h3>
          <p className="text-sm text-muted-foreground">
            {totalCompletions} completions over {uniqueDays} days
          </p>
        </div>
      </div>

      <ReactECharts
        option={option}
        style={{ height: '140px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
