import { capitalize } from "../../utils";
import { mentionsToPlainText } from "../ui/mention-input";
import type { ChartPoint } from "./types";

/** The subset of recharts' tooltip payload entry we read. */
interface TooltipItem {
  id?: string | number;
  dataKey?: string | number;
  value?: number | string | null;
  stroke?: string;
  payload?: ChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
}

export default function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!(active && payload && payload.length)) return null;

  return (
    <div className="bg-card border border-border p-4 rounded-control">
      <div className="text-lg text-foreground">{mentionsToPlainText(payload[0].payload?.activity ?? "")}</div>
      <div className="tooltip-content">
        <ul>
          {payload
            .filter((item) => Number(item.value))
            .sort((a, b) => Number(b.value) - Number(a.value))
            .map((item) => (
              <li
                key={item.id ?? String(item.dataKey)}
                className="flex items-center justify-start pt-1"
              >
                <span
                  style={{ backgroundColor: item.stroke }}
                  className="h-5 w-5 inline-block rounded-control m-1"
                ></span>
                <span className="text-foreground">
                  {capitalize(String(item.dataKey))}: {item.value}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
