import { useState, useEffect } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { getNumberFromString } from "../../utils/parser";
import distinctColors from "distinct-colors";
import CustomTooltip from "./CustomTooltip";
import { IMPACT_TYPES } from "../../utils";
import type { Impact } from "../../utils/useImpacts";
import type { ChartPoint } from "./types";

const palette = distinctColors({
  count: 30,
  lightMin: 60,
  lightMax: 90,
  chromaMin: 50,
}).map((c) => c.hex());

interface MetricConfig {
  min: number;
  max: number;
  allowsNegative: boolean;
  showGradient: boolean;
  inverted: boolean;
}

// Configuration for impact metrics - should match app/impact/ImpactPageContent.tsx
const METRIC_CONFIG: Record<string, MetricConfig> = {
  // Positive metrics with red-green gradient (0 = red/bad, 100 = green/good)
  cleanliness: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  fulfillment: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  motivation: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  energy: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  focus: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: false },
  // Inverted metrics with green-red gradient (0 = green/good, 100 = red/bad)
  stress: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: true },
  shame: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: true },
  guilt: { min: 0, max: 100, allowsNegative: false, showGradient: true, inverted: true },
  // Bipolar metrics (-100 to 100) with red-green gradient
  happiness: { min: -100, max: 100, allowsNegative: true, showGradient: true, inverted: false },
  confidence: { min: -100, max: 100, allowsNegative: true, showGradient: true, inverted: false },
};

interface SummaryChartProps {
  impacts: Impact[];
  /** Metric keys to plot (see IMPACT_TYPES). */
  selectedLines: string[];
  dateFilter: string;
  currentActivityTimestamp?: number;
}

export default function SummaryChart({ impacts, selectedLines, dateFilter, currentActivityTimestamp }: SummaryChartProps) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
  }, []);

  const chartData: ChartPoint[] = impacts.map((impact) => {
    const fallbackTime = impact.date || now || 0;
    const point: ChartPoint = {
      activity: impact.activity,
      date: fallbackTime,
      timestamp: new Date(fallbackTime).getTime(),
    };
    const metrics = impact as unknown as Record<string, string | number | undefined>;
    selectedLines.forEach((type) => {
      // Only use actual values, don't fill from previous
      const raw = metrics[type];
      point[type] = raw !== undefined && raw !== "" ? getNumberFromString(raw) : null;
    });
    return point;
  });

  const formatXAxis = (timestamp: number): string => {
    const date = new Date(timestamp);
    // Show time for daily view, date for other views
    if (dateFilter === 'day') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Determine Y-axis domain based on selected metrics
  const hasNegativeMetrics = selectedLines.some((line) => METRIC_CONFIG[line]?.allowsNegative);
  const yAxisDomain: [number, number] = hasNegativeMetrics ? [-100, 100] : [0, 100];

  const colorFor = (type: string) => palette[(IMPACT_TYPES as readonly string[]).indexOf(type)];

  return (
    <ResponsiveContainer width="100%" height="auto" aspect={1.7}>
      <LineChart data={chartData} className={"h-40"}>
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatXAxis}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          domain={yAxisDomain}
        />
        {hasNegativeMetrics && (
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="3 3" />
        )}
        <Tooltip content={<CustomTooltip />} />
        {selectedLines.map((type) => (
          <Line
            key={type}
            type="monotone"
            dataKey={type}
            fill="none"
            stroke={colorFor(type)}
            dot={{ r: 6, strokeWidth: 2, fill: colorFor(type) }}
            activeDot={{ r: 8, strokeWidth: 2 }}
            strokeWidth={3}
            connectNulls={false}
          />
        ))}
        {currentActivityTimestamp && (
          <ReferenceLine
            x={currentActivityTimestamp}
            stroke="#D81B60"
            strokeWidth={2}
            strokeDasharray="3 3"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
