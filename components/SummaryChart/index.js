import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
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
  impacts = impacts.map((impact, i) => {
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
    return newImpact;
  });

  return (
    <ResponsiveContainer width="100%" height="auto" aspect={1.7}>
      <LineChart data={impacts} className={"h-40"}>
        <Tooltip content={<CustomTooltip />} />
        {selectedLines.map((type, i) => (
          <Line
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
