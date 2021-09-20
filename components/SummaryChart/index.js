import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { getNumberFromString } from "../../utils/parser";
import distinctColors from "distinct-colors";
import { IMPACT_TYPES } from "../../utils";
import CustomTooltip from "./CustomTooltip";

const palette = distinctColors({
  count: 30,
  lightMin: 50,
  lightMax: 70,
  chromaMin: 50,
});

// Material Design Colors
palette.unshift(
  "#E53935",
  "#D81B60",
  "#8E24AA",
  "#5E35B1",
  "#3949AB",
  "#1E88E5",
  "#039BE5",
  "#00ACC1",
  "#00897B",
  "#43A047",
  "#7CB342",
  "#C0CA33",
  "#FDD835",
  "#FFB300",
  "#FB8C00",
  "#F4511E"
);

export default function SummaryChart({ impacts }) {
  impacts = impacts.map((impact, i) => {
    const newImpact = {};
    IMPACT_TYPES.forEach((type) => {
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
      <AreaChart data={impacts} className={"h-40"}>
        <Tooltip content={<CustomTooltip />} />
        {IMPACT_TYPES.map((type, i) => (
          <Area
            type="monotone"
            dataKey={type}
            fill={palette[i]}
            stackId="1"
            stroke="none"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
