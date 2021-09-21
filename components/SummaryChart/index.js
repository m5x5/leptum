import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { getNumberFromString } from "../../utils/parser";
import distinctColors from "distinct-colors";
import CustomTooltip from "./CustomTooltip";
import { IMPACT_TYPES } from "../../utils";

const palette = distinctColors({
  count: 30,
  lightMin: 50,
  lightMax: 70,
  chromaMin: 50,
});

// Material Design Colors
palette.unshift(
  "#00429d",
  "#2e59a8",
  "#4771b2",
  "#5d8abd",
  "#73a2c6",
  "#8abccf",
  "#a5d5d8",
  "#c5eddf",
  "#ffdec7",
  "#ffbcaf",
  "#ff9895",
  "#f4777f",
  "#e4576b",
  "#cf3759",
  "#b41648",
  "#93003a"
);

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
      <AreaChart data={impacts} className={"h-40"}>
        <Tooltip content={<CustomTooltip />} />
        {selectedLines.map((type, i) => (
          <Area
            type="monotone"
            dataKey={type}
            fill={palette[IMPACT_TYPES.indexOf(type)]}
            stackId="1"
            stroke="none"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
