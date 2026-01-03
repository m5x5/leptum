import { capitalize } from "../../utils";
import { mentionsToPlainText } from "../ui/mention-input";

export default function CustomTooltip({ active, payload }) {
  if (!(active && payload && payload.length)) return null;

  return (
    <div className="bg-card border border-border p-4 rounded-lg">
      <div className="text-lg text-foreground">{mentionsToPlainText(payload[0].payload.activity)}</div>
      <div className="tooltip-content">
        <ul>
          {payload
            .filter((item) => +item.value)
            .sort((a, b) => b.value - a.value)
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-start pt-1"
              >
                <span
                  style={{ backgroundColor: item.stroke }}
                  className="h-5 w-5 inline-block rounded-lg m-1"
                ></span>
                <span className="text-foreground">
                  {capitalize(item.dataKey)}: {item.value}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
