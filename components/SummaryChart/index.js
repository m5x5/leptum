import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { getNumberFromString } from "../../utils/parser";
import distinctColors from "distinct-colors";
import CustomTooltip from "./CustomTooltip";
import { IMPACT_TYPES } from "../../utils";

const palette = distinctColors({
  count: 30,
  lightMin: 60,
  lightMax: 90,
  chromaMin: 50,
});

// Configuration for impact metrics - should match pages/impact.js
const METRIC_CONFIG = {
  stress: { min: 0, max: 100, allowsNegative: false },
  cleanliness: { min: 0, max: 100, allowsNegative: false },
  fulfillment: { min: 0, max: 100, allowsNegative: false },
  motivation: { min: 0, max: 100, allowsNegative: false },
  energy: { min: 0, max: 100, allowsNegative: false },
  focus: { min: 0, max: 100, allowsNegative: false },
  happiness: { min: -100, max: 100, allowsNegative: true },
  confidence: { min: -100, max: 100, allowsNegative: true },
};

// Material Design Colors

export default function SummaryChart({ impacts, selectedLines, dateFilter, currentActivityTimestamp }) {
  const chartData = impacts.map((impact, i) => {
    const newImpact = {};
    selectedLines.forEach((type) => {
      let value = null;

      // Only use actual values, don't fill from previous
      if (typeof impact[type] !== "undefined" && impact[type] !== "") {
        value = getNumberFromString(impact[type]);
      }
      newImpact[type] = value;
    });
    newImpact.activity = impact.activity;
    newImpact.date = impact.date || Date.now();
    newImpact.timestamp = new Date(impact.date || Date.now()).getTime();
    return newImpact;
  });

  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    // Show time for daily view, date for other views
    if (dateFilter === 'day') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Determine Y-axis domain based on selected metrics
  const hasNegativeMetrics = selectedLines.some(line => METRIC_CONFIG[line]?.allowsNegative);
  const yAxisDomain = hasNegativeMetrics ? [-100, 100] : [0, 100];

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
        {selectedLines.map((type, i) => (
          <Line
            key={type}
            type="monotone"
            dataKey={type}
            fill="none"
            stroke={palette[IMPACT_TYPES.indexOf(type)]}
            dot={false}
            strokeWidth={4}
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
