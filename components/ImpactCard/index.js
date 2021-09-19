import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { getNumberFromString } from "../../utils/parser";

export default function ImpactCard({
  impacts = [],
  activities,
  impact,
  onChange,
}) {
  const data = activities.map((activity, index) => {
    let value = getNumberFromString(impacts[index]?.[impact]);

    if (!value || value !== 0) {
      if (impacts[index - 1]?.[impact]) {
        value = impacts[index - 1]?.[impact];
      }
    }
    return {
      activity,
      value,
    };
  });

  return (
    <div className="text-left p-5 bg-gray-800 rounded-md">
      <p className="text-2xl">{impact}</p>
      <ResponsiveContainer aspect={1.5} className="mt-3" height="auto">
        <LineChart data={data}>
          <Line
            type="monotone"
            stroke="#ffffff"
            dataKey="value"
            strokeWidth={3}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(75,85,99)",
              borderRadius: "5px",
              border: "none",
            }}
            className="bg-gray-600"
          />
        </LineChart>
      </ResponsiveContainer>
      <input
        type="text"
        className="w-full"
        placeholder="%"
        className="rounded-md w-full py-2 px-3 bg-gray-700 mt-5"
        onChange={onChange}
        value={impacts[impacts.length - 1]?.[impact] || ""}
      />
    </div>
  );
}
