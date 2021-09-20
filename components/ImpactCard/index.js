import {
  Line,
  Area,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
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
      if (impact === "stress") console.log(rawValue, { index });
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
    };
  });

  return (
    <div className="text-left p-5 bg-gray-800 rounded-md">
      <div className="bg-green-700"></div>
      <p className="text-2xl">{impact}</p>
      <ResponsiveContainer aspect={1.5} className="mt-3" height="auto">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="1%" stopColor="rgb(4, 120,87)" stopOpacity={0.9} />
              <stop offset="99%" stopColor="transparent" stopOpacity={100} />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            strokeLinecap="round"
            strokeWidth={3}
            style={{ strokeDasharray: "0.4 0.4" }}
            dataKey="value"
            stroke="#ffffff"
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
          <Tooltip className="bg-gray-600" content={<CustomTooltip />} />
          <ReferenceLine x={activityIndex} stroke="#D81B60" strokeWidth={3} />
        </ComposedChart>
      </ResponsiveContainer>
      {editMode && (
        <input
          type="text"
          className="w-full"
          placeholder="%"
          className="rounded-md w-full py-2 px-3 bg-gray-700 mt-5"
          onChange={onChange}
          value={impacts[activityIndex]?.[impact] || ""}
        />
      )}
    </div>
  );
}
