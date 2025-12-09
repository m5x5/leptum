import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

// Material Design Colors

export default function SummaryChart({ impacts, selectedLines }) {
  const chartData = impacts.map((impact, i) => {
    const newImpact = {};
    selectedLines.forEach((type) => {
      let value = getNumberFromString(impact[type]);

      // If the value doesn't exist take the value of the previous one
      if (!value) {
        if (impacts[i - 1]?.[type]) {
          value = getNumberFromString(impacts[i - 1][type]);
        }
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
          domain={[0, 100]}
        />
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
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
