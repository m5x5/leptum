import {
  Line,
  Area,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { getNumberFromString } from "../../utils/parser";
import CustomTooltip from "./CustomTooltip";

// Configuration for impact metrics - should match pages/impact.js
const METRIC_CONFIG = {
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

export default function ImpactCard({
  impacts = [],
  activities,
  impact,
  onChange,
  activityIndex,
  currentActivityTimestamp,
  editMode,
}) {
  const metricConfig = METRIC_CONFIG[impact] || { min: 0, max: 100, allowsNegative: false };

  const data = activities.map((activity, index) => {
    let rawValue = impacts[index]?.[impact];
    // Use null for missing values so the chart doesn't draw lines through gaps
    let value = null;

    if (typeof rawValue !== "undefined" && rawValue !== "") {
      value = getNumberFromString(rawValue);
    }

    return {
      activity,
      value,
      timestamp: new Date(impacts[index]?.date || Date.now()).getTime(),
    };
  });

  const currentTimestamp = currentActivityTimestamp || Date.now();

  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // For bipolar metrics, create gradients for positive and negative areas
  const gradientIdPositive = `colorPositive-${impact}`;
  const gradientIdNegative = `colorNegative-${impact}`;

  return (
    <div className="text-left p-5 bg-card border border-border rounded-md">
      <p className="text-2xl text-foreground capitalize">{impact}</p>
      {metricConfig.allowsNegative && (
        <p className="text-xs text-muted-foreground mt-1">Bipolar scale: -100 (negative) to +100 (positive)</p>
      )}
      <ResponsiveContainer aspect={1.5} className="mt-3" height="auto">
        <ComposedChart data={data}>
          <defs>
            {metricConfig.allowsNegative ? (
              <>
                <linearGradient id={gradientIdPositive} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="1%" stopColor="rgb(34, 197, 94)" stopOpacity={0.9} />
                  <stop offset="99%" stopColor="transparent" stopOpacity={100} />
                </linearGradient>
                <linearGradient id={gradientIdNegative} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="1%" stopColor="rgb(239, 68, 68)" stopOpacity={0.9} />
                  <stop offset="99%" stopColor="transparent" stopOpacity={100} />
                </linearGradient>
              </>
            ) : (
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="1%" stopColor="rgb(4, 120,87)" stopOpacity={0.9} />
                <stop offset="99%" stopColor="transparent" stopOpacity={100} />
              </linearGradient>
            )}
          </defs>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxis}
            stroke="hsl(var(--muted-foreground))"
            hide={true}
          />
          <YAxis
            domain={[metricConfig.min, metricConfig.max]}
            stroke="hsl(var(--muted-foreground))"
            hide={true}
          />
          {metricConfig.allowsNegative && (
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="3 3" />
          )}
          <Line
            type="monotone"
            strokeLinecap="round"
            strokeWidth={3}
            style={{ strokeDasharray: "0.4 0.4" }}
            dataKey="value"
            stroke={metricConfig.allowsNegative ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
            dot={false}
            legendType="none"
            connectNulls={false}
          />
          {metricConfig.allowsNegative ? (
            // For bipolar metrics, we need to render two areas split at zero
            <>
              <Area
                type="monotone"
                dataKey={(d) => d.value >= 0 ? d.value : 0}
                stroke="none"
                fill={`url(#${gradientIdPositive})`}
                strokeWidth={3}
                fillOpacity={1}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey={(d) => d.value < 0 ? d.value : 0}
                stroke="none"
                fill={`url(#${gradientIdNegative})`}
                strokeWidth={3}
                fillOpacity={1}
                connectNulls={false}
              />
            </>
          ) : (
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="url(#colorUv)"
              strokeWidth={3}
              fillOpacity={1}
              connectNulls={false}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={currentTimestamp} stroke="#D81B60" strokeWidth={3} />
        </ComposedChart>
      </ResponsiveContainer>
      {editMode && (
        <input
          type="text"
          placeholder="%"
          className="rounded-md w-full py-2 px-3 bg-muted text-foreground mt-5"
          onChange={onChange}
          value={impacts[activityIndex]?.[impact] || ""}
        />
      )}
    </div>
  );
}
