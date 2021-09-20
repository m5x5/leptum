import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { getNumberFromString } from "../../utils/parser";
import distinctColors from "distinct-colors";
import { capitalize } from "../../utils";

const palette = distinctColors({
  count: 30,
  lightMin: 30,
  lightMax: 60,
  chromaMin: 50,
});

const IMPACT_TYPES = [
  "stress",
  "cleanliness",
  "motivation",
  "confidence",
  "happiness",
  "shame",
  "gratitude",
  "energy",
  "fulfillment",
  "guilt",
  "commitment",
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-lg">{label}</div>
        <div className="tooltip-content">
          <ul>
            {payload
              .filter((item) => +item.value)
              .reverse()
              .map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-start pt-1"
                >
                  <span
                    style={{ backgroundColor: item.fill }}
                    className="h-5 w-5 inline-block rounded-lg m-1"
                  ></span>
                  <span className="">
                    {capitalize(item.dataKey)}: {item.value}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    );
  }
  return null;
};

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
        <XAxis dataKey="activity" />
        <Tooltip content={<CustomTooltip />} />
        {IMPACT_TYPES.map((type, i) => (
          <Area
            type="monotone"
            dataKey={type}
            fill={palette[i]}
            stackId="1"
            stroke={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
