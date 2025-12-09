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

export default function ImpactCard({
  impacts = [],
  activities,
  impact,
  onChange,
  activityIndex,
  editMode,
}) {
  const data = activities.map((activity, index) => {
    let rawValue = impacts[index]?.[impact];
    let value = getNumberFromString(impacts[index]?.[impact]);

    if (typeof rawValue === "undefined" || rawValue === "") {
      for (let i = index; 0 < i; i--) {
        let val = impacts[i - 1]?.[impact];
        if (typeof val !== "undefined" && val !== "") {
          value = getNumberFromString(val);
          break;
        }
      }
    }
    return {
      activity,
      value,
      timestamp: new Date(impacts[index]?.date || Date.now()).getTime(),
    };
  });

  const currentTimestamp = impacts[activityIndex]?.date
    ? new Date(impacts[activityIndex].date).getTime()
    : Date.now();

  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="text-left p-5 bg-card border border-border rounded-md">
      <div className="bg-green-700"></div>
      <p className="text-2xl text-foreground">{impact}</p>
      <ResponsiveContainer aspect={1.5} className="mt-3" height="auto">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="1%" stopColor="rgb(4, 120,87)" stopOpacity={0.9} />
              <stop offset="99%" stopColor="transparent" stopOpacity={100} />
            </linearGradient>
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
            domain={[0, 100]}
            stroke="hsl(var(--muted-foreground))"
            hide={true}
          />
          <Line
            type="monotone"
            strokeLinecap="round"
            strokeWidth={3}
            style={{ strokeDasharray: "0.4 0.4" }}
            dataKey="value"
            stroke="hsl(var(--foreground))"
            dot={false}
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill="url(#colorUv)"
            strokeWidth={3}
            fillOpacity={1}
          />
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
